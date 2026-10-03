-- Unified staff onboarding: one reusable 8-character staff code per school.
-- Codes are valid for 28 days, can be used by many staff members, and are
-- replaced (revoked) when a new code is generated.

ALTER TABLE public.school_codes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Pending staff registrations are created only after the school staff code has
-- been validated. They are server-only and are consumed after the user confirms
-- their email. No password is stored here.
CREATE TABLE IF NOT EXISTS public.pending_staff_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);
CREATE INDEX IF NOT EXISTS pending_staff_registrations_email_idx
  ON public.pending_staff_registrations (lower(email));
GRANT ALL ON public.pending_staff_registrations TO service_role;
REVOKE ALL ON public.pending_staff_registrations FROM PUBLIC, anon, authenticated;
ALTER TABLE public.pending_staff_registrations ENABLE ROW LEVEL SECURITY;

-- Staff signups must not receive the normal default student role before their
-- email address has been confirmed. Their profile row can still be created so
-- the auth-user/profile FK relationship remains consistent. The teacher role
-- and school are assigned only by the post-confirmation server flow.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'registration_type', '') <> 'staff' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Retire the old one-time teacher / school-admin onboarding codes. Keep the
-- rows for history, but only code_type='staff' is accepted by the new flow.
UPDATE public.school_codes
SET is_revoked = true
WHERE code_type IN ('school', 'teacher')
  AND is_revoked = false;

-- Backfill one staff code for every active school that does not already have
-- one. Codes use an easy-to-type alphabet without O/0 or I/1.
DO $$
DECLARE
  s record;
  candidate text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  i integer;
BEGIN
  FOR s IN
    SELECT school.id
    FROM public.schools AS school
    WHERE school.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.school_codes c
        WHERE c.school_id = school.id
          AND c.code_type = 'staff'
          AND c.is_revoked = false
          AND c.expires_at > now()
      )
  LOOP
    LOOP
      random_bytes := gen_random_bytes(8);
      candidate := '';
      FOR i IN 0..7 LOOP
        candidate := candidate || substr(alphabet, (get_byte(random_bytes, i) % length(alphabet)) + 1, 1);
      END LOOP;
      EXIT WHEN candidate ~ '[A-Z]'
        AND candidate ~ '[0-9]'
        AND NOT EXISTS (SELECT 1 FROM public.school_codes WHERE code = candidate);
    END LOOP;

    INSERT INTO public.school_codes (
      school_id,
      code,
      code_type,
      is_used,
      is_revoked,
      expires_at
    ) VALUES (
      s.id,
      candidate,
      'staff',
      false,
      false,
      now() + interval '28 days'
    );
  END LOOP;
END;
$$;

-- Compatibility RPC for any remaining authenticated caller. Only an active,
-- unexpired reusable staff code can grant the teacher role and school.
CREATE OR REPLACE FUNCTION public.register_teacher_with_any_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_code_row public.school_codes%ROWTYPE;
  v_school public.schools%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_code_row
  FROM public.school_codes
  WHERE upper(code) = v_code
    AND code_type = 'staff'
    AND is_revoked = false
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_code');
  END IF;

  SELECT * INTO v_school
  FROM public.schools
  WHERE id = v_code_row.school_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive_school');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'teacher')
  ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';

  UPDATE public.profiles
  SET school_id = v_school.id
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'school_id', v_school.id,
    'school_name', v_school.name,
    'language', v_school.language
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_teacher_with_any_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_teacher_with_any_code(text) TO authenticated;

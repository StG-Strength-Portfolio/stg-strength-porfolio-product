-- Unified staff onboarding: one reusable 8-character staff code per school.
-- Codes are valid for 28 days, can be used by many staff members, and are
-- replaced (revoked) when a new code is generated.

ALTER TABLE public.school_codes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Retire the old one-time teacher / school-admin onboarding codes. Keep the
-- rows for history, but only code_type='staff' is accepted by the new flow.
UPDATE public.school_codes
SET is_revoked = true
WHERE code_type IN ('school', 'teacher')
  AND is_revoked = false;

-- Backfill one staff code for every active school that does not already have
-- one. gen_random_uuid() gives an unpredictable source; retry until the code
-- contains both a letter and a number and is globally unique.
DO $$
DECLARE
  s record;
  candidate text;
BEGIN
  FOR s IN
    SELECT id
    FROM public.schools
    WHERE is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.school_codes c
        WHERE c.school_id = schools.id
          AND c.code_type = 'staff'
          AND c.is_revoked = false
          AND c.expires_at > now()
      )
  LOOP
    LOOP
      candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
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

-- Replace the old teacher registration RPC with the new reusable staff-code
-- behavior. Existing frontend callers keep working during rollout, but only
-- active staff codes are accepted. The code is deliberately NOT marked used.
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

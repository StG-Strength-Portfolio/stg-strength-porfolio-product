-- Separate school-admin and teacher invitation flows.
-- New school-admin invitations use 8-character codes: six uppercase letters + two digits.

-- Legacy SCHOOL### rows and the earlier ADMIN-* draft format were predictable/obsolete
-- and are no longer valid school-admin invitations. The schools.code value may
-- remain as an internal school identifier.
UPDATE public.school_codes
SET is_revoked = true
WHERE code_type = 'school'
  AND code !~ '^[A-Z]{6}[0-9]{2}$';

CREATE OR REPLACE FUNCTION public.register_school_admin_with_code(p_code text)
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

  IF v_code !~ '^[A-Z]{6}[0-9]{2}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT * INTO v_code_row
  FROM public.school_codes
  WHERE upper(code) = v_code
    AND code_type = 'school'
    AND is_revoked = false
  FOR UPDATE;

  IF NOT FOUND OR v_code_row.is_used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT * INTO v_school
  FROM public.schools
  WHERE id = v_code_row.school_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive_school');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'school_admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'school_admin';

  UPDATE public.profiles
  SET school_id = v_school.id
  WHERE id = v_uid;

  UPDATE public.school_codes
  SET is_used = true,
      used_by_admin_id = v_uid
  WHERE id = v_code_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'school_id', v_school.id,
    'school_name', v_school.name,
    'language', v_school.language
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_school_admin_with_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_school_admin_with_code(text) TO authenticated;

-- Keep the existing function name used by the frontend, but restrict it to
-- one-time teacher invitations created by a school admin. School identifiers
-- and school-admin invitations can no longer grant the teacher role.
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
    AND code_type = 'teacher'
    AND is_revoked = false
  FOR UPDATE;

  IF NOT FOUND OR v_code_row.is_used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
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

  UPDATE public.school_codes
  SET is_used = true,
      used_by_admin_id = v_uid
  WHERE id = v_code_row.id;

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

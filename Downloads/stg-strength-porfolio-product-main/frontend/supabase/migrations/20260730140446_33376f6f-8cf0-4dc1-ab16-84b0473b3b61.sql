ALTER TABLE public.schools ALTER COLUMN language DROP NOT NULL;
ALTER TABLE public.schools ALTER COLUMN language DROP DEFAULT;

ALTER TABLE public.school_codes
  ADD COLUMN IF NOT EXISTS code_type text NOT NULL DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_revoked boolean NOT NULL DEFAULT false;

GRANT SELECT ON public.school_codes TO authenticated;
GRANT ALL ON public.school_codes TO service_role;

CREATE OR REPLACE FUNCTION public.my_school_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "School admin manages own school codes" ON public.school_codes;
CREATE POLICY "School admin manages own school codes"
  ON public.school_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin') AND school_id = public.my_school_id())
  WITH CHECK (public.has_role(auth.uid(), 'school_admin') AND school_id = public.my_school_id());

CREATE TABLE IF NOT EXISTS public.teacher_assigned_strengths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  strength_id text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.teacher_assigned_strengths TO authenticated;
GRANT ALL ON public.teacher_assigned_strengths TO service_role;

ALTER TABLE public.teacher_assigned_strengths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can assign strengths" ON public.teacher_assigned_strengths;
CREATE POLICY "Teachers can assign strengths"
  ON public.teacher_assigned_strengths FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND public.is_teacher_of(student_id));

DROP POLICY IF EXISTS "Teachers can view own assignments" ON public.teacher_assigned_strengths;
CREATE POLICY "Teachers can view own assignments"
  ON public.teacher_assigned_strengths FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own assignments" ON public.teacher_assigned_strengths;
CREATE POLICY "Teachers can delete own assignments"
  ON public.teacher_assigned_strengths FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view received strengths" ON public.teacher_assigned_strengths;
CREATE POLICY "Students can view received strengths"
  ON public.teacher_assigned_strengths FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.register_teacher_with_any_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_school public.schools%ROWTYPE;
  v_codeRow public.school_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_school FROM public.schools WHERE code = v_code AND is_active = true;

  IF NOT FOUND THEN
    SELECT * INTO v_codeRow FROM public.school_codes
      WHERE upper(code) = v_code AND is_revoked = false AND is_used = false;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
    END IF;
    SELECT * INTO v_school FROM public.schools WHERE id = v_codeRow.school_id AND is_active = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'inactive_school');
    END IF;
    UPDATE public.school_codes
      SET is_used = true, used_by_admin_id = v_uid
      WHERE id = v_codeRow.id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'teacher')
  ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';

  UPDATE public.profiles SET school_id = v_school.id WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'school_id', v_school.id, 'school_name', v_school.name);
END;
$$;
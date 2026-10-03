-- Service-description compliance: teachers and school admins may delete a
-- student's individual response, but may not edit it. The audit trail records
-- who deleted which response and when; deleted answer text is not retained.

BEGIN;

CREATE TABLE IF NOT EXISTS public.response_deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  deleted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  deleted_by_role text NOT NULL CHECK (deleted_by_role IN ('teacher', 'school_admin')),
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS response_deletion_audit_student_idx
  ON public.response_deletion_audit (student_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS response_deletion_audit_actor_idx
  ON public.response_deletion_audit (deleted_by, deleted_at DESC);

GRANT ALL ON public.response_deletion_audit TO service_role;
ALTER TABLE public.response_deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.delete_student_response(
  p_student_id uuid,
  p_field_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_actor_school uuid;
  v_student_school uuid;
  v_response_id uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_student_id IS NULL OR nullif(trim(p_field_key), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid response';
  END IF;

  SELECT ur.role::text, p.school_id
  INTO v_role, v_actor_school
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.user_id = v_actor;

  IF v_role = 'teacher' THEN
    IF NOT public.is_teacher_of(p_student_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  ELSIF v_role = 'school_admin' THEN
    SELECT public.user_school_id(p_student_id) INTO v_student_school;
    IF v_actor_school IS NULL OR v_student_school IS NULL OR v_actor_school <> v_student_school THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT r.id INTO v_response_id
  FROM public.responses r
  WHERE r.user_id = p_student_id
    AND r.field_key = p_field_key
  LIMIT 1;

  IF v_response_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  INSERT INTO public.response_deletion_audit (
    response_id, student_id, field_key, deleted_by, deleted_by_role
  ) VALUES (
    v_response_id, p_student_id, p_field_key, v_actor, v_role
  );

  DELETE FROM public.responses
  WHERE id = v_response_id
    AND user_id = p_student_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_student_response(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_student_response(uuid, text) TO authenticated;

COMMIT;

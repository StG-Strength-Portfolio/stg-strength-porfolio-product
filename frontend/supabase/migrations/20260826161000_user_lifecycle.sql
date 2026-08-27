-- Service-description compliance: school-admin user deactivation, 90-day trash,
-- restore, and safeguards around teacher-owned classes and the final admin.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.school_admin_manage_user(
  p_user_id uuid,
  p_action text,
  p_replacement_teacher_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_school uuid;
  v_target_school uuid;
  v_target_role text;
  v_admin_count integer;
  v_owned_count integer;
  v_replacement_school uuid;
  v_replacement_role text;
  v_action text := lower(trim(p_action));
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT p.school_id INTO v_actor_school
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_actor AND ur.role = 'school_admin';
  IF v_actor_school IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT p.school_id, ur.role::text
  INTO v_target_school, v_target_role
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_user_id;

  IF v_target_school IS NULL OR v_target_school <> v_actor_school THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_action NOT IN ('deactivate', 'reactivate', 'delete', 'restore', 'demote_to_teacher') THEN
    RAISE EXCEPTION 'Unsupported action';
  END IF;

  IF v_target_role = 'school_admin' AND v_action IN ('deactivate', 'delete', 'demote_to_teacher') THEN
    SELECT count(*) INTO v_admin_count
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'school_admin'
      AND p.school_id = v_actor_school
      AND p.deleted_at IS NULL
      AND p.deactivated_at IS NULL;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'At least one active school admin must remain';
    END IF;
  END IF;

  IF v_target_role = 'teacher' AND v_action IN ('deactivate', 'delete') THEN
    SELECT count(*) INTO v_owned_count
    FROM public.classes c
    WHERE c.teacher_id = p_user_id
      AND COALESCE(c.is_deleted, false) = false;

    IF v_owned_count > 0 THEN
      IF p_replacement_teacher_id IS NULL THEN
        RAISE EXCEPTION 'Replacement teacher is required';
      END IF;
      SELECT p.school_id, ur.role::text
      INTO v_replacement_school, v_replacement_role
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = p_replacement_teacher_id;
      IF v_replacement_role <> 'teacher' OR v_replacement_school <> v_actor_school THEN
        RAISE EXCEPTION 'Replacement must be an active teacher in the same school';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_replacement_teacher_id
          AND (p.deleted_at IS NOT NULL OR p.deactivated_at IS NOT NULL)
      ) THEN
        RAISE EXCEPTION 'Replacement teacher is inactive';
      END IF;

      UPDATE public.classes
      SET teacher_id = p_replacement_teacher_id
      WHERE teacher_id = p_user_id
        AND COALESCE(is_deleted, false) = false;
    END IF;
  END IF;

  IF v_action = 'deactivate' THEN
    UPDATE public.profiles
    SET deactivated_at = now(), deactivated_by = v_actor, locked = true
    WHERE id = p_user_id AND deleted_at IS NULL;
  ELSIF v_action = 'reactivate' THEN
    UPDATE public.profiles
    SET deactivated_at = NULL, deactivated_by = NULL, locked = false
    WHERE id = p_user_id AND deleted_at IS NULL;
  ELSIF v_action = 'delete' THEN
    UPDATE public.profiles
    SET deleted_at = now(), deleted_by = v_actor, deactivated_at = now(), deactivated_by = v_actor, locked = true
    WHERE id = p_user_id AND deleted_at IS NULL;
  ELSIF v_action = 'restore' THEN
    UPDATE public.profiles
    SET deleted_at = NULL, deleted_by = NULL, deactivated_at = NULL, deactivated_by = NULL, locked = false
    WHERE id = p_user_id
      AND deleted_at IS NOT NULL
      AND deleted_at >= now() - INTERVAL '90 days';
  ELSIF v_action = 'demote_to_teacher' THEN
    UPDATE public.user_roles SET role = 'teacher' WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', v_action);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.school_admin_manage_user(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_admin_manage_user(uuid, text, uuid) TO authenticated;

COMMIT;

-- Service-description compliance: owner teachers and school admins can place
-- classes in the 90-day trash and restore them while keeping class data intact.

BEGIN;

CREATE OR REPLACE FUNCTION public.manage_class_lifecycle(
  p_class_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_action text := lower(trim(p_action));
  v_actor_role text;
  v_actor_school uuid;
  v_owner_id uuid;
  v_class_school uuid;
  v_deleted_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_action NOT IN ('delete', 'restore') THEN RAISE EXCEPTION 'Unsupported action'; END IF;

  SELECT ur.role::text, p.school_id
  INTO v_actor_role, v_actor_school
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.user_id = v_actor;

  SELECT c.teacher_id, owner_profile.school_id, c.deleted_at
  INTO v_owner_id, v_class_school, v_deleted_at
  FROM public.classes c
  JOIN public.profiles owner_profile ON owner_profile.id = c.teacher_id
  WHERE c.id = p_class_id;

  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Class not found'; END IF;

  IF v_actor_role = 'teacher' THEN
    IF v_owner_id <> v_actor THEN RAISE EXCEPTION 'Only the class owner can manage class deletion'; END IF;
  ELSIF v_actor_role = 'school_admin' THEN
    IF v_actor_school IS NULL OR v_class_school IS NULL OR v_actor_school <> v_class_school THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_action = 'delete' THEN
    UPDATE public.classes
    SET is_deleted = true,
        deleted_at = COALESCE(deleted_at, now()),
        deleted_by = v_actor
    WHERE id = p_class_id
      AND COALESCE(is_deleted, false) = false;
  ELSE
    IF v_deleted_at IS NULL OR v_deleted_at < now() - INTERVAL '90 days' THEN
      RAISE EXCEPTION 'Class restore period has expired';
    END IF;

    UPDATE public.classes
    SET is_deleted = false,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = p_class_id
      AND COALESCE(is_deleted, false) = true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', v_action, 'class_id', p_class_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.manage_class_lifecycle(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_class_lifecycle(uuid, text) TO authenticated;

COMMIT;

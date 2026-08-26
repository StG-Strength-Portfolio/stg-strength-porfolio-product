-- Service-description compliance: one class per student, controlled same-school
-- moves, and a 90-day restore period for normal class deletion.

BEGIN;

-- Legacy duplicates are reduced deterministically to one membership: prefer an
-- active class, then the most recently joined class.
WITH ranked_memberships AS (
  SELECT
    cm.ctid,
    row_number() OVER (
      PARTITION BY cm.student_id
      ORDER BY
        CASE WHEN COALESCE(c.is_deleted, false) = false THEN 0 ELSE 1 END,
        cm.joined_at DESC,
        cm.class_id
    ) AS rn
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
)
DELETE FROM public.class_members cm
USING ranked_memberships ranked
WHERE cm.ctid = ranked.ctid
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS class_members_one_class_per_student_uidx
  ON public.class_members (student_id);

CREATE OR REPLACE FUNCTION public.join_class(p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_class public.classes%ROWTYPE;
  v_existing public.classes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_class
  FROM public.classes
  WHERE join_code = upper(trim(p_join_code))
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT c.* INTO v_existing
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = v_uid
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.id = v_class.id THEN
      RETURN jsonb_build_object(
        'ok', true,
        'already_member', true,
        'class_id', v_class.id,
        'class_name', v_class.name,
        'language', v_class.language
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_in_class',
      'current_class_id', v_existing.id,
      'current_class_name', v_existing.name,
      'current_class_deleted', COALESCE(v_existing.is_deleted, false)
    );
  END IF;

  INSERT INTO public.class_members (class_id, student_id)
  VALUES (v_class.id, v_uid);

  UPDATE public.profiles
  SET language = v_class.language
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'language', v_class.language
  );
END;
$$;

CREATE TABLE IF NOT EXISTS public.student_class_move_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  to_class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  moved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  moved_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.student_class_move_audit TO service_role;
ALTER TABLE public.student_class_move_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.move_student_to_class(
  p_student_id uuid,
  p_target_class_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_actor_school uuid;
  v_target_school uuid;
  v_current_class_id uuid;
  v_current_school uuid;
  v_target_language text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT ur.role::text, p.school_id
  INTO v_actor_role, v_actor_school
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.user_id = v_actor;

  SELECT owner_profile.school_id, c.language
  INTO v_target_school, v_target_language
  FROM public.classes c
  JOIN public.profiles owner_profile ON owner_profile.id = c.teacher_id
  WHERE c.id = p_target_class_id
    AND COALESCE(c.is_deleted, false) = false;

  IF v_target_school IS NULL THEN RAISE EXCEPTION 'Target class not found'; END IF;

  SELECT cm.class_id, owner_profile.school_id
  INTO v_current_class_id, v_current_school
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  JOIN public.profiles owner_profile ON owner_profile.id = c.teacher_id
  WHERE cm.student_id = p_student_id
  LIMIT 1;

  IF v_current_class_id IS NULL THEN RAISE EXCEPTION 'Student is not assigned to a class'; END IF;
  IF v_current_class_id = p_target_class_id THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;
  IF v_current_school IS NULL OR v_current_school <> v_target_school THEN
    RAISE EXCEPTION 'Classes must belong to the same school';
  END IF;

  IF v_actor_role = 'school_admin' THEN
    IF v_actor_school IS NULL OR v_actor_school <> v_target_school THEN RAISE EXCEPTION 'Forbidden'; END IF;
  ELSIF v_actor_role = 'teacher' THEN
    IF NOT public.is_class_teacher(v_current_class_id, v_actor)
       OR NOT public.is_class_teacher(p_target_class_id, v_actor) THEN
      RAISE EXCEPTION 'Teacher must teach both classes';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.class_members
  WHERE student_id = p_student_id;

  INSERT INTO public.class_members (class_id, student_id)
  VALUES (p_target_class_id, p_student_id);

  UPDATE public.profiles
  SET language = v_target_language
  WHERE id = p_student_id;

  INSERT INTO public.student_class_move_audit (
    student_id, from_class_id, to_class_id, moved_by
  ) VALUES (
    p_student_id, v_current_class_id, p_target_class_id, v_actor
  );

  RETURN jsonb_build_object('ok', true, 'class_id', p_target_class_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.move_student_to_class(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_student_to_class(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_classes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.classes
  WHERE is_deleted = true
    AND deleted_at IS NOT NULL
    AND school_deleted_at IS NULL
    AND deleted_at < now() - INTERVAL '90 days';
$$;

COMMIT;

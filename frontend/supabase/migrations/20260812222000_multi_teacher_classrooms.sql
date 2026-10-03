-- Multi-teacher classrooms for the deployed top-level frontend.
-- Keep classes.teacher_id as the authoritative classroom owner for backwards
-- compatibility. Co-teachers live in class_teachers.

CREATE TABLE IF NOT EXISTS public.class_teachers (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'co_teacher' CHECK (role IN ('owner', 'co_teacher')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS class_teachers_teacher_idx
  ON public.class_teachers (teacher_id);

GRANT SELECT ON public.class_teachers TO authenticated;
GRANT ALL ON public.class_teachers TO service_role;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- Backfill current classroom owners.
INSERT INTO public.class_teachers (class_id, teacher_id, role)
SELECT id, teacher_id, 'owner'
FROM public.classes
ON CONFLICT (class_id, teacher_id)
DO UPDATE SET role = 'owner';

CREATE OR REPLACE FUNCTION public.is_class_teacher(
  _class_id uuid,
  _teacher_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_teachers ct
    WHERE ct.class_id = _class_id
      AND ct.teacher_id = _teacher_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_owner(
  _class_id uuid,
  _teacher_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = _class_id
      AND c.teacher_id = _teacher_id
  );
$$;

-- Existing student-profile/response RLS calls is_teacher_of(). Extending this
-- helper makes those policies work for co-teachers without duplicating policy
-- logic across every student table.
CREATE OR REPLACE FUNCTION public.is_teacher_of(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.class_teachers ct ON ct.class_id = cm.class_id
    WHERE cm.student_id = _student_id
      AND ct.teacher_id = auth.uid()
  );
$$;

-- Keep owner policies intact and add only the permissions co-teachers need.
DROP POLICY IF EXISTS "co-teachers read assigned classes" ON public.classes;
CREATE POLICY "co-teachers read assigned classes"
  ON public.classes FOR SELECT TO authenticated
  USING (public.is_class_teacher(id, auth.uid()));

DROP POLICY IF EXISTS "co-teachers read class members" ON public.class_members;
CREATE POLICY "co-teachers read class members"
  ON public.class_members FOR SELECT TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "co-teachers remove class members" ON public.class_members;
CREATE POLICY "co-teachers remove class members"
  ON public.class_members FOR DELETE TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));

-- Teachers may see assignments for classrooms they teach. School admins may
-- inspect assignments in their own school. All mutations go through RPCs below.
DROP POLICY IF EXISTS "teachers read class teacher assignments" ON public.class_teachers;
CREATE POLICY "teachers read class teacher assignments"
  ON public.class_teachers FOR SELECT TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "school admins read class teacher assignments" ON public.class_teachers;
CREATE POLICY "school admins read class teacher assignments"
  ON public.class_teachers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles me
      JOIN public.user_roles ur ON ur.user_id = me.id
      JOIN public.classes c ON c.id = class_teachers.class_id
      JOIN public.profiles owner_profile ON owner_profile.id = c.teacher_id
      WHERE me.id = auth.uid()
        AND ur.role = 'school_admin'
        AND me.school_id IS NOT NULL
        AND owner_profile.school_id = me.school_id
    )
  );

-- New classrooms automatically receive their owner assignment.
CREATE OR REPLACE FUNCTION public.sync_class_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.class_teachers (class_id, teacher_id, role)
  VALUES (NEW.id, NEW.teacher_id, 'owner')
  ON CONFLICT (class_id, teacher_id)
  DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classes_sync_owner_membership ON public.classes;
CREATE TRIGGER classes_sync_owner_membership
AFTER INSERT OR UPDATE OF teacher_id ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.sync_class_owner_membership();

-- Owner-only mutation helpers. Same-school validation is enforced here, not
-- merely in the dropdown, so a modified browser request cannot add outsiders.
CREATE OR REPLACE FUNCTION public.add_class_teacher(
  p_class_id uuid,
  p_teacher_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_owner_school uuid;
  v_target_school uuid;
  v_target_role text;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_class_owner(p_class_id, v_owner) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT p.school_id INTO v_owner_school
  FROM public.profiles p
  WHERE p.id = v_owner;

  SELECT p.school_id, ur.role::text INTO v_target_school, v_target_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_teacher_id;

  IF v_target_role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'Target is not a teacher';
  END IF;
  IF v_owner_school IS NULL OR v_target_school IS NULL OR v_owner_school <> v_target_school THEN
    RAISE EXCEPTION 'Teacher must belong to the same school';
  END IF;
  IF p_teacher_id = v_owner THEN
    RETURN jsonb_build_object('ok', true, 'already_owner', true);
  END IF;

  INSERT INTO public.class_teachers (class_id, teacher_id, role)
  VALUES (p_class_id, p_teacher_id, 'co_teacher')
  ON CONFLICT (class_id, teacher_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_class_teacher(
  p_class_id uuid,
  p_teacher_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_class_owner(p_class_id, v_owner) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_teacher_id = v_owner THEN RAISE EXCEPTION 'Owner cannot be removed'; END IF;

  DELETE FROM public.class_teachers
  WHERE class_id = p_class_id
    AND teacher_id = p_teacher_id
    AND role = 'co_teacher';

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_class_ownership(
  p_class_id uuid,
  p_new_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner uuid := auth.uid();
  v_old_school uuid;
  v_new_school uuid;
  v_new_role text;
BEGIN
  IF v_old_owner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_class_owner(p_class_id, v_old_owner) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_new_owner_id = v_old_owner THEN RETURN jsonb_build_object('ok', true); END IF;

  SELECT p.school_id INTO v_old_school
  FROM public.profiles p WHERE p.id = v_old_owner;

  SELECT p.school_id, ur.role::text INTO v_new_school, v_new_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_new_owner_id;

  IF v_new_role IS DISTINCT FROM 'teacher' THEN RAISE EXCEPTION 'Target is not a teacher'; END IF;
  IF v_old_school IS NULL OR v_new_school IS NULL OR v_old_school <> v_new_school THEN
    RAISE EXCEPTION 'Teacher must belong to the same school';
  END IF;

  INSERT INTO public.class_teachers (class_id, teacher_id, role)
  VALUES (p_class_id, p_new_owner_id, 'co_teacher')
  ON CONFLICT (class_id, teacher_id) DO NOTHING;

  UPDATE public.class_teachers
  SET role = 'co_teacher'
  WHERE class_id = p_class_id AND teacher_id = v_old_owner;

  UPDATE public.classes
  SET teacher_id = p_new_owner_id
  WHERE id = p_class_id;

  UPDATE public.class_teachers
  SET role = 'owner'
  WHERE class_id = p_class_id AND teacher_id = p_new_owner_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_class_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_class_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_class_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_class_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_class_ownership(uuid, uuid) TO authenticated;

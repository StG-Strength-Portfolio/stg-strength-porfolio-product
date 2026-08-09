
-- Helper functions to break RLS recursion between classes <-> class_members
CREATE OR REPLACE FUNCTION public.is_class_teacher(_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members WHERE class_id = _class_id AND student_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_class_teacher(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_class_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid) TO authenticated;

-- Rewrite classes SELECT policy to use helper (no direct reference to class_members)
DROP POLICY IF EXISTS "student reads enrolled classes" ON public.classes;
CREATE POLICY "student reads enrolled classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (public.is_class_member(id));

-- Rewrite class_members teacher policies to use helper (no direct reference to classes)
DROP POLICY IF EXISTS "teacher sees own class members" ON public.class_members;
CREATE POLICY "teacher sees own class members"
  ON public.class_members FOR SELECT
  TO authenticated
  USING (public.is_class_teacher(class_id));

DROP POLICY IF EXISTS "teacher removes own class members" ON public.class_members;
CREATE POLICY "teacher removes own class members"
  ON public.class_members FOR DELETE
  TO authenticated
  USING (public.is_class_teacher(class_id));

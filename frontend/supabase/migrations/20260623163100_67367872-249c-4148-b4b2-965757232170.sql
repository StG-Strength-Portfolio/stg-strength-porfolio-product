
-- 1. Fix touch_updated_at: set search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 2. Lock down EXECUTE on SECURITY DEFINER functions: revoke from PUBLIC, grant only where intended
REVOKE EXECUTE ON FUNCTION public.claim_teacher_role(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_teacher_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_class(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_share_link_info(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_external_response(text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_teacher_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
-- share-link flows are intentionally callable by external (anon) users via a token
GRANT EXECUTE ON FUNCTION public.get_share_link_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_external_response(text, jsonb) TO anon, authenticated;

-- 3. class_members: allow students to insert themselves (and only themselves)
CREATE POLICY "student joins as self" ON public.class_members
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Also let students leave their own membership
CREATE POLICY "student leaves own membership" ON public.class_members
  FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- 4. classes: students can read classes they're enrolled in
CREATE POLICY "student reads enrolled classes" ON public.classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = classes.id AND cm.student_id = auth.uid()
    )
  );

-- 5. external_responses: explicit write protection
-- Direct writes from clients are not allowed; submit_external_response (SECURITY DEFINER) handles inserts.
REVOKE INSERT, UPDATE, DELETE ON public.external_responses FROM anon, authenticated;

CREATE POLICY "no direct insert on external_responses" ON public.external_responses
  FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "no direct update on external_responses" ON public.external_responses
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "no direct delete on external_responses" ON public.external_responses
  FOR DELETE TO authenticated
  USING (false);

-- 6. user_roles: prevent privilege escalation. No write policies + revoke table-level write grants.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE POLICY "no direct insert on user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "no direct update on user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "no direct delete on user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (false);

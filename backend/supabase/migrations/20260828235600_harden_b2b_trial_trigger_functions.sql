-- Keep backend migration tree aligned with frontend/supabase.
-- Prevent direct RPC execution of trigger-only SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.enforce_trial_class_authorization() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_free_trial_student() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_free_trial_teacher_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_free_trial_staff_member() FROM PUBLIC, anon, authenticated;

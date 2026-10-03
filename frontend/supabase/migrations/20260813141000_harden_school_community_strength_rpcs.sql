-- Harden only RPCs touched by the school-community strengths rollout.
-- generate_sprint_code must remain callable by authenticated users until the
-- backward-compatible rollout is merged because the currently deployed
-- teacher Sprint still calls it directly.

REVOKE EXECUTE ON FUNCTION public.get_my_received_strengths() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_received_strengths() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_sprint_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_sprint_code() TO authenticated;

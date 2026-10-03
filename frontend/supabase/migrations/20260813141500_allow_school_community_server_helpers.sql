-- The server-side recipient resolver uses these two helpers through the
-- service-role client. Keep them unavailable to anon while allowing the
-- trusted backend to resolve roles and school membership.

GRANT EXECUTE ON FUNCTION public.sprint_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_school_id(uuid) TO service_role;

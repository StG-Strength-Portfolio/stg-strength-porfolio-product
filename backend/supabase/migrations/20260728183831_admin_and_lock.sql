-- Admin role + account locking
-- Design notes:
--  * "admins" is a presence table (row = is admin), same safe pattern as
--    user_roles: only service_role may write to it, so admin status can
--    NEVER be self-granted through the normal client (no public "admin
--    code" like the teacher flow — must be granted manually via SQL by
--    the project owner).
--  * profiles.locked is the flag used to decide access + is shown in the
--    admin dashboard. A trigger blocks any client (authenticated/anon)
--    from changing it directly — only service_role (our server-side
--    admin actions) may flip it, alongside a real Supabase Auth ban that
--    actually blocks the user from ever logging in again.

CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users check own admin status" ON public.admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.admins FROM anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_profile_lock_tampering()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.locked IS DISTINCT FROM OLD.locked AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to change locked status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_lock_tampering ON public.profiles;
CREATE TRIGGER trg_prevent_profile_lock_tampering
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_lock_tampering();
-- ============================================================
-- Vahvuusseikkailu — CONSOLIDATED CURRENT SCHEMA
-- Auto-built from supabase/migrations/ in chronological order.
-- Run this ONCE in a fresh Supabase project (SQL Editor -> New query -> paste -> Run).
-- This is the up-to-date schema (includes the per-class language feature).
-- ============================================================


-- ------------------------------------------------------------
-- from migration: 20260622182311_d8525fd9-297d-4f90-b950-a890df4c3119.sql
-- ------------------------------------------------------------

-- ============================================================
-- Vahvuusseikkailu — initial schema
-- Privacy invariant (locked in RLS):
--   * Students can SELECT/INSERT/UPDATE only their OWN rows in
--     profiles, responses, class_members, share_links,
--     external_responses.
--   * Students CANNOT see other students' profiles, responses,
--     names, class rosters, progress, or any peer data.
--   * Teachers have READ-ONLY access to profiles + responses of
--     students who are members of classes they own (via
--     is_teacher_of()). Teachers never write student rows.
--   * Anonymous (logged-out) users have NO direct table access.
--     The only anon write path is submit_external_response(),
--     which validates a one-time share token.
-- ============================================================

-- ---------- enums ----------
CREATE TYPE public.app_role AS ENUM ('student', 'teacher');

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  current_screen integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- user_roles (role kept separate from profiles) ----------
CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- has_role helper (security definer, avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ---------- classes ----------
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher manages own classes" ON public.classes
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

-- ---------- class_members ----------
CREATE TABLE public.class_members (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);
GRANT SELECT, INSERT, DELETE ON public.class_members TO authenticated;
GRANT ALL ON public.class_members TO service_role;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Student: only sees own membership row (never the roster of peers)
CREATE POLICY "student sees own membership" ON public.class_members
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- Teacher: sees members of own classes
CREATE POLICY "teacher sees own class members" ON public.class_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

-- Teacher: can remove a student from own class
CREATE POLICY "teacher removes own class members" ON public.class_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

-- is_teacher_of: caller (a teacher) owns a class containing this student
CREATE OR REPLACE FUNCTION public.is_teacher_of(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = _student_id
      AND c.teacher_id = auth.uid()
  );
$$;

-- profiles RLS (now that helpers exist)
CREATE POLICY "student sees own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "teacher reads student profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_teacher_of(id));

CREATE POLICY "student inserts own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "student updates own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------- responses (every worksheet field) ----------
CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, field_key)
);
CREATE INDEX responses_user_idx ON public.responses(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student manages own responses" ON public.responses
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Teachers: READ ONLY on student responses they own (no INSERT/UPDATE/DELETE)
CREATE POLICY "teacher reads student responses" ON public.responses
  FOR SELECT TO authenticated USING (public.is_teacher_of(user_id));

-- ---------- share_links ----------
CREATE TABLE public.share_links (
  token text PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used boolean NOT NULL DEFAULT false
);
CREATE INDEX share_links_student_idx ON public.share_links(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student manages own share links" ON public.share_links
  FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- ---------- external_responses ----------
CREATE TABLE public.external_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL REFERENCES public.share_links(token) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX external_responses_student_idx ON public.external_responses(student_id);
GRANT SELECT ON public.external_responses TO authenticated;
GRANT ALL ON public.external_responses TO service_role;
ALTER TABLE public.external_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student reads own external responses" ON public.external_responses
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "teacher reads student external responses" ON public.external_responses
  FOR SELECT TO authenticated USING (public.is_teacher_of(student_id));

-- ---------- RPCs ----------

-- claim_teacher_role: grant caller the teacher role if code matches
-- Default teacher code: OPETTAJA-2026 — change here to rotate.
CREATE OR REPLACE FUNCTION public.claim_teacher_role(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_expected text := 'OPETTAJA-2026';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_code IS NULL OR p_code <> v_expected THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'teacher')
  ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_teacher_role(text) TO authenticated;

-- join_class: add caller to class matching the join code
CREATE OR REPLACE FUNCTION public.join_class(p_join_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_class public.classes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_class FROM public.classes WHERE join_code = upper(trim(p_join_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  INSERT INTO public.class_members (class_id, student_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'class_id', v_class.id, 'class_name', v_class.name);
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;

-- submit_external_response: anon writes via valid share token (one-time)
CREATE OR REPLACE FUNCTION public.submit_external_response(p_token text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link public.share_links%ROWTYPE;
  v_key text;
  v_val jsonb;
BEGIN
  SELECT * INTO v_link FROM public.share_links WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_link.used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;
  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_payload) LOOP
    INSERT INTO public.external_responses (token, student_id, field_key, value)
    VALUES (
      p_token,
      v_link.student_id,
      v_key,
      CASE WHEN jsonb_typeof(v_val) = 'string' THEN v_val #>> '{}' ELSE v_val::text END
    );
  END LOOP;

  UPDATE public.share_links SET used = true WHERE token = p_token;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_external_response(text, jsonb) TO anon, authenticated;

-- get_share_link_info: anon can fetch target + student display name for a token
CREATE OR REPLACE FUNCTION public.get_share_link_info(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link public.share_links%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_link FROM public.share_links WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_link.used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;
  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE id = v_link.student_id;
  RETURN jsonb_build_object('ok', true, 'target', v_link.target, 'student_name', v_name);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_share_link_info(text) TO anon, authenticated;

-- ---------- handle_new_user trigger ----------
-- On signup: create profile row + default 'student' role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- updated_at trigger for profiles ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER responses_touch_updated_at
  BEFORE UPDATE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ------------------------------------------------------------
-- from migration: 20260623163100_67367872-249c-4148-b4b2-965757232170.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- from migration: 20260626080608_52bd47d1-76e4-4fb1-825f-042505e1129d.sql
-- ------------------------------------------------------------

-- Restore Data API grants stripped by earlier hardening migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_members TO authenticated;
GRANT ALL ON public.class_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;

GRANT ALL ON public.external_responses TO service_role;


-- ------------------------------------------------------------
-- from migration: 20260626081704_2b3bf3dc-a2ce-42f8-9492-991db08fce5f.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- from migration: 20260723231624_2318c5e2-fb93-433d-a0f1-349464f874ae.sql
-- ------------------------------------------------------------
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_language_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_language_check CHECK (language IN ('en','fi','sv'));

CREATE OR REPLACE FUNCTION public.join_class(p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_class public.classes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_class FROM public.classes WHERE join_code = upper(trim(p_join_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  INSERT INTO public.class_members (class_id, student_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'class_id', v_class.id, 'class_name', v_class.name, 'language', v_class.language);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_class_language()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.language
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_class_language() TO authenticated;

-- ------------------------------------------------------------
-- from migration: 20260727092352_50a8dc6a-9b75-49a1-b903-20378e90c1c9.sql
-- ------------------------------------------------------------
ALTER TABLE public.classes ALTER COLUMN language SET DEFAULT 'fi';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_language_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_language_check CHECK (language IN ('fi','sv','en'));
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fi';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_language_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_language_check CHECK (language IN ('fi','sv','en'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.join_class(p_join_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_class public.classes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_class FROM public.classes WHERE join_code = upper(trim(p_join_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  INSERT INTO public.class_members (class_id, student_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET language = v_class.language WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'class_id', v_class.id, 'class_name', v_class.name, 'language', v_class.language);
END;
$function$;

-- ------------------------------------------------------------
-- from migration: 20260727092527_9e127b60-d3fd-4b61-b0b0-1b8ca19db804.sql
-- ------------------------------------------------------------
DELETE FROM public.class_members WHERE class_id IN (SELECT id FROM public.classes WHERE join_code IN ('ZZ-SV-01','ZZ-FI-01','ZZ-EN-01'));
DELETE FROM public.classes WHERE join_code IN ('ZZ-SV-01','ZZ-FI-01','ZZ-EN-01');
UPDATE public.profiles p SET language = COALESCE((
  SELECT c.language FROM public.class_members cm JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = p.id ORDER BY cm.joined_at DESC LIMIT 1
), 'fi');

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
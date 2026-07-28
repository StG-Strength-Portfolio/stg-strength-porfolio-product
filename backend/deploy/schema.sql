-- ⚠️  OUTDATED — do NOT use for a fresh install.
-- This file predates the per-class language feature and is missing
-- get_my_class_language / is_class_member / is_class_teacher.
-- 👉 Use deploy/schema-current.sql instead (built from the latest migrations).

-- ============================================================
-- Vahvuusseikkailu — Full database schema (squashed)
-- Run this ONCE against a fresh Supabase project (SQL Editor)
-- or a self-hosted Postgres with the Supabase `auth` schema in place.
--
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

-- ---------- user_roles ----------
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

CREATE POLICY "student sees own membership" ON public.class_members
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "teacher sees own class members" ON public.class_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

CREATE POLICY "teacher removes own class members" ON public.class_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

CREATE POLICY "student joins as self" ON public.class_members
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student leaves own membership" ON public.class_members
  FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- is_teacher_of helper
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

-- profiles RLS
CREATE POLICY "student sees own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "teacher reads student profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_teacher_of(id));

CREATE POLICY "student inserts own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "student updates own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- classes: students read enrolled classes
CREATE POLICY "student reads enrolled classes" ON public.classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = classes.id AND cm.student_id = auth.uid()
    )
  );

-- ---------- responses ----------
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

-- Direct writes from clients are forbidden; submit_external_response handles inserts
CREATE POLICY "no direct insert on external_responses" ON public.external_responses
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no direct update on external_responses" ON public.external_responses
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no direct delete on external_responses" ON public.external_responses
  FOR DELETE TO authenticated USING (false);

-- ---------- user_roles write protection ----------
CREATE POLICY "no direct insert on user_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no direct update on user_roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no direct delete on user_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (false);

-- ============================================================
-- RPCs
-- ============================================================

-- claim_teacher_role: grants caller the teacher role if code matches.
-- ROTATE BY EDITING v_expected BELOW.
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

-- ---------- SECURITY DEFINER function grants ----------
REVOKE EXECUTE ON FUNCTION public.claim_teacher_role(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_teacher_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_class(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_share_link_info(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_external_response(text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_teacher_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_share_link_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_external_response(text, jsonb) TO anon, authenticated;

-- ============================================================
-- Triggers
-- ============================================================

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
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER responses_touch_updated_at
  BEFORE UPDATE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- Realtime (Supabase only — safe to skip on plain Postgres)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.responses';
  END IF;
END$$;

-- ============================================================
-- Post-install:
--   To promote your first teacher account, sign up via the app,
--   then in the SQL Editor run:
--     UPDATE public.user_roles SET role = 'teacher'
--       WHERE user_id = '<that-user-uuid>';
--   Or use the in-app code OPETTAJA-2026 at /auth/opettaja.
-- ============================================================

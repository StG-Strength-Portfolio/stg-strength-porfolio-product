-- Keep backend migration tree aligned with frontend/supabase.

CREATE TABLE IF NOT EXISTS public.free_trial_students (
  trial_id uuid NOT NULL REFERENCES public.free_trial_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trial_id, user_id, class_id)
);
CREATE INDEX IF NOT EXISTS free_trial_students_user_idx ON public.free_trial_students (user_id);
ALTER TABLE public.free_trial_students ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.free_trial_students TO service_role;
REVOKE ALL ON public.free_trial_students FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_trial_class_authorization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trial public.free_trial_workspaces%ROWTYPE;
BEGIN
  SELECT t.* INTO v_trial FROM public.profiles p JOIN public.free_trial_workspaces t ON t.school_id = p.school_id WHERE p.id = NEW.teacher_id LIMIT 1;
  IF FOUND THEN
    IF v_trial.status <> 'active' OR v_trial.trial_ends_at <= now() THEN RAISE EXCEPTION 'free_trial_expired'; END IF;
    IF v_trial.authorization_confirmed_at IS NULL THEN RAISE EXCEPTION 'free_trial_school_authorization_required'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_trial_class_authorization ON public.classes;
CREATE TRIGGER trg_enforce_trial_class_authorization BEFORE INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION public.enforce_trial_class_authorization();

CREATE OR REPLACE FUNCTION public.track_free_trial_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trial_id uuid;
BEGIN
  SELECT t.id INTO v_trial_id FROM public.classes c JOIN public.profiles p ON p.id = c.teacher_id JOIN public.free_trial_workspaces t ON t.school_id = p.school_id WHERE c.id = NEW.class_id LIMIT 1;
  IF v_trial_id IS NOT NULL THEN
    INSERT INTO public.free_trial_students (trial_id, user_id, class_id) VALUES (v_trial_id, NEW.student_id, NEW.class_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.free_trial_events (trial_id, user_id, event_name, event_properties) VALUES (v_trial_id, NEW.student_id, 'student_joined', jsonb_build_object('class_id', NEW.class_id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_track_free_trial_student ON public.class_members;
CREATE TRIGGER trg_track_free_trial_student AFTER INSERT ON public.class_members FOR EACH ROW EXECUTE FUNCTION public.track_free_trial_student();

CREATE OR REPLACE FUNCTION public.enforce_free_trial_teacher_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school_id uuid; v_trial public.free_trial_workspaces%ROWTYPE; v_teacher_count integer;
BEGIN
  IF NEW.role::text <> 'teacher' THEN RETURN NEW; END IF;
  SELECT school_id INTO v_school_id FROM public.profiles WHERE id = NEW.user_id;
  IF v_school_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_trial FROM public.free_trial_workspaces WHERE school_id = v_school_id LIMIT 1;
  IF NOT FOUND OR v_trial.creator_user_id = NEW.user_id THEN RETURN NEW; END IF;
  IF v_trial.creator_role = 'school_admin' THEN
    SELECT count(*) INTO v_teacher_count FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE p.school_id = v_school_id AND ur.role::text = 'teacher' AND ur.user_id <> NEW.user_id;
    IF v_teacher_count >= 5 THEN RAISE EXCEPTION 'free_trial_teacher_invite_limit_reached'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_free_trial_teacher_limit ON public.user_roles;
CREATE TRIGGER trg_enforce_free_trial_teacher_limit BEFORE INSERT OR UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enforce_free_trial_teacher_limit();

CREATE OR REPLACE FUNCTION public.track_free_trial_staff_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school_id uuid; v_trial_id uuid;
BEGIN
  IF NEW.role::text NOT IN ('teacher', 'school_admin') THEN RETURN NEW; END IF;
  SELECT school_id INTO v_school_id FROM public.profiles WHERE id = NEW.user_id;
  IF v_school_id IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_trial_id FROM public.free_trial_workspaces WHERE school_id = v_school_id LIMIT 1;
  IF v_trial_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.free_trial_members (trial_id, user_id, role, membership_kind) VALUES (v_trial_id, NEW.user_id, NEW.role::text, 'school_admin_invite') ON CONFLICT (trial_id, user_id) DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.free_trial_members WHERE trial_id = v_trial_id AND user_id = NEW.user_id AND membership_kind = 'school_admin_invite') THEN
    INSERT INTO public.free_trial_events (trial_id, user_id, event_name) VALUES (v_trial_id, NEW.user_id, 'teacher_invited');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_track_free_trial_staff_member ON public.user_roles;
CREATE TRIGGER trg_track_free_trial_staff_member AFTER INSERT OR UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.track_free_trial_staff_member();

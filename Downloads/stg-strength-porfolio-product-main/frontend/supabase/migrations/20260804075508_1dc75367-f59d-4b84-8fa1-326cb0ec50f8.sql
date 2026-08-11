CREATE TABLE IF NOT EXISTS public.sprint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  join_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_sessions TO authenticated;
GRANT ALL ON public.sprint_sessions TO service_role;
ALTER TABLE public.sprint_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sprint_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprint_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (sprint_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_players TO authenticated;
GRANT ALL ON public.sprint_players TO service_role;
ALTER TABLE public.sprint_players ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sprint_strengths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprint_sessions(id) ON DELETE CASCADE,
  from_student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strength_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sprint_strengths TO authenticated;
GRANT ALL ON public.sprint_strengths TO service_role;
ALTER TABLE public.sprint_strengths ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_sprint_host(_sprint_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sprint_sessions s WHERE s.id = _sprint_id AND s.teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_sprint_player(_sprint_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sprint_players p WHERE p.sprint_id = _sprint_id AND p.student_id = auth.uid());
$$;

CREATE POLICY "Teachers manage own sprints" ON public.sprint_sessions
  FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Students view joined sprints" ON public.sprint_sessions
  FOR SELECT TO authenticated USING (public.is_sprint_player(id));

CREATE POLICY "Students can join sprints" ON public.sprint_players
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own player row" ON public.sprint_players
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "View sprint players" ON public.sprint_players
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_sprint_host(sprint_id) OR public.is_sprint_player(sprint_id));

CREATE POLICY "Players can give strengths" ON public.sprint_strengths
  FOR INSERT TO authenticated WITH CHECK (from_student_id = auth.uid() AND public.is_sprint_player(sprint_id));
CREATE POLICY "View sprint strengths" ON public.sprint_strengths
  FOR SELECT TO authenticated USING (to_student_id = auth.uid() OR from_student_id = auth.uid() OR public.is_sprint_host(sprint_id));

CREATE OR REPLACE FUNCTION public.join_sprint(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sprint public.sprint_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_sprint FROM public.sprint_sessions
    WHERE join_code = upper(trim(p_code)) AND status IN ('waiting','active');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  INSERT INTO public.sprint_players (sprint_id, student_id)
  VALUES (v_sprint.id, v_uid)
  ON CONFLICT (sprint_id, student_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'sprint_id', v_sprint.id, 'status', v_sprint.status);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.join_sprint(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_sprint(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_sprint_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT; v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.sprint_sessions WHERE join_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_sprint_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_sprint_code() TO authenticated;

ALTER TABLE public.teacher_assigned_strengths
  ADD COLUMN IF NOT EXISTS from_role TEXT NOT NULL DEFAULT 'teacher',
  ADD COLUMN IF NOT EXISTS to_role TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS from_user_id UUID,
  ADD COLUMN IF NOT EXISTS to_user_id UUID;

UPDATE public.teacher_assigned_strengths
  SET from_user_id = COALESCE(from_user_id, teacher_id),
      to_user_id = COALESCE(to_user_id, student_id);

DROP POLICY IF EXISTS "Teachers can assign strengths" ON public.teacher_assigned_strengths;
CREATE POLICY "Teachers can assign strengths" ON public.teacher_assigned_strengths
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND is_teacher_of(student_id));

CREATE POLICY "Users can send strengths to others" ON public.teacher_assigned_strengths
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND from_role <> 'teacher');

CREATE POLICY "Users view strengths they received" ON public.teacher_assigned_strengths
  FOR SELECT TO authenticated USING (to_user_id = auth.uid());
CREATE POLICY "Users view strengths they sent" ON public.teacher_assigned_strengths
  FOR SELECT TO authenticated USING (from_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_strengths;
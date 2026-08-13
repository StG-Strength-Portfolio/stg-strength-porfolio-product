-- School-wide strengths community + mixed-role Strength Sprint.
--
-- IMPORTANT: the legacy Sprint column names are intentionally retained so the
-- currently deployed app remains compatible while a PR preview is tested.
-- sprint_sessions.teacher_id is the session creator, sprint_players.student_id
-- is a generic participant id, and sprint_strengths from/to_student_id are
-- generic participant ids. The foreign keys already point to profiles, so
-- students, teachers and school admins can safely share the same tables.

BEGIN;

ALTER TABLE public.sprint_sessions
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE public.sprint_players
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.sprint_strengths
  ADD COLUMN IF NOT EXISTS from_role text,
  ADD COLUMN IF NOT EXISTS to_role text,
  ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE public.teacher_assigned_strengths
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.sprint_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sprint_strength_id uuid REFERENCES public.sprint_strengths(id) ON DELETE SET NULL;

-- PostgreSQL unique indexes allow multiple NULL values, and this shape can be
-- inferred reliably by ON CONFLICT (sprint_strength_id).
CREATE UNIQUE INDEX IF NOT EXISTS teacher_assigned_strengths_sprint_strength_uidx
  ON public.teacher_assigned_strengths (sprint_strength_id);

CREATE UNIQUE INDEX IF NOT EXISTS sprint_strengths_one_gift_per_pair_uidx
  ON public.sprint_strengths (sprint_id, from_student_id, to_student_id);

CREATE INDEX IF NOT EXISTS sprint_sessions_school_status_idx
  ON public.sprint_sessions (school_id, status);

CREATE INDEX IF NOT EXISTS sprint_players_participant_idx
  ON public.sprint_players (student_id);

CREATE OR REPLACE FUNCTION public.sprint_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role::text = 'school_admin') THEN 'school_admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role::text = 'teacher') THEN 'teacher'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role::text = 'student') THEN 'student'
    ELSE NULL
  END;
$$;

-- Staff carry school_id on profiles. Students inherit school through their
-- active classroom because existing student profiles do not store school_id.
CREATE OR REPLACE FUNCTION public.user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.school_id FROM public.profiles p WHERE p.id = _user_id),
    (
      SELECT owner_profile.school_id
      FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      JOIN public.profiles owner_profile ON owner_profile.id = c.teacher_id
      WHERE cm.student_id = _user_id
        AND COALESCE(c.is_deleted, false) = false
        AND owner_profile.school_id IS NOT NULL
      ORDER BY c.created_at DESC
      LIMIT 1
    )
  );
$$;

UPDATE public.sprint_players sp
SET role = public.sprint_user_role(sp.student_id)
WHERE sp.role IS NULL;

UPDATE public.sprint_strengths ss
SET from_role = public.sprint_user_role(ss.from_student_id),
    to_role = public.sprint_user_role(ss.to_student_id)
WHERE ss.from_role IS NULL OR ss.to_role IS NULL;

ALTER TABLE public.sprint_players
  DROP CONSTRAINT IF EXISTS sprint_players_role_check;
ALTER TABLE public.sprint_players
  ADD CONSTRAINT sprint_players_role_check
  CHECK (role IS NULL OR role IN ('student', 'teacher', 'school_admin'));

ALTER TABLE public.sprint_strengths
  DROP CONSTRAINT IF EXISTS sprint_strengths_from_role_check;
ALTER TABLE public.sprint_strengths
  ADD CONSTRAINT sprint_strengths_from_role_check
  CHECK (from_role IS NULL OR from_role IN ('student', 'teacher', 'school_admin'));

ALTER TABLE public.sprint_strengths
  DROP CONSTRAINT IF EXISTS sprint_strengths_to_role_check;
ALTER TABLE public.sprint_strengths
  ADD CONSTRAINT sprint_strengths_to_role_check
  CHECK (to_role IS NULL OR to_role IN ('student', 'teacher', 'school_admin'));

CREATE OR REPLACE FUNCTION public.is_sprint_creator(_sprint_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sprint_sessions s
    WHERE s.id = _sprint_id
      AND s.teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sprint_host(_sprint_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_sprint_creator(_sprint_id);
$$;

CREATE OR REPLACE FUNCTION public.is_sprint_player(_sprint_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sprint_players p
    WHERE p.sprint_id = _sprint_id
      AND p.student_id = auth.uid()
  );
$$;

-- Keep direct access backward compatible for the currently deployed frontend,
-- but tighten every write to the approved role/school/session rules.
DROP POLICY IF EXISTS "Teachers manage own sprints" ON public.sprint_sessions;
DROP POLICY IF EXISTS "Staff manage own sprints" ON public.sprint_sessions;
CREATE POLICY "Staff manage own sprints"
  ON public.sprint_sessions FOR ALL TO authenticated
  USING (
    teacher_id = auth.uid()
    AND public.sprint_user_role(auth.uid()) IN ('teacher', 'school_admin')
  )
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.sprint_user_role(auth.uid()) IN ('teacher', 'school_admin')
    AND school_id = public.user_school_id(auth.uid())
  );

DROP POLICY IF EXISTS "Students can join sprints" ON public.sprint_players;
DROP POLICY IF EXISTS "Participants can join waiting school sprint" ON public.sprint_players;
CREATE POLICY "Participants can join waiting school sprint"
  ON public.sprint_players FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND public.sprint_user_role(auth.uid()) IN ('student', 'teacher', 'school_admin')
    AND EXISTS (
      SELECT 1
      FROM public.sprint_sessions s
      WHERE s.id = sprint_id
        AND s.status = 'waiting'
        AND s.school_id = public.user_school_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Players can give strengths" ON public.sprint_strengths;
DROP POLICY IF EXISTS "Participants give strengths inside active sprint" ON public.sprint_strengths;
CREATE POLICY "Participants give strengths inside active sprint"
  ON public.sprint_strengths FOR INSERT TO authenticated
  WITH CHECK (
    from_student_id = auth.uid()
    AND from_student_id <> to_student_id
    AND public.is_sprint_player(sprint_id)
    AND EXISTS (
      SELECT 1 FROM public.sprint_players target
      WHERE target.sprint_id = sprint_strengths.sprint_id
        AND target.student_id = sprint_strengths.to_student_id
    )
    AND EXISTS (
      SELECT 1 FROM public.sprint_sessions s
      WHERE s.id = sprint_strengths.sprint_id
        AND s.status = 'active'
    )
  );

-- Replace the old cross-school-capable non-teacher direct-gift policy.
DROP POLICY IF EXISTS "Users can send strengths to others" ON public.teacher_assigned_strengths;
DROP POLICY IF EXISTS "Community members can send strengths within school" ON public.teacher_assigned_strengths;
CREATE POLICY "Community members can send strengths within school"
  ON public.teacher_assigned_strengths FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND to_user_id IS NOT NULL
    AND from_role = public.sprint_user_role(auth.uid())
    AND to_role = public.sprint_user_role(to_user_id)
    AND public.user_school_id(auth.uid()) IS NOT NULL
    AND public.user_school_id(auth.uid()) = public.user_school_id(to_user_id)
    AND (from_role <> 'student' OR to_role <> 'student')
  );

-- Atomic normal community gift. The UI may choose up to three strengths, but
-- the database owns same-school, role, self-gift and student->student rules.
CREATE OR REPLACE FUNCTION public.give_school_strength(
  p_to_user_id uuid,
  p_strength_ids integer[],
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_id uuid := auth.uid();
  v_from_role text;
  v_to_role text;
  v_from_school uuid;
  v_to_school uuid;
  v_ids integer[];
  v_strength integer;
BEGIN
  IF v_from_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_to_user_id IS NULL OR p_to_user_id = v_from_id THEN RAISE EXCEPTION 'Invalid recipient'; END IF;

  v_from_role := public.sprint_user_role(v_from_id);
  v_to_role := public.sprint_user_role(p_to_user_id);
  IF v_from_role IS NULL OR v_from_role NOT IN ('student', 'teacher', 'school_admin') THEN
    RAISE EXCEPTION 'Unsupported sender role';
  END IF;
  IF v_to_role IS NULL OR v_to_role NOT IN ('student', 'teacher', 'school_admin') THEN
    RAISE EXCEPTION 'Unsupported recipient role';
  END IF;
  IF v_from_role = 'student' AND v_to_role = 'student' THEN
    RAISE EXCEPTION 'Students can give directly only to teachers and school admins';
  END IF;

  v_from_school := public.user_school_id(v_from_id);
  v_to_school := public.user_school_id(p_to_user_id);
  IF v_from_school IS NULL OR v_to_school IS NULL OR v_from_school <> v_to_school THEN
    RAISE EXCEPTION 'Recipient belongs to another school';
  END IF;

  SELECT array_agg(id ORDER BY id)
  INTO v_ids
  FROM (
    SELECT DISTINCT value AS id
    FROM unnest(COALESCE(p_strength_ids, ARRAY[]::integer[])) value
    WHERE value BETWEEN 1 AND 26
    LIMIT 3
  ) valid_ids;

  IF v_ids IS NULL OR cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'No valid strengths selected';
  END IF;

  FOREACH v_strength IN ARRAY v_ids LOOP
    INSERT INTO public.teacher_assigned_strengths (
      teacher_id,
      student_id,
      strength_id,
      message,
      from_role,
      to_role,
      from_user_id,
      to_user_id
    )
    VALUES (
      v_from_id,
      p_to_user_id,
      v_strength::text,
      left(nullif(trim(p_message), ''), 500),
      v_from_role,
      v_to_role,
      v_from_id,
      p_to_user_id
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', cardinality(v_ids));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sprint_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_school uuid;
  v_code text;
  v_session public.sprint_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_role := public.sprint_user_role(v_uid);
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'school_admin') THEN
    RAISE EXCEPTION 'Only teachers and school admins can create a Sprint';
  END IF;

  v_school := public.user_school_id(v_uid);
  IF v_school IS NULL THEN RAISE EXCEPTION 'No school'; END IF;

  v_code := public.generate_sprint_code();

  INSERT INTO public.sprint_sessions (teacher_id, class_id, school_id, join_code, status)
  VALUES (v_uid, NULL, v_school, v_code, 'waiting')
  RETURNING * INTO v_session;

  INSERT INTO public.sprint_players (sprint_id, student_id, role)
  VALUES (v_session.id, v_uid, v_role)
  ON CONFLICT (sprint_id, student_id)
  DO UPDATE SET role = EXCLUDED.role;

  RETURN jsonb_build_object(
    'ok', true,
    'sprint_id', v_session.id,
    'join_code', v_session.join_code,
    'status', v_session.status,
    'creator_id', v_uid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_sprint(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_school uuid;
  v_sprint public.sprint_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_role := public.sprint_user_role(v_uid);
  IF v_role IS NULL OR v_role NOT IN ('student', 'teacher', 'school_admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unsupported_role');
  END IF;

  SELECT * INTO v_sprint
  FROM public.sprint_sessions
  WHERE join_code = upper(trim(p_code))
    AND status = 'waiting'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  v_school := public.user_school_id(v_uid);
  IF v_school IS NULL OR v_sprint.school_id IS NULL OR v_school <> v_sprint.school_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'different_school');
  END IF;

  INSERT INTO public.sprint_players (sprint_id, student_id, role)
  VALUES (v_sprint.id, v_uid, v_role)
  ON CONFLICT (sprint_id, student_id)
  DO UPDATE SET role = EXCLUDED.role;

  RETURN jsonb_build_object(
    'ok', true,
    'sprint_id', v_sprint.id,
    'status', v_sprint.status,
    'creator_id', v_sprint.teacher_id,
    'join_code', v_sprint.join_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_sprint(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_sprint_creator(p_sprint_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT count(*) INTO v_count FROM public.sprint_players WHERE sprint_id = p_sprint_id;
  IF v_count < 2 THEN RAISE EXCEPTION 'At least two participants are required'; END IF;

  UPDATE public.sprint_sessions
  SET status = 'active', started_at = COALESCE(started_at, now())
  WHERE id = p_sprint_id AND status = 'waiting';

  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint cannot be started'; END IF;
  RETURN jsonb_build_object('ok', true, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.give_sprint_strength(
  p_sprint_id uuid,
  p_to_user_id uuid,
  p_strength_id text,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_from_role text;
  v_to_role text;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_uid = p_to_user_id THEN RAISE EXCEPTION 'You cannot give a Sprint strength to yourself'; END IF;
  IF p_strength_id !~ '^(?:[1-9]|1[0-9]|2[0-6])$' THEN RAISE EXCEPTION 'Invalid strength'; END IF;

  SELECT status INTO v_status FROM public.sprint_sessions WHERE id = p_sprint_id;
  IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Sprint is not active'; END IF;

  SELECT role INTO v_from_role
  FROM public.sprint_players
  WHERE sprint_id = p_sprint_id AND student_id = v_uid;

  SELECT role INTO v_to_role
  FROM public.sprint_players
  WHERE sprint_id = p_sprint_id AND student_id = p_to_user_id;

  IF v_from_role IS NULL OR v_to_role IS NULL THEN RAISE EXCEPTION 'Participant not found'; END IF;

  INSERT INTO public.sprint_strengths (
    sprint_id, from_student_id, to_student_id, from_role, to_role, strength_id, message
  )
  VALUES (
    p_sprint_id,
    v_uid,
    p_to_user_id,
    v_from_role,
    v_to_role,
    p_strength_id,
    left(nullif(trim(p_message), ''), 500)
  )
  ON CONFLICT (sprint_id, from_student_id, to_student_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sprint_player(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sprint_players
  SET is_completed = true
  WHERE sprint_id = p_sprint_id AND student_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found'; END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_sprint(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_sprint_creator(p_sprint_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.sprint_sessions
  SET status = 'completed', ended_at = COALESCE(ended_at, now())
  WHERE id = p_sprint_id AND status = 'active';

  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint is not active'; END IF;

  INSERT INTO public.teacher_assigned_strengths (
    teacher_id,
    student_id,
    strength_id,
    message,
    created_at,
    from_role,
    to_role,
    from_user_id,
    to_user_id,
    sprint_id,
    sprint_strength_id
  )
  SELECT
    ss.from_student_id,
    ss.to_student_id,
    ss.strength_id,
    ss.message,
    ss.created_at,
    ss.from_role,
    ss.to_role,
    ss.from_student_id,
    ss.to_student_id,
    ss.sprint_id,
    ss.id
  FROM public.sprint_strengths ss
  WHERE ss.sprint_id = p_sprint_id
  ON CONFLICT (sprint_strength_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'status', 'completed');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_sprint(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_sprint_creator(p_sprint_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  DELETE FROM public.sprint_sessions
  WHERE id = p_sprint_id AND status = 'waiting';

  IF NOT FOUND THEN RAISE EXCEPTION 'Only a waiting Sprint can be cancelled'; END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Student collection RPC now resolves the actual giver instead of assuming
-- every received strength came from a teacher.
CREATE OR REPLACE FUNCTION public.get_my_received_strengths()
RETURNS TABLE(id uuid, strength_id text, message text, created_at timestamptz, teacher_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         t.strength_id,
         t.message,
         t.created_at,
         COALESCE(p.display_name, '—') AS teacher_name
  FROM public.teacher_assigned_strengths t
  LEFT JOIN public.profiles p ON p.id = COALESCE(t.from_user_id, t.teacher_id)
  WHERE COALESCE(t.to_user_id, t.student_id) = auth.uid()
  ORDER BY t.created_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.sprint_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_school_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_sprint_creator(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_sprint_host(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_sprint_player(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.give_school_strength(uuid, integer[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_sprint_session() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_sprint(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_sprint(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.give_sprint_strength(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_sprint_player(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.end_sprint(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_sprint(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sprint_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_school_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sprint_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sprint_host(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sprint_player(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.give_school_strength(uuid, integer[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sprint_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_sprint(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_sprint(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.give_sprint_strength(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sprint_player(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_sprint(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sprint(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_received_strengths() TO authenticated;

COMMIT;

-- Service-description compliance: Strength Sprint carries structured strength
-- feedback only. Free-text messages are removed at the database boundary.

BEGIN;

UPDATE public.sprint_strengths
SET message = NULL
WHERE message IS NOT NULL;

ALTER TABLE public.sprint_strengths
  DROP CONSTRAINT IF EXISTS sprint_strengths_message_empty_check;
ALTER TABLE public.sprint_strengths
  ADD CONSTRAINT sprint_strengths_message_empty_check
  CHECK (message IS NULL);

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
  IF nullif(trim(COALESCE(p_message, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Strength Sprint does not allow free-text messages';
  END IF;

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
    NULL
  )
  ON CONFLICT (sprint_id, from_student_id, to_student_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMIT;

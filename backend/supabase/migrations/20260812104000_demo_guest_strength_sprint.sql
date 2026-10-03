CREATE TABLE IF NOT EXISTS public.demo_sprint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passcode TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed')),
  join_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  purge_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours')
);

CREATE INDEX IF NOT EXISTS demo_sprint_sessions_host_idx
  ON public.demo_sprint_sessions(host_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS demo_sprint_sessions_purge_idx
  ON public.demo_sprint_sessions(purge_at);

CREATE TABLE IF NOT EXISTS public.demo_sprint_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.demo_sprint_sessions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  guest_token_hash TEXT NOT NULL UNIQUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  UNIQUE(sprint_id, full_name)
);

CREATE INDEX IF NOT EXISTS demo_sprint_participants_sprint_idx
  ON public.demo_sprint_participants(sprint_id, joined_at);

CREATE TABLE IF NOT EXISTS public.demo_sprint_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.demo_sprint_sessions(id) ON DELETE CASCADE,
  from_participant_id UUID NOT NULL REFERENCES public.demo_sprint_participants(id) ON DELETE CASCADE,
  to_participant_id UUID NOT NULL REFERENCES public.demo_sprint_participants(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  UNIQUE(sprint_id, from_participant_id, to_participant_id),
  UNIQUE(sprint_id, from_participant_id, position),
  CHECK (from_participant_id <> to_participant_id)
);

CREATE INDEX IF NOT EXISTS demo_sprint_assignments_from_idx
  ON public.demo_sprint_assignments(sprint_id, from_participant_id, position);

CREATE TABLE IF NOT EXISTS public.demo_sprint_strengths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.demo_sprint_sessions(id) ON DELETE CASCADE,
  from_participant_id UUID NOT NULL REFERENCES public.demo_sprint_participants(id) ON DELETE CASCADE,
  to_participant_id UUID NOT NULL REFERENCES public.demo_sprint_participants(id) ON DELETE CASCADE,
  strength_id INTEGER NOT NULL CHECK (strength_id BETWEEN 1 AND 26),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sprint_id, from_participant_id, to_participant_id)
);

CREATE INDEX IF NOT EXISTS demo_sprint_strengths_sprint_idx
  ON public.demo_sprint_strengths(sprint_id);

ALTER TABLE public.demo_sprint_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_sprint_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_sprint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_sprint_strengths ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.demo_sprint_sessions FROM anon, authenticated;
REVOKE ALL ON public.demo_sprint_participants FROM anon, authenticated;
REVOKE ALL ON public.demo_sprint_assignments FROM anon, authenticated;
REVOKE ALL ON public.demo_sprint_strengths FROM anon, authenticated;

GRANT ALL ON public.demo_sprint_sessions TO service_role;
GRANT ALL ON public.demo_sprint_participants TO service_role;
GRANT ALL ON public.demo_sprint_assignments TO service_role;
GRANT ALL ON public.demo_sprint_strengths TO service_role;

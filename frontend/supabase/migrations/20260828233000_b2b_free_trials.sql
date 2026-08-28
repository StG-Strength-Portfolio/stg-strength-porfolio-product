-- B2B Free Trial v1
-- Data model only. This migration is reviewed through the feature PR before deployment.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'paid'
    CHECK (account_kind IN ('paid', 'trial'));

CREATE TABLE IF NOT EXISTS public.pending_free_trial_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  school_name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  requested_role text NOT NULL CHECK (requested_role IN ('teacher', 'school_admin')),
  language text NOT NULL CHECK (language IN ('fi', 'en', 'sv')),
  referral_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);
CREATE INDEX IF NOT EXISTS pending_free_trial_email_idx
  ON public.pending_free_trial_registrations (lower(email));
ALTER TABLE public.pending_free_trial_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pending_free_trial_registrations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pending_free_trial_registrations TO service_role;

CREATE TABLE IF NOT EXISTS public.free_trial_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_role text NOT NULL CHECK (creator_role IN ('teacher', 'school_admin')),
  school_name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  language text NOT NULL CHECK (language IN ('fi', 'en', 'sv')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'ended', 'converted')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  retention_ends_at timestamptz NOT NULL DEFAULT (now() + interval '120 days'),
  referral_code text UNIQUE,
  referred_by_code text,
  referral_bonus_days integer NOT NULL DEFAULT 0 CHECK (referral_bonus_days >= 0),
  authorization_confirmed_at timestamptz,
  login_count integer NOT NULL DEFAULT 0 CHECK (login_count >= 0),
  third_login_intent text,
  last_active_at timestamptz,
  engagement_score integer NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  engagement_category text NOT NULL DEFAULT 'low'
    CHECK (engagement_category IN ('low', 'medium', 'high')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  marketing_consent boolean NOT NULL DEFAULT false,
  converted_school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  converted_at timestamptz,
  retention_extended_at timestamptz,
  retention_extended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS free_trial_status_end_idx
  ON public.free_trial_workspaces (status, trial_ends_at);
CREATE INDEX IF NOT EXISTS free_trial_creator_idx
  ON public.free_trial_workspaces (creator_user_id);
ALTER TABLE public.free_trial_workspaces ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.free_trial_workspaces TO service_role;

CREATE TABLE IF NOT EXISTS public.free_trial_members (
  trial_id uuid NOT NULL REFERENCES public.free_trial_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('teacher', 'school_admin')),
  membership_kind text NOT NULL DEFAULT 'creator'
    CHECK (membership_kind IN ('creator', 'school_admin_invite')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trial_id, user_id)
);
ALTER TABLE public.free_trial_members ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.free_trial_members TO service_role;

CREATE TABLE IF NOT EXISTS public.free_trial_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_trial_id uuid NOT NULL REFERENCES public.free_trial_workspaces(id) ON DELETE CASCADE,
  referred_trial_id uuid NOT NULL UNIQUE REFERENCES public.free_trial_workspaces(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  rewarded_at timestamptz NOT NULL DEFAULT now(),
  reward_days integer NOT NULL DEFAULT 30 CHECK (reward_days = 30),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS free_trial_referrer_idx
  ON public.free_trial_referrals (referrer_trial_id);
ALTER TABLE public.free_trial_referrals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.free_trial_referrals TO service_role;

CREATE TABLE IF NOT EXISTS public.free_trial_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trial_id uuid NOT NULL REFERENCES public.free_trial_workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS free_trial_events_timeline_idx
  ON public.free_trial_events (trial_id, created_at DESC);
ALTER TABLE public.free_trial_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.free_trial_events TO service_role;

-- Trial users must not receive the default student role before their verified
-- trial registration is finalized server-side.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'registration_type', '') NOT IN ('staff', 'free_trial') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trial lifecycle helper. Safe to call from a scheduled job or server request.
CREATE OR REPLACE FUNCTION public.process_free_trial_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired integer := 0;
BEGIN
  UPDATE public.free_trial_workspaces
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND trial_ends_at <= now();
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  UPDATE public.schools s
  SET is_active = false
  FROM public.free_trial_workspaces t
  WHERE t.school_id = s.id
    AND t.status IN ('expired', 'ended')
    AND s.account_kind = 'trial';

  RETURN jsonb_build_object('expired', v_expired);
END;
$$;
REVOKE ALL ON FUNCTION public.process_free_trial_lifecycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_free_trial_lifecycle() TO service_role;

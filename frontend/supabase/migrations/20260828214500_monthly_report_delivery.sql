-- Service-description compliance: monthly teacher/admin reports are aggregate
-- only, opt-out capable, and idempotent per recipient/reporting month.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_report_opt_out boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.monthly_report_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  report_month date NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher', 'school_admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, report_month)
);

CREATE INDEX IF NOT EXISTS monthly_report_deliveries_school_month_idx
  ON public.monthly_report_deliveries (school_id, report_month);

ALTER TABLE public.monthly_report_deliveries ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.monthly_report_deliveries TO service_role;

-- Existing profile RLS remains unchanged. This narrowly scoped RPC changes only
-- the signed-in staff member's report preference.
CREATE OR REPLACE FUNCTION public.set_my_monthly_report_opt_out(p_opt_out boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.sprint_user_role(auth.uid()) NOT IN ('teacher', 'school_admin') THEN
    RAISE EXCEPTION 'Only school staff receive monthly reports';
  END IF;

  UPDATE public.profiles
  SET monthly_report_opt_out = COALESCE(p_opt_out, false)
  WHERE id = auth.uid();

  RETURN COALESCE(p_opt_out, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_monthly_report_opt_out(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_monthly_report_opt_out(boolean) TO authenticated;

COMMIT;

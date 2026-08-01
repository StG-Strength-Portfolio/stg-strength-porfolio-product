ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS billing_start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS billing_expiry_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS school_logo_url TEXT;

CREATE OR REPLACE FUNCTION public.check_school_expiry()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.schools
  SET is_active = false
  WHERE is_active = true
    AND billing_expiry_date IS NOT NULL
    AND billing_expiry_date < now();
$$;
REVOKE EXECUTE ON FUNCTION public.check_school_expiry() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.school_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_super_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_codes TO authenticated;
GRANT ALL ON public.school_codes TO service_role;

ALTER TABLE public.school_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage school codes" ON public.school_codes;
CREATE POLICY "Super admin can manage school codes"
  ON public.school_codes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can read all schools" ON public.schools;
CREATE POLICY "Super admins can read all schools"
  ON public.schools FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can insert schools" ON public.schools;
CREATE POLICY "Super admins can insert schools"
  ON public.schools FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can update schools" ON public.schools;
CREATE POLICY "Super admins can update schools"
  ON public.schools FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
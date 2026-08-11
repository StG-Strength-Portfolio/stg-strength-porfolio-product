-- Superadmin school deletion: keep a reversible 90-day trash window before
-- permanent cleanup. During the trash window the school is inactive, its staff
-- roles are suspended, and its classes are hidden from joining/use.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

CREATE INDEX IF NOT EXISTS schools_deleted_at_idx
  ON public.schools (deleted_at)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS school_deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS classes_school_deleted_at_idx
  ON public.classes (school_deleted_at)
  WHERE school_deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.school_deleted_roles (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, user_id)
);

GRANT ALL ON public.school_deleted_roles TO service_role;
ALTER TABLE public.school_deleted_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_classes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.classes
  WHERE is_deleted = true
    AND deleted_at IS NOT NULL
    AND school_deleted_at IS NULL
    AND deleted_at < now() - INTERVAL '60 days';
$$;

CREATE OR REPLACE FUNCTION public.check_school_expiry()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.schools
  SET is_active = false
  WHERE is_active = true
    AND deleted_at IS NULL
    AND billing_expiry_date IS NOT NULL
    AND billing_expiry_date < now();
$$;
REVOKE EXECUTE ON FUNCTION public.check_school_expiry() FROM PUBLIC, anon, authenticated;

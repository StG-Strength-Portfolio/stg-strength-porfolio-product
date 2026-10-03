-- Keep backend migration tree aligned with frontend/supabase.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_language text,
  ADD COLUMN IF NOT EXISTS registration_domain text;

ALTER TABLE public.pending_staff_registrations
  ADD COLUMN IF NOT EXISTS registration_language text,
  ADD COLUMN IF NOT EXISTS registration_domain text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_registration_language_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_registration_language_check
      CHECK (registration_language IS NULL OR registration_language IN ('fi', 'en', 'sv'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_registration_domain_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_registration_domain_check
      CHECK (
        registration_domain IS NULL OR registration_domain IN (
          'vahvuusportfolio.fi',
          'strengthportfolio.com',
          'styrkeportfolj.com'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pending_staff_registration_language_check'
  ) THEN
    ALTER TABLE public.pending_staff_registrations
      ADD CONSTRAINT pending_staff_registration_language_check
      CHECK (registration_language IS NULL OR registration_language IN ('fi', 'en', 'sv'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pending_staff_registration_domain_check'
  ) THEN
    ALTER TABLE public.pending_staff_registrations
      ADD CONSTRAINT pending_staff_registration_domain_check
      CHECK (
        registration_domain IS NULL OR registration_domain IN (
          'vahvuusportfolio.fi',
          'strengthportfolio.com',
          'styrkeportfolj.com'
        )
      );
  END IF;
END $$;

UPDATE public.profiles p
SET registration_language = CASE
  WHEN p.language IN ('fi', 'en', 'sv') THEN p.language
  ELSE NULL
END
WHERE p.registration_language IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = p.id
      AND r.role IN ('teacher', 'school_admin')
  );

CREATE INDEX IF NOT EXISTS profiles_language_idx
  ON public.profiles (language)
  WHERE language IS NOT NULL;

COMMIT;

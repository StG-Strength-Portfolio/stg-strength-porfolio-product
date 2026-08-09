CREATE TABLE IF NOT EXISTS public.schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'fi' CHECK (language IN ('fi','sv','en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.schools TO anon;
GRANT SELECT ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active schools"
  ON public.schools FOR SELECT
  USING (is_active = true);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE OR REPLACE FUNCTION public.validate_school_code(input_code TEXT)
RETURNS TABLE(school_id UUID, school_name TEXT, school_language TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.language
  FROM public.schools s
  WHERE s.code = UPPER(TRIM(input_code)) AND s.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_school_code(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_teacher_with_school(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_school public.schools%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_school FROM public.schools
    WHERE code = UPPER(TRIM(p_code)) AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'teacher')
  ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';

  UPDATE public.profiles
     SET school_id = v_school.id,
         language = v_school.language
   WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'school_id', v_school.id, 'school_name', v_school.name, 'language', v_school.language);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_teacher_with_school(TEXT) TO authenticated;

INSERT INTO public.schools (name, code, language) VALUES
  ('Test School Helsinki', 'SCHOOL001', 'fi'),
  ('Test School Stockholm', 'SCHOOL002', 'sv'),
  ('Test School International', 'SCHOOL003', 'en')
ON CONFLICT (code) DO NOTHING;
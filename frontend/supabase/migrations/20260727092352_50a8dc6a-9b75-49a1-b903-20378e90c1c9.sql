ALTER TABLE public.classes ALTER COLUMN language SET DEFAULT 'fi';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_language_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_language_check CHECK (language IN ('fi','sv','en'));
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fi';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_language_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_language_check CHECK (language IN ('fi','sv','en'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.join_class(p_join_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_class public.classes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_class FROM public.classes WHERE join_code = upper(trim(p_join_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  INSERT INTO public.class_members (class_id, student_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET language = v_class.language WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'class_id', v_class.id, 'class_name', v_class.name, 'language', v_class.language);
END;
$function$;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_language_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_language_check CHECK (language IN ('en','fi','sv'));

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
  RETURN jsonb_build_object('ok', true, 'class_id', v_class.id, 'class_name', v_class.name, 'language', v_class.language);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_class_language()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.language
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_class_language() TO authenticated;
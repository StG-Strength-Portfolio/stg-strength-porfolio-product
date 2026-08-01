ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_classes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.classes
  WHERE is_deleted = true
    AND deleted_at IS NOT NULL
    AND deleted_at < now() - INTERVAL '60 days';
$$;

CREATE OR REPLACE FUNCTION public.join_class(p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_class public.classes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_class FROM public.classes
    WHERE join_code = upper(trim(p_join_code)) AND is_deleted = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  INSERT INTO public.class_members (class_id, student_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET language = v_class.language WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'class_id', v_class.id, 'class_name', v_class.name, 'language', v_class.language);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_class_language()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.language
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
    AND c.is_deleted = false
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_classes_deleted()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = auth.uid() AND c.is_deleted = false
  );
$$;
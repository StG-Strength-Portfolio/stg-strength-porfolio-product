CREATE TABLE IF NOT EXISTS public.teaching_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_fi TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_sv TEXT NOT NULL,
  description_fi TEXT,
  description_en TEXT,
  description_sv TEXT,
  canva_design_id TEXT NOT NULL,
  canva_export_url TEXT,
  thumbnail_url TEXT,
  slide_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  slide_count INTEGER NOT NULL DEFAULT 0,
  level_tag TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teaching_presentations TO authenticated;
GRANT ALL ON public.teaching_presentations TO service_role;

ALTER TABLE public.teaching_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published presentations"
  ON public.teaching_presentations
  FOR SELECT
  TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin manages presentations"
  ON public.teaching_presentations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER teaching_presentations_touch_updated_at
  BEFORE UPDATE ON public.teaching_presentations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS teaching_presentations_sort_idx
  ON public.teaching_presentations (level_tag, sort_order, created_at);
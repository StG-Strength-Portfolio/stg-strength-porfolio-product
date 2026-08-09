CREATE TABLE IF NOT EXISTS public.teaching_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strength_id TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teaching_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.teaching_categories(id) ON DELETE CASCADE,
  name_fi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_sv TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teaching_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES public.teaching_subcategories(id) ON DELETE CASCADE,
  title_fi TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_sv TEXT NOT NULL,
  description_fi TEXT,
  description_en TEXT,
  description_sv TEXT,
  google_slides_url_fi TEXT,
  google_slides_url_en TEXT,
  google_slides_url_sv TEXT,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teaching_subcategories_category_idx ON public.teaching_subcategories(category_id);
CREATE INDEX IF NOT EXISTS teaching_articles_subcategory_idx ON public.teaching_articles(subcategory_id);

GRANT SELECT ON public.teaching_categories TO authenticated;
GRANT SELECT ON public.teaching_subcategories TO authenticated;
GRANT SELECT ON public.teaching_articles TO authenticated;
GRANT ALL ON public.teaching_categories TO service_role;
GRANT ALL ON public.teaching_subcategories TO service_role;
GRANT ALL ON public.teaching_articles TO service_role;

ALTER TABLE public.teaching_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View published categories" ON public.teaching_categories
  FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "View published subcategories" ON public.teaching_subcategories
  FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "View published articles" ON public.teaching_articles
  FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER teaching_categories_touch BEFORE UPDATE ON public.teaching_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER teaching_subcategories_touch BEFORE UPDATE ON public.teaching_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER teaching_articles_touch BEFORE UPDATE ON public.teaching_articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
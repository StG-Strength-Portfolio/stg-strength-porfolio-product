ALTER TABLE public.teaching_articles
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.teaching_categories(id) ON DELETE CASCADE;

UPDATE public.teaching_articles a
SET category_id = s.category_id
FROM public.teaching_subcategories s
WHERE a.subcategory_id = s.id AND a.category_id IS NULL;

ALTER TABLE public.teaching_articles ALTER COLUMN subcategory_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS teaching_articles_category_id_idx ON public.teaching_articles(category_id);
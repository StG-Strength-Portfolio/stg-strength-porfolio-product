ALTER TABLE public.teaching_categories
  ADD COLUMN IF NOT EXISTS thumbnail_url_fi TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url_en TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url_sv TEXT;

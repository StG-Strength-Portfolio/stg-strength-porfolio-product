/**
 * @lovable-new 2026-08-05
 * One teaching article exactly as a teacher sees it: title, description and
 * the whole slide deck. Reused by the super admin "Preview" panel.
 * @lovable-new 2026-08-05 — full-width white article card; the deck now owns
 * the yellow "Open slideshow" button.
 */
import { StickyNote } from "@/components/StickyNote";
import { SlideDeck } from "@/components/teach/SlideDeck";
import { pickLang } from "@/hooks/useTeachingMaterials";
import type { TeachingArticle } from "@/lib/teaching.functions";

export function ArticleView({
  article,
  lang,
}: {
  article: TeachingArticle;
  lang: "fi" | "en" | "sv";
}) {
  const raw =
    (article as unknown as Record<string, string | null>)[`google_slides_url_${lang}`] ||
    article.google_slides_url_fi;
  const title = pickLang(article as never, "title", lang);
  const description = pickLang(article as never, "description", lang);

  return (
    <StickyNote seed={`article-${article.id}`} className="w-full space-y-4">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      {description && <p className="text-sm opacity-80">{description}</p>}
      <SlideDeck url={raw} title={title} lang={lang} slideCount={article.slide_count} />
    </StickyNote>
  );
}

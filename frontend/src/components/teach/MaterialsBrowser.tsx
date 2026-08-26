/**
 * Teaching Materials browser used by teachers and school admins.
 * Flat structure: strength categories → articles → Google Slides.
 *
 * Demo and production intentionally share this exact component. Keep data,
 * publishing and navigation behavior unchanged; presentation follows the
 * designer UI system used by the current Strength Portfolio refresh.
 */
import { useMemo, useState } from "react";
import { ArrowLeftIcon, BookIcon } from "@/components/icons/AppIcons";
import { useLanguage, useTr } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { ArticleView } from "@/components/teach/ArticleView";
import { pickLang, useTeachingMaterials } from "@/hooks/useTeachingMaterials";
import { normalizeTeachingThumbnailUrl } from "@/lib/teaching-thumbnail-url";
import type { TeachingCategory } from "@/lib/teaching.functions";

function categoryThumbnail(
  category: TeachingCategory,
  lang: "fi" | "en" | "sv",
): string | null {
  const raw =
    lang === "en"
      ? category.thumbnail_url_en
      : lang === "sv"
        ? category.thumbnail_url_sv
        : category.thumbnail_url_fi;
  const normalized = normalizeTeachingThumbnailUrl(raw);
  return normalized || null;
}

export function MaterialsBrowser({
  showCounts = false,
}: {
  /** Article counts are super-admin only detail. */
  showCounts?: boolean;
} = {}) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const {
    categories: allCategories,
    subcategories: allSubcategories,
    articles: allArticles,
    loading,
  } = useTeachingMaterials();

  const categories = useMemo(() => allCategories.filter((c) => c.is_published), [allCategories]);

  /** Legacy rows may still carry only a subcategory — resolve their parent. */
  const parentOfSub = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of allSubcategories) m.set(s.id, s.category_id);
    return m;
  }, [allSubcategories]);

  const articles = useMemo(() => {
    const ok = new Set(categories.map((c) => c.id));
    return allArticles
      .filter((a) => a.is_published)
      .map((a) => ({
        ...a,
        category_id:
          a.category_id ?? (a.subcategory_id ? (parentOfSub.get(a.subcategory_id) ?? null) : null),
      }))
      .filter((a) => a.category_id && ok.has(a.category_id));
  }, [allArticles, categories, parentOfSub]);

  const [catId, setCatId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);

  const category = categories.find((c) => c.id === catId) ?? null;
  const article = articles.find((a) => a.id === articleId) ?? null;

  const articlesOf = useMemo(
    () => articles.filter((a) => a.category_id === catId),
    [articles, catId],
  );

  /** Categories that actually have at least one article. */
  const visibleCategories = useMemo(
    () =>
      categories
        .map((c) => ({ c, count: articles.filter((a) => a.category_id === c.id).length }))
        .filter((x) => x.count > 0),
    [categories, articles],
  );

  const strengthName = category ? getStrengthName(Number(category.strength_id), lang) : "";

  const crumbs: { label: string; onClick?: () => void }[] = [
    {
      label: tr("Opetusmateriaalit"),
      onClick: () => {
        setCatId(null);
        setArticleId(null);
      },
    },
  ];
  if (category) crumbs.push({ label: strengthName, onClick: () => setArticleId(null) });
  if (article) crumbs.push({ label: pickLang(article as never, "title", lang) });

  if (loading) return <p className="text-[#6B7280]">…</p>;

  return (
    <div className="space-y-5 text-[#1F2937]">
      {crumbs.length > 1 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm text-[#6B7280]">
          <button
            type="button"
            onClick={crumbs[crumbs.length - 2].onClick}
            className="flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 font-semibold text-[#374151] shadow-none transition-colors hover:border-[#C4B5FD] hover:bg-[#F9FAFB] hover:text-[#6D28D9]"
          >
            <ArrowLeftIcon size={16} />
            {tr("Takaisin")}
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[#9CA3AF]" aria-hidden>›</span>}
              {c.onClick && i < crumbs.length - 1 ? (
                <button
                  type="button"
                  onClick={c.onClick}
                  className="bg-transparent font-medium text-[#6D28D9] underline-offset-4 shadow-none hover:underline"
                >
                  {c.label}
                </button>
              ) : (
                <span className="font-semibold text-[#374151]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {!category && (
        <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-none">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-[#111827]">
              <BookIcon size={20} /> {tr("Opetusmateriaalit")}
            </h3>
          </div>

          {visibleCategories.length === 0 ? (
            <p className="text-[#6B7280]">{tr("Ei materiaaleja vielä.")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCategories.map(({ c, count }) => {
                const color = getStrengthColor(Number(c.strength_id));
                const thumbnail = categoryThumbnail(c, lang);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatId(c.id)}
                    className="designer-composite-button overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-left shadow-none transition-colors hover:border-[#C4B5FD] hover:bg-white"
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={getStrengthName(Number(c.strength_id), lang)}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div
                        className="aspect-video w-full"
                        style={{ background: color }}
                        aria-hidden
                      />
                    )}
                    <div className="border-t border-[#E5E7EB] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: color }}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block text-lg font-semibold text-[#1F2937]">
                            {getStrengthName(Number(c.strength_id), lang)}
                          </span>
                          {showCounts && (
                            <span className="mt-0.5 block text-sm font-normal text-[#6B7280]">
                              {count} {tr("Artikkeleita")}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {category && !article && (
        <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-none">
          <h3 className="text-xl font-bold text-[#111827]">{strengthName}</h3>
          {articlesOf.length === 0 ? (
            <p className="text-[#6B7280]">{tr("Ei materiaaleja vielä.")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articlesOf.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setArticleId(a.id)}
                  className="designer-composite-button space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left shadow-none transition-colors hover:border-[#C4B5FD] hover:bg-[#F9FAFB]"
                >
                  {a.thumbnail_url && (
                    <img
                      src={normalizeTeachingThumbnailUrl(a.thumbnail_url)}
                      alt={pickLang(a as never, "title", lang)}
                      loading="lazy"
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  <span className="block font-semibold text-[#1F2937]">
                    {pickLang(a as never, "title", lang)}
                  </span>
                  <span className="block text-sm font-normal text-[#6B7280]">
                    {pickLang(a as never, "description", lang)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {article && <ArticleView article={article} lang={lang} />}
    </div>
  );
}

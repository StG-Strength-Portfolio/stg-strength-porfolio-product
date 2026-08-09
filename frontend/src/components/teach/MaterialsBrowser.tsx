/**
 * @lovable-new 2026-08-05
 * Teaching Materials browser used by teachers and school admins.
 * Flat structure: strength categories → articles → Google Slides.
 * (Sub-categories were removed 2026-08-05.)
 */
import { useMemo, useState } from "react";
import { StickyNote } from "@/components/StickyNote";
import { ArrowLeftIcon, BookIcon } from "@/components/icons/AppIcons";
import { useLanguage, useTr } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { ArticleView } from "@/components/teach/ArticleView";
import { pickLang, useTeachingMaterials } from "@/hooks/useTeachingMaterials";

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

  if (loading) return <p className="opacity-70">…</p>;

  return (
    <div className="space-y-4">
      {crumbs.length > 1 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={crumbs[crumbs.length - 2].onClick}
            className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-bold text-slate-900"
          >
            <ArrowLeftIcon size={16} />
            {tr("Takaisin")}
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 opacity-80">
              {i > 0 && <span aria-hidden>›</span>}
              {c.onClick && i < crumbs.length - 1 ? (
                <button type="button" onClick={c.onClick} className="underline">
                  {c.label}
                </button>
              ) : (
                <span className="font-bold">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Level 1 — strength categories */}
      {!category && (
        <StickyNote seed="materials-cats" className="space-y-3">
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <BookIcon size={20} /> {tr("Opetusmateriaalit")}
          </h3>
          {visibleCategories.length === 0 ? (
            <p className="opacity-70">{tr("Ei materiaaleja vielä.")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCategories.map(({ c, count }) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatId(c.id)}
                  className="rounded-2xl p-4 text-left text-white shadow transition-transform hover:-translate-y-0.5"
                  style={{ background: getStrengthColor(Number(c.strength_id)) }}
                >
                  <span className="block text-lg font-bold">
                    {getStrengthName(Number(c.strength_id), lang)}
                  </span>
                  {showCounts && (
                    <span className="block text-sm opacity-90">
                      {count} {tr("Artikkeleita")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </StickyNote>
      )}

      {/* Level 2 — articles of that strength */}
      {category && !article && (
        <StickyNote seed="materials-articles" className="space-y-3">
          <h3 className="text-xl font-bold">{strengthName}</h3>
          {articlesOf.length === 0 ? (
            <p className="opacity-70">{tr("Ei materiaaleja vielä.")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {articlesOf.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setArticleId(a.id)}
                  className="space-y-2 rounded-2xl bg-white/85 p-3 text-left text-slate-900 shadow transition-transform hover:-translate-y-0.5"
                >
                  {a.thumbnail_url && (
                    <img
                      src={a.thumbnail_url}
                      alt={pickLang(a as never, "title", lang)}
                      loading="lazy"
                      className="h-28 w-full rounded-xl object-cover"
                    />
                  )}
                  <span className="block font-bold">{pickLang(a as never, "title", lang)}</span>
                  <span className="block text-sm opacity-70">
                    {pickLang(a as never, "description", lang)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </StickyNote>
      )}

      {/* Level 3 — Google Slides viewer */}
      {article && <ArticleView article={article} lang={lang} />}
    </div>
  );
}

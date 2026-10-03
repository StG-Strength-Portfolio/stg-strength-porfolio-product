/**
 * Super admin "Teaching Materials" tab — manage strength categories and articles.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage, useTr } from "@/lib/i18n";
import { STRENGTHS, getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { pickLang, useTeachingMaterials } from "@/hooks/useTeachingMaterials";
import { slidesId } from "@/lib/google-slides";
import { normalizeTeachingThumbnailUrl } from "@/lib/teaching-thumbnail-url";
import { ArticleView } from "@/components/teach/ArticleView";
import {
  createTeachingCategory,
  deleteTeachingArticle,
  deleteTeachingCategory,
  reorderTeachingArticles,
  saveTeachingArticle,
  saveTeachingCategoryThumbnails,
  setTeachingCategoryPublished,
  type TeachingArticle,
  type TeachingCategory,
} from "@/lib/teaching.functions";
import "./TeachingMaterialsTab.css";

function HiddenBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

function PublishToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function visibleCategoryThumbnail(
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

export function TeachingMaterialsTab() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const { categories, subcategories, articles, refresh } = useTeachingMaterials();

  useEffect(() => {
    document.body.classList.add("admin-materials-theme");
    return () => document.body.classList.remove("admin-materials-theme");
  }, []);

  const catOfArticle = useMemo(() => {
    const parent = new Map(subcategories.map((s) => [s.id, s.category_id]));
    return (a: TeachingArticle) =>
      a.category_id ?? (a.subcategory_id ? (parent.get(a.subcategory_id) ?? null) : null);
  }, [subcategories]);

  const addCategory = useServerFn(createTeachingCategory);
  const delCategory = useServerFn(deleteTeachingCategory);
  const saveArticle = useServerFn(saveTeachingArticle);
  const delArticle = useServerFn(deleteTeachingArticle);
  const reorderArticles = useServerFn(reorderTeachingArticles);
  const publishCategory = useServerFn(setTeachingCategoryPublished);
  const saveCategoryThumbnails = useServerFn(saveTeachingCategoryThumbnails);

  const [newStrength, setNewStrength] = useState<string>("");
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ catId: string; article: TeachingArticle | null } | null>(
    null,
  );
  const [thumbnailEditing, setThumbnailEditing] = useState<TeachingCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<TeachingArticle | null>(null);
  const [draggingArticleId, setDraggingArticleId] = useState<string | null>(null);

  const usedStrengths = useMemo(() => new Set(categories.map((c) => c.strength_id)), [categories]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(tr("Tallennettu!"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function moveArticle(categoryId: string, draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    const ordered = articles.filter((a) => catOfArticle(a) === categoryId);
    const from = ordered.findIndex((a) => a.id === draggedId);
    const to = ordered.findIndex((a) => a.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    await run(() => reorderArticles({ data: { articleIds: next.map((a) => a.id) } }));
  }

  return (
    <div className="teaching-materials-admin space-y-3">
      <StickyNote seed="tm-add-cat" className="tm-panel tm-add-category space-y-3">
        <h3 className="text-lg font-semibold">{tr("Lisää kategoria")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="tm-strength">{tr("Vahvuus")}</Label>
            <select
              id="tm-strength"
              className="tm-select px-3 py-2"
              value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)}
            >
              <option value="">{tr("Valitse")}</option>
              {STRENGTHS.map((s) => s.nr)
                .filter((id: number) => !usedStrengths.has(String(id)))
                .map((id: number) => (
                  <option key={id} value={String(id)}>
                    {getStrengthName(id, lang)}
                  </option>
                ))}
            </select>
          </div>
          <Button
            className="tm-primary-action"
            disabled={!newStrength || busy}
            onClick={() =>
              void run(async () => {
                await addCategory({ data: { strengthId: newStrength } });
                setNewStrength("");
              })
            }
          >
            {tr("Lisää")}
          </Button>
        </div>
      </StickyNote>

      {categories.map((c) => {
        const open = openCat === c.id;
        const thumbnail = visibleCategoryThumbnail(c, lang);
        const color = getStrengthColor(Number(c.strength_id));
        return (
          <StickyNote key={c.id} seed={`tm-${c.id}`} className="tm-panel tm-category-card">
            <div className="tm-category-header flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setOpenCat(open ? null : c.id)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={getStrengthName(Number(c.strength_id), lang)}
                    className="tm-category-thumbnail aspect-video shrink-0 object-cover"
                  />
                ) : (
                  <div
                    className="tm-category-thumbnail aspect-video shrink-0"
                    style={{ background: color }}
                    aria-hidden
                  />
                )}
                <span className="tm-category-title flex min-w-0 items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ background: color }}
                    aria-hidden
                  />
                  <span className="truncate">{getStrengthName(Number(c.strength_id), lang)}</span>
                  {!c.is_published && <HiddenBadge label={tr("Piilotettu")} />}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="tm-secondary-action"
                  onClick={() => setThumbnailEditing(c)}
                >
                  {language === "en" ? "Thumbnail" : language === "sv" ? "Miniatyrbild" : "Pikkukuva"}
                </Button>
                <PublishToggle
                  checked={c.is_published}
                  disabled={busy}
                  label={tr("Julkaistu")}
                  onChange={(next) =>
                    void run(() => publishCategory({ data: { id: c.id, isPublished: next } }))
                  }
                />
                <Button
                  variant="ghost"
                  className="tm-secondary-action"
                  disabled={busy}
                  onClick={() => void run(() => delCategory({ data: { id: c.id } }))}
                >
                  {tr("Poista")}
                </Button>
              </div>
            </div>

            {open && (
              <div className="tm-article-section">
                <ul className="tm-article-list">
                  {articles
                    .filter((a) => catOfArticle(a) === c.id)
                    .map((a) => (
                      <li
                        key={a.id}
                        className={`tm-article-row flex flex-wrap items-center justify-between gap-2 text-sm ${
                          draggingArticleId === a.id ? "opacity-50" : ""
                        }`}
                        onDragOver={(e) => {
                          if (draggingArticleId && draggingArticleId !== a.id) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId = draggingArticleId || e.dataTransfer.getData("text/plain");
                          setDraggingArticleId(null);
                          if (draggedId) void moveArticle(c.id, draggedId, a.id);
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            draggable={!busy}
                            onDragStart={(e) => {
                              setDraggingArticleId(a.id);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", a.id);
                            }}
                            onDragEnd={() => setDraggingArticleId(null)}
                            className="tm-drag-handle cursor-grab select-none text-base leading-none active:cursor-grabbing"
                            aria-hidden
                          >
                            ⋮⋮
                          </span>
                          <span className="min-w-0 break-words font-medium text-slate-700">
                            {pickLang(a as never, "title", lang)}
                            {!a.is_published && (
                              <span className="ml-2 text-slate-400">({tr("Ei julkaistu")})</span>
                            )}
                          </span>
                        </span>
                        <span className="tm-article-actions flex gap-3">
                          <button type="button" onClick={() => setPreview(a)}>
                            {tr("Esikatsele")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ catId: c.id, article: a })}
                          >
                            {tr("Muokkaa")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void run(() => delArticle({ data: { id: a.id } }))}
                          >
                            {tr("Poista")}
                          </button>
                        </span>
                      </li>
                    ))}
                </ul>
                <Button
                  size="sm"
                  className="tm-primary-action mt-3"
                  disabled={busy}
                  onClick={() => setEditing({ catId: c.id, article: null })}
                >
                  {tr("Lisää artikkeli")}
                </Button>
              </div>
            )}
          </StickyNote>
        );
      })}

      {thumbnailEditing && (
        <CategoryThumbnailEditor
          category={thumbnailEditing}
          busy={busy}
          onCancel={() => setThumbnailEditing(null)}
          onSave={(values) =>
            void run(async () => {
              await saveCategoryThumbnails({
                data: {
                  id: thumbnailEditing.id,
                  thumbnailFi: values.fi,
                  thumbnailEn: values.en,
                  thumbnailSv: values.sv,
                },
              });
              setThumbnailEditing(null);
            })
          }
        />
      )}

      {preview && (
        <StickyNote seed="tm-preview" className="tm-panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">{tr("Esikatsele")}</h3>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              {tr("Sulje")}
            </Button>
          </div>
          <ArticleView article={preview} lang={lang} />
        </StickyNote>
      )}

      {editing && (
        <ArticleForm
          catId={editing.catId}
          article={editing.article}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(input) =>
            void run(async () => {
              await saveArticle({ data: input });
              setEditing(null);
            })
          }
        />
      )}
    </div>
  );
}

function CategoryThumbnailEditor({
  category,
  busy,
  onCancel,
  onSave,
}: {
  category: TeachingCategory;
  busy: boolean;
  onCancel: () => void;
  onSave: (value: { fi: string; en: string; sv: string }) => void;
}) {
  const tr = useTr();
  const [fi, setFi] = useState(category.thumbnail_url_fi ?? "");
  const [en, setEn] = useState(category.thumbnail_url_en ?? "");
  const [sv, setSv] = useState(category.thumbnail_url_sv ?? "");

  const items = [
    { code: "FI", value: fi, setValue: setFi },
    { code: "EN", value: en, setValue: setEn },
    { code: "SV", value: sv, setValue: setSv },
  ];

  return (
    <StickyNote seed={`tm-thumb-${category.id}`} className="tm-panel space-y-4">
      <h3 className="text-xl font-semibold">{tr("Kuva")} — {getStrengthName(Number(category.strength_id), "en")}</h3>
      <p className="text-sm text-slate-500">
        Paste a separate image URL for Finnish, English and Swedish. Normal Google Drive share links are supported automatically. Leave a field empty to remove that language's thumbnail.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => {
          const previewUrl = normalizeTeachingThumbnailUrl(item.value);
          return (
            <div key={item.code} className="tm-thumbnail-item space-y-2 p-3">
              <Label>{item.code} thumbnail URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={item.value}
                onChange={(e) => item.setValue(e.target.value)}
              />
              {item.value.trim() ? (
                <img
                  src={previewUrl}
                  alt={`${item.code} thumbnail preview`}
                  className="aspect-video w-full rounded-lg object-cover"
                />
              ) : (
                <div
                  className="aspect-video w-full rounded-lg"
                  style={{ background: getStrengthColor(Number(category.strength_id)) }}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={!item.value || busy}
                onClick={() => item.setValue("")}
              >
                {tr("Poista")}
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          className="tm-primary-action font-semibold"
          onClick={() => onSave({ fi, en, sv })}
        >
          {tr("Tallenna")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {tr("Peruuta")}
        </Button>
      </div>
    </StickyNote>
  );
}

function ArticleForm({
  catId,
  article,
  busy,
  onCancel,
  onSave,
}: {
  catId: string;
  article: TeachingArticle | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: {
    id?: string;
    categoryId: string;
    titleFi: string;
    titleEn: string;
    titleSv: string;
    descriptionFi?: string;
    descriptionEn?: string;
    descriptionSv?: string;
    slidesFi?: string;
    slidesEn?: string;
    slidesSv?: string;
    thumbnailUrl?: string;
    isPublished: boolean;
    sortOrder?: number;
    slideCount?: number;
  }) => void;
}) {
  const tr = useTr();
  const [titleFi, setTitleFi] = useState(article?.title_fi ?? "");
  const [titleEn, setTitleEn] = useState(article?.title_en ?? "");
  const [titleSv, setTitleSv] = useState(article?.title_sv ?? "");
  const [descFi, setDescFi] = useState(article?.description_fi ?? "");
  const [descEn, setDescEn] = useState(article?.description_en ?? "");
  const [descSv, setDescSv] = useState(article?.description_sv ?? "");
  const [slidesFi, setSlidesFi] = useState(article?.google_slides_url_fi ?? "");
  const [slidesEn, setSlidesEn] = useState(article?.google_slides_url_en ?? "");
  const [slidesSv, setSlidesSv] = useState(article?.google_slides_url_sv ?? "");
  const [thumb, setThumb] = useState(article?.thumbnail_url ?? "");
  const [published, setPublished] = useState(article?.is_published ?? true);
  const [slideCount, setSlideCount] = useState(String(article?.slide_count ?? 10));

  const badLink = [slidesFi, slidesEn, slidesSv].some((u) => u.trim() && !slidesId(u));

  return (
    <StickyNote seed="tm-article-form" className="tm-panel space-y-3">
      <h3 className="text-xl font-semibold">{article ? tr("Muokkaa") : tr("Lisää artikkeli")}</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={`${tr("Otsikko")} (FI)`} value={titleFi} onChange={setTitleFi} />
        <Field label={`${tr("Otsikko")} (EN)`} value={titleEn} onChange={setTitleEn} />
        <Field label={`${tr("Otsikko")} (SV)`} value={titleSv} onChange={setTitleSv} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Area label={`${tr("Kuvaus")} (FI)`} value={descFi} onChange={setDescFi} />
        <Area label={`${tr("Kuvaus")} (EN)`} value={descEn} onChange={setDescEn} />
        <Area label={`${tr("Kuvaus")} (SV)`} value={descSv} onChange={setDescSv} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Google Slides (FI)" value={slidesFi} onChange={setSlidesFi} />
        <Field label="Google Slides (EN)" value={slidesEn} onChange={setSlidesEn} />
        <Field label="Google Slides (SV)" value={slidesSv} onChange={setSlidesSv} />
      </div>
      {badLink && (
        <p className="text-sm font-bold text-[color:var(--coral)]">
          {tr("Tarkista Google Slides -linkki")}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={tr("Kuva")} value={thumb} onChange={setThumb} />
        <div className="space-y-1">
          <Label>{tr("Diojen määrä")}</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={slideCount}
            onChange={(e) => setSlideCount(e.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        {tr("Julkaistu")}
      </label>
      <div className="flex gap-2">
        <Button
          className="tm-primary-action"
          disabled={busy || !titleFi.trim() || badLink}
          onClick={() =>
            onSave({
              id: article?.id,
              categoryId: catId,
              titleFi: titleFi.trim(),
              titleEn: (titleEn || titleFi).trim(),
              titleSv: (titleSv || titleFi).trim(),
              descriptionFi: descFi,
              descriptionEn: descEn,
              descriptionSv: descSv,
              slidesFi,
              slidesEn,
              slidesSv,
              thumbnailUrl: thumb,
              isPublished: published,
              sortOrder: article?.sort_order,
              slideCount: Number(slideCount) || 10,
            })
          }
        >
          {tr("Tallenna")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {tr("Peruuta")}
        </Button>
      </div>
    </StickyNote>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
    </div>
  );
}
/**
 * @lovable-new 2026-08-04
 * Super admin "Teaching Materials" tab — manage the three-level library:
 * @lovable-new 2026-08-05 flat structure: strength categories → articles that
 * embed a Google Slides deck per language (sub-categories removed).
 */
import { useMemo, useState } from "react";
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
import { ArticleView } from "@/components/teach/ArticleView";
import {
  createTeachingCategory,
  deleteTeachingArticle,
  deleteTeachingCategory,
  saveTeachingArticle,
  setTeachingCategoryPublished,
  type TeachingArticle,
} from "@/lib/teaching.functions";

/** Small "hidden from users" pill shown next to unpublished rows. */
function HiddenBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

/** Checkbox that flips the published flag for a folder or category. */
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
    <label className="flex items-center gap-1.5 text-xs font-semibold">
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

export function TeachingMaterialsTab() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const { categories, subcategories, articles, refresh } = useTeachingMaterials();

  /** Legacy rows may still only carry a sub-category — resolve its parent. */
  const catOfArticle = useMemo(() => {
    const parent = new Map(subcategories.map((s) => [s.id, s.category_id]));
    return (a: TeachingArticle) =>
      a.category_id ?? (a.subcategory_id ? (parent.get(a.subcategory_id) ?? null) : null);
  }, [subcategories]);

  const addCategory = useServerFn(createTeachingCategory);
  const delCategory = useServerFn(deleteTeachingCategory);
  const saveArticle = useServerFn(saveTeachingArticle);
  const delArticle = useServerFn(deleteTeachingArticle);
  const publishCategory = useServerFn(setTeachingCategoryPublished);

  const [newStrength, setNewStrength] = useState<string>("");
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ catId: string; article: TeachingArticle | null } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  /** @lovable-new 2026-08-05 article shown in the teacher-eye preview panel. */
  const [preview, setPreview] = useState<TeachingArticle | null>(null);

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

  return (
    <div className="space-y-4">
      <StickyNote seed="tm-add-cat" className="space-y-3">
        <h3 className="text-xl font-bold">{tr("Lisää kategoria")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="tm-strength">{tr("Vahvuus")}</Label>
            <select
              id="tm-strength"
              className="rounded-2xl border bg-white px-3 py-2 text-slate-900"
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
        return (
          <StickyNote key={c.id} seed={`tm-${c.id}`} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpenCat(open ? null : c.id)}
                className="flex items-center gap-2 text-xl font-bold"
              >
                <span
                  className="h-5 w-5 rounded-full"
                  style={{ background: getStrengthColor(Number(c.strength_id)) }}
                  aria-hidden
                />
                {getStrengthName(Number(c.strength_id), lang)}
                {!c.is_published && <HiddenBadge label={tr("Piilotettu")} />}
              </button>
              <div className="flex flex-wrap items-center gap-3">
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
                  disabled={busy}
                  onClick={() => void run(() => delCategory({ data: { id: c.id } }))}
                >
                  {tr("Poista")}
                </Button>
              </div>
            </div>

            {open && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white/70 p-3">
                  <ul className="space-y-1">
                    {articles
                      .filter((a) => catOfArticle(a) === c.id)
                      .map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 break-words">
                            {pickLang(a as never, "title", lang)}
                            {!a.is_published && (
                              <span className="ml-2 opacity-60">({tr("Ei julkaistu")})</span>
                            )}
                          </span>
                          <span className="flex gap-2">
                            <button
                              type="button"
                              className="underline"
                              onClick={() => setPreview(a)}
                            >
                              {tr("Esikatsele")}
                            </button>
                            <button
                              type="button"
                              className="underline"
                              onClick={() => setEditing({ catId: c.id, article: a })}
                            >
                              {tr("Muokkaa")}
                            </button>
                            <button
                              type="button"
                              className="underline"
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
                    className="mt-3"
                    disabled={busy}
                    onClick={() => setEditing({ catId: c.id, article: null })}
                  >
                    {tr("Lisää artikkeli")}
                  </Button>
                </div>
              </div>
            )}
          </StickyNote>
        );
      })}

      {preview && (
        <StickyNote seed="tm-preview" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-bold">{tr("Esikatsele")}</h3>
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
    <StickyNote seed="tm-article-form" className="space-y-3">
      <h3 className="text-xl font-bold">{article ? tr("Muokkaa") : tr("Lisää artikkeli")}</h3>
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

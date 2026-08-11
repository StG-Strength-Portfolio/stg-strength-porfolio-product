import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  listEmailTemplates,
  saveEmailTemplate,
  type EmailTemplateRow,
} from "@/lib/email-templates.functions";

type Lang = "fi" | "sv" | "en";

const SAMPLE: Record<string, string> = {
  name: "Maija Meikäläinen",
  school: "Esimerkkikoulu",
  month: "01/2026",
  reset_link: "https://vahvuus-seikkailu.lovable.app/reset-password",
  login_link: "https://vahvuus-seikkailu.lovable.app/auth/login",
  top_strengths: "1. Ystävällisyys ×12<br/>2. Rohkeus ×9<br/>3. Uteliaisuus ×7",
  active_students: "18",
  student_count: "24",
  class_count: "3",
};

function fill(text: string) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => SAMPLE[k] ?? `{{${k}}}`);
}

export function EmailTemplatesTab() {
  const tr = useTr();
  const { language } = useLanguage();
  const uiLang: Lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const fetchTemplates = useServerFn(listEmailTemplates);
  const save = useServerFn(saveEmailTemplate);

  const [rows, setRows] = useState<EmailTemplateRow[]>([]);
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null);
  const [previewing, setPreviewing] = useState<{ row: EmailTemplateRow; lang: Lang } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchTemplates());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchTemplates]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <StickyNote seed="sa-emails" className="space-y-3">
        <h2 className="text-2xl font-bold">{tr("Sähköpostimallit")}</h2>
        <p className="text-sm opacity-70">
          {tr("Muokkaa viestien otsikoita ja sisältöä kaikilla kielillä.")}
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {uiLang === "sv" ? r.name_sv : uiLang === "en" ? r.name_en : r.name_fi}
                </p>
                <p className="truncate text-xs opacity-70">
                  {uiLang === "sv"
                    ? r.description_sv
                    : uiLang === "en"
                      ? r.description_en
                      : r.description_fi}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setPreviewing({ row: r, lang: uiLang })}
              >
                {tr("Esikatsele")}
              </Button>
              <Button size="sm" className="rounded-full" onClick={() => setEditing(r)}>
                {tr("Muokkaa")}
              </Button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm opacity-70">{tr("Ei sähköpostimalleja.")}</p>}
        </div>
      </StickyNote>

      {editing && (
        <EditTemplateDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            try {
              await save({ data: { id: editing.id, ...values } });
              toast.success(tr("Tallennettu!"));
              setEditing(null);
              await load();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}

      {previewing && (
        <PreviewDialog
          row={previewing.row}
          lang={previewing.lang}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  );
}

function EditTemplateDialog({
  row,
  onClose,
  onSave,
}: {
  row: EmailTemplateRow;
  onClose: () => void;
  onSave: (v: {
    subject_fi: string;
    subject_en: string;
    subject_sv: string;
    body_fi: string;
    body_en: string;
    body_sv: string;
  }) => Promise<void>;
}) {
  const tr = useTr();
  const [lang, setLang] = useState<Lang>("fi");
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState({
    fi: row.subject_fi,
    sv: row.subject_sv,
    en: row.subject_en,
  });
  const [body, setBody] = useState({ fi: row.body_fi, sv: row.body_sv, en: row.body_en });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <h2 className="font-display text-xl">{tr("Muokkaa sähköpostimallia")}</h2>

        <div className="mt-4 flex gap-2">
          {(["fi", "sv", "en"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                lang === l ? "bg-[color:var(--purple)] text-white" : "bg-black/10"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-subject">{tr("Otsikko")}</Label>
            <Input
              id="tpl-subject"
              value={subject[lang]}
              onChange={(e) => setSubject({ ...subject, [lang]: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">{tr("Viestin sisältö")}</Label>
            <textarea
              id="tpl-body"
              rows={16}
              className="w-full rounded-2xl border border-black/15 p-3 font-mono text-xs"
              value={body[lang]}
              onChange={(e) => setBody({ ...body, [lang]: e.target.value })}
            />
          </div>
          <p className="text-xs opacity-70">
            {tr("Käytettävissä olevat muuttujat")}:{" "}
            <code>
              {Object.keys(SAMPLE)
                .map((k) => `{{${k}}}`)
                .join(" ")}
            </code>
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            disabled={busy}
            className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({
                  subject_fi: subject.fi,
                  subject_sv: subject.sv,
                  subject_en: subject.en,
                  body_fi: body.fi,
                  body_sv: body.sv,
                  body_en: body.en,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {tr("Tallenna")}
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            {tr("Sulje")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewDialog({
  row,
  lang,
  onClose,
}: {
  row: EmailTemplateRow;
  lang: Lang;
  onClose: () => void;
}) {
  const tr = useTr();
  const subject = lang === "sv" ? row.subject_sv : lang === "en" ? row.subject_en : row.subject_fi;
  const bodyRaw = lang === "sv" ? row.body_sv : lang === "en" ? row.body_en : row.body_fi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <h2 className="font-display text-xl">{tr("Esikatselu")}</h2>
        <p className="mt-2 text-sm font-semibold">{fill(subject)}</p>
        <iframe
          title={tr("Esikatselu")}
          className="mt-3 h-[50vh] w-full rounded-2xl border border-black/10"
          srcDoc={fill(bodyRaw)}
        />
        <Button variant="ghost" className="mt-4 w-full rounded-full" onClick={onClose}>
          {tr("Sulje")}
        </Button>
      </div>
    </div>
  );
}

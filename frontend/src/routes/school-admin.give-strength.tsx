/**
 * @lovable-new 2026-08-04
 * School admin (principal) → teacher strength gift.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  listSchoolTeachers,
  giveStrengthToTeacher,
  type PersonRef,
} from "@/lib/give-strength.functions";
import { getPreviewSchoolTeachers } from "@/lib/superadmin-preview.functions";

export const Route = createFileRoute("/school-admin/give-strength")({
  head: () => ({
    meta: [
      { title: "Give a strength to a teacher — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "Principals can send a character strength and a message to any teacher in their school.",
      },
      { property: "og:title", content: "Give a strength to a teacher — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Send a character strength and a message to a teacher in your school.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolAdminGiveStrengthPage,
});

function SchoolAdminGiveStrengthPage() {
  const tr = useTr();
  const guard = useRoleGuard(["school_admin"]);
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const loadTeachers = useServerFn(listSchoolTeachers);
  const loadPreviewTeachers = useServerFn(getPreviewSchoolTeachers);
  const send = useServerFn(giveStrengthToTeacher);

  const [teachers, setTeachers] = useState<PersonRef[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoHistory, setDemoHistory] = useState<Array<{ id: string; teacher: string; count: number; message: string }>>([]);

  const load = useCallback(async () => {
    try {
      if (guard.preview && guard.schoolId) {
        setTeachers(await loadPreviewTeachers({ data: { schoolId: guard.schoolId } }));
      } else {
        setTeachers(await loadTeachers());
      }
    } catch (e) {
      console.error("[give-strength]", e);
    }
  }, [guard.preview, guard.schoolId, loadPreviewTeachers, loadTeachers]);

  useEffect(() => {
    if (guard.ready) void load();
  }, [guard.ready, load]);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  async function submit() {
    if (selected.length === 0 || !teacherId) return;
    setBusy(true);
    try {
      if (guard.preview) {
        const teacher = teachers.find((item) => item.id === teacherId)?.name ?? "—";
        setDemoHistory((current) => [
          {
            id: `demo-principal-gift-${Date.now()}`,
            teacher,
            count: selected.length,
            message: message.trim(),
          },
          ...current,
        ]);
        toast.success(`${selected.length} ${tr("vahvuutta lähetetty!")}`);
        setSelected([]);
        setMessage("");
        return;
      }

      await send({ data: { teacherId, strengthIds: selected, message } });
      toast.success(`${selected.length} ${tr("vahvuutta lähetetty!")}`);
      setSelected([]);
      setMessage("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={tr("Anna vahvuus opettajalle")}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[{ to: "/school-admin/dashboard", label: tr("Takaisin") }]}
    >
      <StickyNote seed="sa-give" className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="sa-teacher">{tr("Opettajat")}</Label>
          <select
            id="sa-teacher"
            className="w-full rounded-2xl border bg-white px-3 py-2 text-slate-900"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">{tr("Valitse")}</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <StrengthPickerGrid
          lang={lang}
          selectedIds={selected}
          disabled={busy || !teacherId}
          onSelect={toggle}
        />
        <div className="space-y-2">
          <Label htmlFor="sa-msg">{tr("Viesti (valinnainen)")}</Label>
          <Textarea
            id="sa-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-white text-[color:var(--ink)]"
            rows={3}
          />
        </div>
        <Button
          className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
          disabled={busy || selected.length === 0 || !teacherId}
          onClick={() => void submit()}
        >
          {tr("Lahjoita vahvuus")}
        </Button>
      </StickyNote>

      {guard.preview && demoHistory.length > 0 && (
        <StickyNote seed="sa-give-demo-history" className="space-y-3">
          <h3 className="text-xl font-bold">{tr("Annetut vahvuudet")}</h3>
          <ul className="space-y-2 text-sm">
            {demoHistory.map((item) => (
              <li key={item.id} className="rounded-2xl bg-white/70 p-3">
                <strong>{item.teacher}</strong> · {item.count} {tr("vahvuutta")}
                {item.message && <div className="mt-1 opacity-70">{item.message}</div>}
              </li>
            ))}
          </ul>
        </StickyNote>
      )}
    </DashboardShell>
  );
}

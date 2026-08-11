/**
 * @lovable-new 2026-08-04
 * Student → teacher strength gift. The teacher is resolved server-side from
 * the student's active class, so no roster data is exposed to the client.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "@/components/StickyNote";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  getMyTeacher,
  giveStrengthToMyTeacher,
  type PersonRef,
} from "@/lib/give-strength.functions";

export const Route = createFileRoute("/_authenticated/student/give-strength")({
  head: () => ({
    meta: [
      { title: "Give a strength to your teacher — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Send one of the 26 character strengths to your teacher with a personal message.",
      },
      { property: "og:title", content: "Give a strength to your teacher — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Send a character strength to your teacher with a personal message.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentGiveStrengthPage,
});

function StudentGiveStrengthPage() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const loadTeacher = useServerFn(getMyTeacher);
  const send = useServerFn(giveStrengthToMyTeacher);

  const [teacher, setTeacher] = useState<PersonRef | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeacher(await loadTeacher());
    } catch (e) {
      console.error("[give-strength]", e);
    }
  }, [loadTeacher]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  async function submit() {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await send({ data: { strengthIds: selected, message } });
      toast.success(`${selected.length} ${tr("vahvuutta lähetetty!")}`);
      setSelected([]);
      setMessage("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="journey-bg min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <h1 className="font-display text-3xl">{tr("Anna vahvuus opettajallesi")}</h1>
        <StickyNote seed="give-teacher" className="space-y-4">
          <p className="text-sm font-bold">{teacher ? teacher.name : tr("Ei opettajaa.")}</p>
          <StrengthPickerGrid
            lang={lang}
            selectedIds={selected}
            disabled={busy || !teacher}
            onSelect={toggle}
          />
          <div className="space-y-2">
            <Label htmlFor="give-msg">{tr("Viesti (valinnainen)")}</Label>
            <Textarea
              id="give-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white text-[color:var(--ink)]"
              rows={3}
            />
          </div>
          <Button
            className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
            disabled={busy || selected.length === 0 || !teacher}
            onClick={() => void submit()}
          >
            {tr("Lahjoita vahvuus")}
          </Button>
        </StickyNote>
      </div>
    </div>
  );
}

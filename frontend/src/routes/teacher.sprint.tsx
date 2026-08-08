/**
 * @lovable-new 2026-07-31
 * Strength Sprint — teacher/host view. Create → waiting room → live progress
 * → podium, driven by Supabase Realtime.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage, useTr } from "@/lib/i18n";
import { useTeacherData } from "@/lib/teacher-dashboard-data";
import { listSprintPlayers, type SprintPlayer } from "@/lib/sprint.functions";
import { getStrengthName, getStrengthColor } from "@/lib/strengths-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/sprint")({
  head: () => ({
    meta: [
      { title: "Strength Sprint — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Host a real-time Strength Sprint where your class gives each other strengths.",
      },
      { property: "og:title", content: "Strength Sprint — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Real-time peer strength game for your class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherSprintPage,
});

type Status = "waiting" | "active" | "completed";

function TeacherSprintPage() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const guard = useRoleGuard(["teacher"]);
  const navigate = useNavigate();
  const { classes } = useTeacherData();

  const [classId, setClassId] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("waiting");
  const [players, setPlayers] = useState<SprintPlayer[]>([]);
  const [sent, setSent] = useState<Array<{ strength_id: string }>>([]);
  const [busy, setBusy] = useState(false);

  const fetchPlayers = useServerFn(listSprintPlayers);

  const reloadPlayers = useCallback(
    async (id: string) => {
      try {
        setPlayers(await fetchPlayers({ data: { sprintId: id } }));
      } catch (e) {
        console.error("[sprint]", e);
      }
    },
    [fetchPlayers],
  );

  const reloadStrengths = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("sprint_strengths" as never)
      .select("strength_id")
      .eq("sprint_id", id);
    setSent((data ?? []) as unknown as Array<{ strength_id: string }>);
  }, []);

  useEffect(() => {
    if (!sprintId) return;
    void reloadPlayers(sprintId);
    void reloadStrengths(sprintId);
    const channel = supabase
      .channel(`sprint-host-${sprintId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sprint_players",
          filter: `sprint_id=eq.${sprintId}`,
        },
        () => void reloadPlayers(sprintId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sprint_strengths",
          filter: `sprint_id=eq.${sprintId}`,
        },
        () => void reloadStrengths(sprintId),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sprintId, reloadPlayers, reloadStrengths]);

  async function createSprint() {
    if (!classId) {
      toast.error(tr("Valitse luokka"));
      return;
    }
    setBusy(true);
    try {
      const { data: gen, error: genErr } = await supabase.rpc("generate_sprint_code" as never);
      if (genErr) throw genErr;
      const joinCode = String(gen);
      const klass = classes.find((c) => c.id === classId);
      const { data, error } = await supabase
        .from("sprint_sessions" as never)
        .insert({
          teacher_id: guard.userId,
          class_id: classId,
          school_id: guard.schoolId,
          join_code: joinCode,
          status: "waiting",
        } as never)
        .select("id, join_code")
        .single();
      if (error) throw error;
      const row = data as unknown as { id: string; join_code: string };
      setSprintId(row.id);
      setCode(row.join_code);
      setStatus("waiting");
      toast.success(`${tr("Vahvuussprintti")} — ${klass?.name ?? ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setSprintStatus(next: Status) {
    if (!sprintId) return;
    const patch: Record<string, unknown> = { status: next };
    if (next === "active") patch['started_at'] = new Date().toISOString();
    if (next === "completed") patch['ended_at'] = new Date().toISOString();
    const { error } = await supabase
      .from("sprint_sessions" as never)
      .update(patch as never)
      .eq("id", sprintId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStatus(next);
  }

  async function cancelSprint() {
    if (!sprintId) return;
    await supabase.from("sprint_sessions" as never).delete().eq("id", sprintId);
    setSprintId(null);
    setCode("");
    setPlayers([]);
    setSent([]);
    setStatus("waiting");
  }

  const expected = players.length * Math.max(players.length - 1, 0);
  const pct = expected ? Math.min(100, Math.round((sent.length / expected) * 100)) : 0;

  const podium = useMemo(() => {
    const count: Record<string, number> = {};
    for (const s of sent) count[s.strength_id] = (count[s.strength_id] ?? 0) + 1;
    return Object.entries(count)
      .map(([id, c]) => ({ strengthId: Number(id), count: c }))
      .sort((a, b) => b.count - a.count || a.strengthId - b.strengthId)
      .slice(0, 3);
  }, [sent]);

  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={tr("Vahvuussprintti")}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[
        { to: "/teacher/dashboard", label: tr("Takaisin") },
        { to: "/teacher/profile", label: tr("Profiili") },
      ]}
    >
      {!sprintId && (
        <StickyNote seed="sprint-create" className="space-y-4">
          <h2 className="font-display text-2xl">{tr("Luo uusi sprintti")}</h2>
          <p className="text-sm opacity-80">
            {tr(
              "Opiskelijat antavat toisilleen vahvuuspalautetta reaaliajassa. Jokainen valitsee yhden vahvuuden kullekin luokkatoverilleen.",
            )}
          </p>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="sprint-class">{tr("Valitse luokka")}</Label>
            <select
              id="sprint-class"
              className="w-full rounded-2xl border bg-white px-3 py-2 text-slate-900"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">{tr("Valitse luokka")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs opacity-70">{tr("2–50 pelaajaa · 2–10 min")}</p>
          <Button
            className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
            disabled={busy}
            onClick={() => void createSprint()}
          >
            {tr("Aloita sprintti")}
          </Button>
        </StickyNote>
      )}

      {sprintId && status === "waiting" && (
        <StickyNote seed="sprint-wait" className="space-y-5 text-center">
          <h2 className="font-display text-2xl">{tr("Vahvuussprintti")}</h2>
          <button
            type="button"
            className="mx-auto flex items-center gap-3 font-mono text-5xl font-bold tracking-[0.3em] md:text-6xl"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success(tr("Kopioitu"));
            }}
          >
            {code}
            <Copy className="h-6 w-6 opacity-60" />
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <span
                key={p.studentId}
                className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-slate-900 shadow"
              >
                {p.name}
              </span>
            ))}
            {players.length === 0 && (
              <span className="text-sm opacity-70">{tr("Odotetaan opettajaa...")}</span>
            )}
          </div>
          <div className="flex justify-center gap-3">
            <Button
              className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
              disabled={players.length < 2}
              onClick={() => void setSprintStatus("active")}
            >
              {tr("Aloita peli")}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => void cancelSprint()}>
              {tr("Peruuta")}
            </Button>
          </div>
        </StickyNote>
      )}

      {sprintId && status === "active" && (
        <StickyNote seed="sprint-active" className="space-y-5 text-center">
          <h2 className="font-display text-2xl">{tr("Vahvuuksia lähetetään!")}</h2>
          <p className="font-mono text-4xl font-bold tabular-nums">
            {sent.length} / {expected}
          </p>
          <div className="mx-auto h-2 w-full max-w-xl overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[color:var(--yellow)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <span
                key={p.studentId}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-bold shadow",
                  p.isCompleted
                    ? "bg-[color:var(--yellow)] text-slate-900"
                    : "bg-white/90 text-slate-900",
                )}
              >
                {p.name}
              </span>
            ))}
          </div>
          <Button
            className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
            onClick={() => void setSprintStatus("completed")}
          >
            {tr("Lopeta sprintti")}
          </Button>
        </StickyNote>
      )}

      {sprintId && status === "completed" && (
        <StickyNote seed="sprint-results" className="space-y-6 text-center">
          <h2 className="font-display text-3xl">{tr("Tulokset!")}</h2>
          <div className="flex flex-wrap items-end justify-center gap-6">
            {[podium[1], podium[0], podium[2]].map((item, slot) =>
              item ? (
                <div
                  key={item.strengthId}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-3xl bg-white/90 p-4 text-slate-900 shadow-md",
                    slot === 1 && "border-4 border-[color:var(--yellow)] p-6 shadow-lg",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full font-display font-bold tabular-nums text-white shadow-inner",
                      slot === 1 ? "h-24 w-24 text-4xl" : "h-16 w-16 text-2xl",
                    )}
                    style={{ background: getStrengthColor(item.strengthId) }}
                  >
                    {item.count}
                  </span>
                  <span className="max-w-[10rem] break-words text-sm font-bold">
                    {getStrengthName(item.strengthId, lang)}
                  </span>
                </div>
              ) : null,
            )}
          </div>
          <div className="flex justify-center gap-3">
            <Button
              className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
              onClick={() => {
                setSprintId(null);
                setCode("");
                setPlayers([]);
                setSent([]);
                setStatus("waiting");
              }}
            >
              {tr("Uusi sprintti")}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => navigate({ to: "/teacher/dashboard" })}
            >
              {tr("Takaisin")}
            </Button>
          </div>
        </StickyNote>
      )}
    </DashboardShell>
  );
}

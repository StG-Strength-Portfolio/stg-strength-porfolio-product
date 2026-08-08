/**
 * @lovable-new 2026-08-04
 * Strength Sprint — student player view.
 * Join → waiting room → rate each classmate → results (auto-collected).
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  listSprintPlayers,
  collectSprintResults,
  type SprintPlayer,
  type SprintReceived,
} from "@/lib/sprint.functions";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";

export const Route = createFileRoute("/_authenticated/student/sprint")({
  head: () => ({
    meta: [
      { title: "Strength Game — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Join your class Strength Sprint and tell classmates the strengths you see in them.",
      },
      { property: "og:title", content: "Strength Game — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Join your class Strength Sprint with a 6-character code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentSprintPage,
});

type Status = "waiting" | "active" | "completed";

function StudentSprintPage() {
  const tr = useTr();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("waiting");
  const [players, setPlayers] = useState<SprintPlayer[]>([]);
  const [given, setGiven] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<SprintReceived[] | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchPlayers = useServerFn(listSprintPlayers);
  const collect = useServerFn(collectSprintResults);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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

  const reloadStatus = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("sprint_sessions")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    const next = (data?.status as Status | undefined) ?? "waiting";
    setStatus(next);
  }, []);

  useEffect(() => {
    if (!sprintId) return;
    void reloadPlayers(sprintId);
    void reloadStatus(sprintId);
    const channel = supabase
      .channel(`sprint-player-${sprintId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sprint_players", filter: `sprint_id=eq.${sprintId}` },
        () => void reloadPlayers(sprintId),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sprint_sessions", filter: `id=eq.${sprintId}` },
        () => void reloadStatus(sprintId),
      )
      .subscribe();
    const poll = window.setInterval(() => void reloadStatus(sprintId), 4000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [sprintId, reloadPlayers, reloadStatus]);

  /** Classmates the student still has to rate. */
  const others = useMemo(
    () => players.filter((p) => p.studentId !== userId),
    [players, userId],
  );

  async function join() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("join_sprint", { p_code: trimmed });
      if (error) throw error;
      const res = data as unknown as { ok: boolean; sprint_id?: string; status?: Status };
      if (!res?.ok || !res.sprint_id) {
        toast.error(tr("Virheellinen koodi tai peli on jo päättynyt."));
        return;
      }
      setSprintId(res.sprint_id);
      setStatus(res.status ?? "waiting");
    } catch (e) {
      console.error("[sprint]", e);
      toast.error(tr("Virheellinen koodi tai peli on jo päättynyt."));
    } finally {
      setBusy(false);
    }
  }

  function advance(doneIds: Set<string>) {
    let nextIndex = others.findIndex((p, i) => !doneIds.has(p.studentId) && i > currentIndex);
    if (nextIndex === -1) nextIndex = others.findIndex((p) => !doneIds.has(p.studentId));
    if (nextIndex !== -1) setCurrentIndex(nextIndex);
    else void finish();
  }

  async function finish() {
    setIsCompleted(true);
    if (!sprintId || !userId) return;
    await supabase
      .from("sprint_players")
      .update({ is_completed: true })
      .eq("sprint_id", sprintId)
      .eq("student_id", userId);
  }

  async function pick(strengthId: number) {
    const target = others[currentIndex];
    if (!sprintId || !userId || !target) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("sprint_strengths").insert({
        sprint_id: sprintId,
        from_student_id: userId,
        to_student_id: target.studentId,
        strength_id: String(strengthId),
      });
      if (error) throw error;
      const next = new Set(given).add(target.studentId);
      setGiven(next);
      advance(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Results become available once the host ends the sprint.
  useEffect(() => {
    if (status !== "completed" || !sprintId || results) return;
    (async () => {
      try {
        setResults(await collect({ data: { sprintId } }));
      } catch (e) {
        console.error("[sprint]", e);
      }
    })();
  }, [status, sprintId, results, collect]);

  const target = others[currentIndex];
  const maxCount = results?.[0]?.count ?? 1;

  return (
    <div className="journey-bg min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <h1 className="font-display text-3xl">{tr("Vahvuuspeli")}</h1>

        {/* State 1 — join */}
        {!sprintId && (
          <StickyNote seed="sprint-join" className="max-w-md space-y-4">
            <h2 className="font-display text-2xl">{tr("Liity peliin koodilla")}</h2>
            <div className="space-y-2">
              <Label htmlFor="sprint-code">{tr("Liity peliin koodilla")}</Label>
              <Input
                id="sprint-code"
                value={code}
                maxLength={6}
                autoComplete="off"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center font-mono text-2xl tracking-[0.4em]"
                placeholder="ABC123"
              />
            </div>
            <Button
              className="w-full rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
              disabled={busy}
              onClick={() => void join()}
            >
              {tr("Liity peliin")}
            </Button>
          </StickyNote>
        )}

        {/* State 2 — waiting */}
        {sprintId && status === "waiting" && (
          <StickyNote seed="sprint-wait" className="space-y-4 text-center">
            <h2 className="font-display text-2xl">{tr("Olet mukana!")}</h2>
            <p className="opacity-80">{tr("Odotetaan opettajaa...")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <span
                  key={p.studentId}
                  className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-slate-900 shadow"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </StickyNote>
        )}

        {/* State 3 — game */}
        {sprintId && status === "active" && !isCompleted && target && (
          <StickyNote seed="sprint-play" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">
                {tr("Mitä vahvuuksia näet")} {target.name}?
              </h2>
              <span className="font-mono text-sm opacity-70">
                {given.size + 1} / {others.length}
              </span>
            </div>
            <StrengthPickerGrid
              lang={lang}
              disabled={busy}
              onSelect={(id) => void pick(id)}
            />
          </StickyNote>
        )}

        {sprintId && status === "active" && (isCompleted || !target) && (
          <StickyNote seed="sprint-done" className="space-y-3 text-center">
            <h2 className="font-display text-2xl">{tr("Hienoa! Odotetaan tuloksia...")}</h2>
          </StickyNote>
        )}

        {/* State 4 — results */}
        {sprintId && status === "completed" && (
          <StickyNote seed="sprint-results" className="space-y-4">
            <h2 className="font-display text-2xl">{tr("Saamasi vahvuudet!")}</h2>
            {(results ?? []).length === 0 && (
              <p className="opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
            )}
            <ul className="space-y-3">
              {(results ?? []).map((r) => (
                <li key={r.strengthId} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm font-bold">
                    <span>
                      {getStrengthName(r.strengthId, lang)} ×{r.count}
                    </span>
                    <span className="text-xs font-medium opacity-70">
                      {r.names.join(", ")}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((r.count / maxCount) * 100)}%`,
                        background: getStrengthColor(r.strengthId),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <Button
              className="rounded-full bg-[color:var(--yellow)] font-bold text-slate-900 hover:brightness-95"
              onClick={() => navigate({ to: "/seikkailu" })}
            >
              {tr("Takaisin seikkailuun")}
            </Button>
          </StickyNote>
        )}
      </div>
    </div>
  );
}

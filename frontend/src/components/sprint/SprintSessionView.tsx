import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "@/components/StickyNote";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { useLanguage } from "@/lib/i18n";
import {
  cancelSprintSession,
  collectSprintResults,
  completeSprintPlayer,
  endSprintSession,
  getSprintSnapshot,
  giveSprintStrength,
  startSprintSession,
  type SprintReceived,
  type SprintRole,
  type SprintSnapshot,
} from "@/lib/sprint.functions";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";

const COPY = {
  fi: {
    sprint: "Vahvuussprintti",
    waiting: "Odotetaan osallistujia",
    participants: "osallistujaa",
    joinCode: "Liittymiskoodi",
    start: "Aloita sprintti",
    cancel: "Peruuta sprintti",
    active: "Vahvuuksia annetaan!",
    question: "Mitä vahvuutta näet henkilössä",
    feedback: "Palaute (valinnainen)",
    progress: "Annettu palaute",
    done: "Olet antanut vahvuuden kaikille tässä sprintissä. Odotetaan muita osallistujia.",
    end: "Lopeta sprintti",
    results: "Saamasi vahvuudet",
    noResults: "Et saanut vahvuuksia tässä sprintissä.",
    sessionTop: "Sprintin Top 3 vahvuudet",
    back: "Valmis",
    copied: "Koodi kopioitu",
    student: "Opiskelija",
    teacher: "Opettaja",
    school_admin: "Koulun admin",
    creator: "Luoja",
    saved: "Sprintti päättyi. Saadut vahvuudet tallennettiin henkilökohtaisiin kokoelmiin.",
  },
  en: {
    sprint: "Strength Sprint",
    waiting: "Waiting for participants",
    participants: "participants",
    joinCode: "Join code",
    start: "Start Sprint",
    cancel: "Cancel Sprint",
    active: "Strengths are being shared!",
    question: "What strength do you see in",
    feedback: "Feedback (optional)",
    progress: "Feedback given",
    done: "You have given a strength to everyone in this Sprint. Waiting for the other participants.",
    end: "End Sprint",
    results: "Strengths you received",
    noResults: "You did not receive any strengths in this Sprint.",
    sessionTop: "Sprint Top 3 strengths",
    back: "Done",
    copied: "Code copied",
    student: "Student",
    teacher: "Teacher",
    school_admin: "School admin",
    creator: "Creator",
    saved: "Sprint ended. Received strengths were saved to personal collections.",
  },
  sv: {
    sprint: "Styrkesprint",
    waiting: "Väntar på deltagare",
    participants: "deltagare",
    joinCode: "Anslutningskod",
    start: "Starta sprinten",
    cancel: "Avbryt sprinten",
    active: "Styrkor delas!",
    question: "Vilken styrka ser du hos",
    feedback: "Feedback (valfritt)",
    progress: "Given återkoppling",
    done: "Du har gett en styrka till alla i sprinten. Väntar på de andra deltagarna.",
    end: "Avsluta sprinten",
    results: "Styrkor du fick",
    noResults: "Du fick inga styrkor i den här sprinten.",
    sessionTop: "Sprintens topp 3 styrkor",
    back: "Klar",
    copied: "Koden kopierad",
    student: "Elev",
    teacher: "Lärare",
    school_admin: "Skoladministratör",
    creator: "Skapare",
    saved: "Sprinten avslutades. Mottagna styrkor sparades i de personliga samlingarna.",
  },
} as const;

function RoleBadge({ role, label }: { role: SprintRole; label: string }) {
  return (
    <span
      data-role={role}
      className="rounded-full bg-[color:var(--purple)]/10 px-2 py-0.5 text-[11px] font-bold text-[color:var(--purple)]"
    >
      {label}
    </span>
  );
}

export function SprintSessionView({
  sprintId,
  userId,
  onExit,
}: {
  sprintId: string;
  userId: string;
  onExit: () => void;
}) {
  const { language } = useLanguage();
  const text = COPY[language];
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const getSnapshot = useServerFn(getSprintSnapshot);
  const startSprint = useServerFn(startSprintSession);
  const endSprint = useServerFn(endSprintSession);
  const cancelSprint = useServerFn(cancelSprintSession);
  const give = useServerFn(giveSprintStrength);
  const complete = useServerFn(completeSprintPlayer);
  const getResults = useServerFn(collectSprintResults);

  const [snapshot, setSnapshot] = useState<SprintSnapshot | null>(null);
  const [results, setResults] = useState<SprintReceived[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await getSnapshot({ data: { sprintId } }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      if (/sprint not found|forbidden/i.test(errorMessage)) {
        onExit();
        return;
      }
      console.error("[sprint-snapshot]", error);
    }
  }, [getSnapshot, onExit, sprintId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (snapshot?.status !== "completed" || results) return;
    void getResults({ data: { sprintId } })
      .then(setResults)
      .catch((error) => console.error("[sprint-results]", error));
  }, [getResults, results, snapshot?.status, sprintId]);

  const isCreator = snapshot?.creatorId === userId;
  const others = useMemo(
    () => snapshot?.players.filter((player) => player.userId !== userId) ?? [],
    [snapshot?.players, userId],
  );
  const remaining = useMemo(() => {
    const given = new Set(snapshot?.givenToIds ?? []);
    return others.filter((player) => !given.has(player.userId));
  }, [others, snapshot?.givenToIds]);
  const target = remaining[0] ?? null;

  useEffect(() => {
    if (
      snapshot?.status !== "active" ||
      snapshot.myCompleted ||
      !snapshot.players.length ||
      remaining.length > 0
    ) {
      return;
    }
    void complete({ data: { sprintId } })
      .then(() => refresh())
      .catch((error) => console.error("[sprint-complete]", error));
  }, [complete, refresh, remaining.length, snapshot?.myCompleted, snapshot?.players.length, snapshot?.status, sprintId]);

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function cancelAndExit() {
    setBusy(true);
    try {
      await cancelSprint({ data: { sprintId } });
      onExit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function pick(strengthId: number) {
    if (!target) return;
    setBusy(true);
    try {
      await give({
        data: {
          sprintId,
          toUserId: target.userId,
          strengthId,
          message: message.trim() || null,
        },
      });
      setMessage("");
      if (remaining.length === 1) {
        await complete({ data: { sprintId } });
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
    return (
      <StickyNote seed="sprint-loading">
        <p className="opacity-70">{text.sprint}…</p>
      </StickyNote>
    );
  }

  if (snapshot.status === "waiting") {
    return (
      <StickyNote seed="sprint-waiting" className="space-y-5 text-center">
        <div>
          <h2 className="font-display text-2xl">{text.waiting}</h2>
          <p className="mt-1 text-sm opacity-70">
            {snapshot.players.length} {text.participants}
          </p>
        </div>

        <button
          type="button"
          className="mx-auto space-y-1"
          onClick={() => {
            void navigator.clipboard.writeText(snapshot.joinCode);
            toast.success(text.copied);
          }}
        >
          <span className="block text-xs font-bold uppercase tracking-wider opacity-60">{text.joinCode}</span>
          <span className="flex items-center gap-3 font-mono text-4xl font-bold tracking-[0.3em] md:text-6xl">
            {snapshot.joinCode}
            <Copy className="h-5 w-5 opacity-60" />
          </span>
        </button>

        <div className="flex flex-wrap justify-center gap-2">
          {snapshot.players.map((player) => (
            <span
              key={player.userId}
              className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-900 shadow"
            >
              {player.name}
              <RoleBadge role={player.role} label={text[player.role]} />
              {player.userId === snapshot.creatorId && (
                <span className="text-[10px] opacity-55">{text.creator}</span>
              )}
            </span>
          ))}
        </div>

        {isCreator ? (
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              disabled={busy || snapshot.players.length < 2}
              onClick={() => void run(() => startSprint({ data: { sprintId } }))}
              className="rounded-full bg-[color:var(--yellow)] font-bold text-[color:var(--ink)] hover:brightness-95"
            >
              {text.start}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void cancelAndExit()}
              className="rounded-full"
            >
              {text.cancel}
            </Button>
          </div>
        ) : (
          <p className="text-sm opacity-70">{text.waiting}…</p>
        )}
      </StickyNote>
    );
  }

  if (snapshot.status === "active") {
    const pct = snapshot.expectedCount
      ? Math.min(100, Math.round((snapshot.sentCount / snapshot.expectedCount) * 100))
      : 0;
    return (
      <div className="space-y-6">
        {target ? (
          <StickyNote seed="sprint-give" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">
                  {text.question} {target.name}?
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                  <RoleBadge role={target.role} label={text[target.role]} />
                  <span>{snapshot.givenToIds.length + 1} / {others.length}</span>
                </div>
              </div>
            </div>
            <StrengthPickerGrid lang={lang} disabled={busy} onSelect={(id) => void pick(id)} />
            <div className="space-y-2">
              <Label htmlFor="sprint-feedback">{text.feedback}</Label>
              <Textarea
                id="sprint-feedback"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                maxLength={500}
                className="bg-white text-[color:var(--ink)]"
              />
            </div>
          </StickyNote>
        ) : (
          <StickyNote seed="sprint-person-done" className="space-y-2 text-center">
            <h2 className="font-display text-2xl">{text.active}</h2>
            <p className="opacity-75">{text.done}</p>
          </StickyNote>
        )}

        {isCreator && (
          <StickyNote seed="sprint-host-progress" className="space-y-4 text-center">
            <h3 className="text-lg font-bold">{text.progress}</h3>
            <p className="font-mono text-3xl font-bold tabular-nums">
              {snapshot.sentCount} / {snapshot.expectedCount}
            </p>
            <div className="mx-auto h-2 w-full max-w-xl overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[color:var(--yellow)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {snapshot.players.map((player) => (
                <span
                  key={player.userId}
                  className={
                    player.isCompleted
                      ? "rounded-full bg-[color:var(--yellow)] px-3 py-1.5 text-sm font-bold text-slate-900"
                      : "rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-900"
                  }
                >
                  {player.name}
                </span>
              ))}
            </div>
            <Button
              disabled={busy}
              onClick={() => void run(() => endSprint({ data: { sprintId } }), text.saved)}
              className="rounded-full bg-[color:var(--yellow)] font-bold text-[color:var(--ink)] hover:brightness-95"
            >
              {text.end}
            </Button>
          </StickyNote>
        )}
      </div>
    );
  }

  const maxCount = results?.[0]?.count ?? 1;
  return (
    <div className="space-y-6">
      <StickyNote seed="sprint-my-results" className="space-y-4">
        <h2 className="font-display text-2xl">{text.results}</h2>
        {(results ?? []).length === 0 && <p className="opacity-70">{text.noResults}</p>}
        <ul className="space-y-4">
          {(results ?? []).map((result) => (
            <li key={result.strengthId} className="space-y-2 rounded-2xl bg-white/65 p-3">
              <div className="flex items-baseline justify-between gap-3 font-bold">
                <span>{getStrengthName(result.strengthId, lang)} ×{result.count}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((result.count / maxCount) * 100)}%`,
                    background: getStrengthColor(result.strengthId),
                  }}
                />
              </div>
              <ul className="space-y-1.5 text-sm">
                {result.givers.map((giver, index) => (
                  <li
                    key={`${result.strengthId}-${giver.name}-${index}`}
                    className="rounded-xl bg-white/75 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{giver.name}</strong>
                      <RoleBadge role={giver.role} label={text[giver.role]} />
                    </div>
                    {giver.message && <p className="mt-1 opacity-80">{giver.message}</p>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </StickyNote>

      {isCreator && snapshot.podium.length > 0 && (
        <StickyNote seed="sprint-session-top" className="space-y-3 text-center">
          <h3 className="font-display text-xl">{text.sessionTop}</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {snapshot.podium.map((item) => (
              <div key={item.strengthId} className="rounded-2xl bg-white/80 p-3 shadow-sm">
                <div
                  className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full font-bold text-white"
                  style={{ background: getStrengthColor(item.strengthId) }}
                >
                  {item.count}
                </div>
                <div className="text-sm font-bold">{getStrengthName(item.strengthId, lang)}</div>
              </div>
            ))}
          </div>
        </StickyNote>
      )}

      <div className="flex justify-center">
        <Button
          onClick={onExit}
          className="rounded-full bg-[color:var(--yellow)] font-bold text-[color:var(--ink)] hover:brightness-95"
        >
          {text.back}
        </Button>
      </div>
    </div>
  );
}

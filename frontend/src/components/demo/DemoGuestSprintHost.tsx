import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Lock, LockOpen, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import {
  createDemoSprint,
  endDemoSprint,
  getCurrentDemoSprint,
  refreshDemoSprintHost,
  setDemoSprintJoinLocked,
  startDemoSprint,
  type DemoSprintHostState,
} from "@/lib/demo-sprint.functions";

const JOIN_URL = "https://www.strengthportfolio.com/sprint/demo";
const QR_URL = `https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(JOIN_URL)}`;

const COPY = {
  fi: {
    introTitle: "Vahvuussprintti opettajille",
    intro: "Luo väliaikainen demosprintti. Osallistujat skannaavat QR-koodin, syöttävät vaihtuvan pääsykoodin ja liittyvät omalla koko nimellään.",
    create: "Luo demosprintti",
    creating: "Luodaan…",
    scan: "Skannaa ja liity",
    passcode: "Pääsykoodi",
    copyLink: "Kopioi liittymislinkki",
    copyCode: "Kopioi koodi",
    joined: "osallistujaa liittynyt",
    waiting: "Odotetaan osallistujia",
    lock: "Lukitse liittyminen",
    unlock: "Avaa liittyminen",
    start: "Aloita sprintti",
    active: "Vahvuuksia lähetetään",
    sent: "vahvuutta lähetetty",
    finished: "valmis",
    end: "Lopeta sprintti",
    endConfirm: "Kaikki eivät ole vielä valmiita. Lopetetaanko sprintti silti?",
    results: "Ryhmän tulokset",
    allStrengths: "Kaikki vahvuudet",
    newSprint: "Uusi sprintti",
    noResults: "Ei vielä vahvuuksia.",
    joinLocked: "Liittyminen lukittu",
    joinOpen: "Liittyminen avoinna",
    copied: "Kopioitu",
    refresh: "Päivitä",
  },
  en: {
    introTitle: "Strength Sprint for teachers",
    intro: "Create a temporary demo Sprint. Participants scan the QR code, enter the fresh passcode and join using their full name.",
    create: "Create demo Sprint",
    creating: "Creating…",
    scan: "Scan to join",
    passcode: "Passcode",
    copyLink: "Copy join link",
    copyCode: "Copy passcode",
    joined: "participants joined",
    waiting: "Waiting for participants",
    lock: "Lock joining",
    unlock: "Unlock joining",
    start: "Start Sprint",
    active: "Strengths are being sent",
    sent: "strengths sent",
    finished: "finished",
    end: "End Sprint",
    endConfirm: "Some participants are still playing. End the Sprint anyway?",
    results: "Group results",
    allStrengths: "All strengths",
    newSprint: "New Sprint",
    noResults: "No strengths yet.",
    joinLocked: "Joining locked",
    joinOpen: "Joining open",
    copied: "Copied",
    refresh: "Refresh",
  },
  sv: {
    introTitle: "Styrkesprint för lärare",
    intro: "Skapa en tillfällig demosprint. Deltagarna skannar QR-koden, anger den nya koden och ansluter med sitt fullständiga namn.",
    create: "Skapa demosprint",
    creating: "Skapar…",
    scan: "Skanna för att delta",
    passcode: "Kod",
    copyLink: "Kopiera anslutningslänk",
    copyCode: "Kopiera kod",
    joined: "deltagare har anslutit",
    waiting: "Väntar på deltagare",
    lock: "Lås anslutning",
    unlock: "Öppna anslutning",
    start: "Starta sprint",
    active: "Styrkor skickas",
    sent: "styrkor skickade",
    finished: "klar",
    end: "Avsluta sprint",
    endConfirm: "Några deltagare spelar fortfarande. Avsluta sprinten ändå?",
    results: "Gruppresultat",
    allStrengths: "Alla styrkor",
    newSprint: "Ny sprint",
    noResults: "Inga styrkor ännu.",
    joinLocked: "Anslutning låst",
    joinOpen: "Anslutning öppen",
    copied: "Kopierat",
    refresh: "Uppdatera",
  },
} as const;

export function DemoGuestSprintHost() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const [sprint, setSprint] = useState<DemoSprintHostState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadCurrent = useServerFn(getCurrentDemoSprint);
  const create = useServerFn(createDemoSprint);
  const refresh = useServerFn(refreshDemoSprintHost);
  const setLocked = useServerFn(setDemoSprintJoinLocked);
  const start = useServerFn(startDemoSprint);
  const end = useServerFn(endDemoSprint);

  const refreshState = useCallback(async () => {
    if (!sprint?.id) return;
    try {
      setSprint(await refresh({ data: { sprintId: sprint.id } }));
    } catch (error) {
      console.warn("[demo-sprint-host] refresh", error);
    }
  }, [refresh, sprint?.id]);

  useEffect(() => {
    let cancelled = false;
    void loadCurrent()
      .then((state) => {
        if (!cancelled) setSprint(state);
      })
      .catch((error) => console.warn("[demo-sprint-host] load", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadCurrent]);

  useEffect(() => {
    if (!sprint || sprint.status === "completed") return;
    const id = window.setInterval(() => void refreshState(), 1500);
    return () => window.clearInterval(id);
  }, [sprint, refreshState]);

  const finishedCount = sprint?.participants.filter((p) => p.finished).length ?? 0;
  const pct = sprint?.total ? Math.min(100, Math.round((sprint.sent / sprint.total) * 100)) : 0;
  const podium = useMemo(() => sprint?.results.slice(0, 3) ?? [], [sprint?.results]);

  async function createNew() {
    setBusy(true);
    try {
      setSprint(await create());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function toggleJoining() {
    if (!sprint) return;
    setBusy(true);
    try {
      setSprint(await setLocked({ data: { sprintId: sprint.id, locked: !sprint.joinLocked } }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startNow() {
    if (!sprint) return;
    setBusy(true);
    try {
      setSprint(await start({ data: { sprintId: sprint.id } }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function endNow() {
    if (!sprint) return;
    if (finishedCount < sprint.participants.length && !window.confirm(copy.endConfirm)) return;
    setBusy(true);
    try {
      setSprint(await end({ data: { sprintId: sprint.id } }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <StickyNote seed="demo-sprint-loading"><p className="opacity-70">…</p></StickyNote>;
  }

  if (!sprint) {
    return (
      <StickyNote seed="demo-sprint-create" className="space-y-5">
        <div className="space-y-2">
          <h2 className="font-display text-3xl">{copy.introTitle}</h2>
          <p className="max-w-3xl text-sm opacity-80">{copy.intro}</p>
        </div>
        <p className="text-sm font-semibold">2–50 · {language === "en" ? "5 colleagues each for groups of 6+" : language === "sv" ? "5 kollegor var i grupper med 6+" : "5 kollegaa jokaiselle, kun ryhmässä on 6+"}</p>
        <Button
          className="rounded-full bg-[color:var(--yellow)] px-7 font-bold text-slate-900 hover:brightness-95"
          disabled={busy}
          onClick={() => void createNew()}
        >
          {busy ? copy.creating : copy.create}
        </Button>
      </StickyNote>
    );
  }

  if (sprint.status === "waiting") {
    return (
      <div className="space-y-5">
        <StickyNote seed="demo-sprint-join" className="grid gap-6 lg:grid-cols-[330px_1fr] lg:items-center">
          <div className="mx-auto w-full max-w-[320px] rounded-[2rem] bg-white p-4 shadow-md">
            <img src={QR_URL} alt={copy.scan} className="aspect-square w-full rounded-2xl object-contain" />
          </div>
          <div className="space-y-5 text-center lg:text-left">
            <div>
              <div className="mb-2 flex items-center justify-center gap-2 text-sm font-bold opacity-70 lg:justify-start">
                <QrCode className="h-5 w-5" /> {copy.scan}
              </div>
              <div className="font-mono text-5xl font-black tracking-[0.18em] md:text-6xl">{sprint.passcode}</div>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider opacity-60">{copy.passcode}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  void navigator.clipboard.writeText(sprint.passcode);
                  toast.success(copy.copied);
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> {copy.copyCode}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  void navigator.clipboard.writeText(JOIN_URL);
                  toast.success(copy.copied);
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> {copy.copyLink}
              </Button>
            </div>
            <p className="break-all text-sm opacity-70">{JOIN_URL}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <span className="rounded-full bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-slate-900">
                {sprint.participants.length} {copy.joined}
              </span>
              <span className="text-sm font-semibold opacity-70">{sprint.joinLocked ? copy.joinLocked : copy.joinOpen}</span>
            </div>
          </div>
        </StickyNote>

        <StickyNote seed="demo-sprint-waiting" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-2xl">{copy.waiting}</h3>
            <Button variant="ghost" className="rounded-full" onClick={() => void refreshState()}>
              <RefreshCw className="mr-2 h-4 w-4" /> {copy.refresh}
            </Button>
          </div>
          <div className="flex min-h-16 flex-wrap gap-2">
            {sprint.participants.map((p) => (
              <span key={p.id} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow">{p.name}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-full" disabled={busy} onClick={() => void toggleJoining()}>
              {sprint.joinLocked ? <LockOpen className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
              {sprint.joinLocked ? copy.unlock : copy.lock}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--yellow)] px-7 font-bold text-slate-900 hover:brightness-95"
              disabled={busy || sprint.participants.length < 2}
              onClick={() => void startNow()}
            >
              {copy.start}
            </Button>
          </div>
        </StickyNote>
      </div>
    );
  }

  if (sprint.status === "active") {
    return (
      <div className="space-y-5">
        <StickyNote seed="demo-sprint-progress" className="space-y-5 text-center">
          <h2 className="font-display text-3xl">{copy.active}</h2>
          <div className="font-mono text-5xl font-black tabular-nums">{sprint.sent} / {sprint.total}</div>
          <p className="text-sm font-bold opacity-70">{copy.sent}</p>
          <div className="mx-auto h-4 w-full max-w-3xl overflow-hidden rounded-full bg-white shadow-inner">
            <div className="h-full rounded-full bg-[color:var(--yellow)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-bold">{finishedCount} / {sprint.participants.length} {copy.finished}</p>
        </StickyNote>

        <StickyNote seed="demo-sprint-people" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sprint.participants.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-4 text-slate-900 shadow">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-bold">{p.name}</span>
                  <span className="shrink-0 font-mono font-bold">{p.sent}/{p.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[color:var(--yellow)]"
                    style={{ width: `${p.total ? Math.round((p.sent / p.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            className="rounded-full bg-[color:var(--purple)] px-7 font-bold text-white hover:bg-[color:var(--purple)]/90"
            disabled={busy}
            onClick={() => void endNow()}
          >
            {copy.end}
          </Button>
        </StickyNote>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StickyNote seed="demo-sprint-results" className="space-y-7 text-center">
        <h2 className="font-display text-3xl">{copy.results}</h2>
        {podium.length === 0 ? (
          <p className="opacity-70">{copy.noResults}</p>
        ) : (
          <div className="flex flex-wrap items-end justify-center gap-5">
            {[podium[1], podium[0], podium[2]].map((item, slot) =>
              item ? (
                <div
                  key={item.strengthId}
                  className={`flex flex-col items-center gap-2 rounded-3xl bg-white text-slate-900 shadow ${slot === 1 ? "p-7 ring-4 ring-[color:var(--yellow)]" : "p-5"}`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full font-display font-black text-white ${slot === 1 ? "h-24 w-24 text-4xl" : "h-16 w-16 text-2xl"}`}
                    style={{ background: getStrengthColor(item.strengthId) }}
                  >
                    {item.count}
                  </span>
                  <span className="max-w-44 text-sm font-bold">{getStrengthName(item.strengthId, lang)}</span>
                </div>
              ) : null,
            )}
          </div>
        )}
      </StickyNote>

      <StickyNote seed="demo-sprint-all-results" className="space-y-4">
        <h3 className="font-display text-2xl">{copy.allStrengths}</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {sprint.results.map((item, index) => (
            <div key={item.strengthId} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-sm">
              <span className="w-6 font-mono text-sm font-bold opacity-50">{index + 1}</span>
              <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: getStrengthColor(item.strengthId) }} />
              <span className="min-w-0 flex-1 text-sm font-bold">{getStrengthName(item.strengthId, lang)}</span>
              <span className="font-mono font-black">{item.count}</span>
            </div>
          ))}
        </div>
        <Button
          className="rounded-full bg-[color:var(--yellow)] px-7 font-bold text-slate-900 hover:brightness-95"
          disabled={busy}
          onClick={() => void createNew()}
        >
          {copy.newSprint}
        </Button>
      </StickyNote>
    </div>
  );
}

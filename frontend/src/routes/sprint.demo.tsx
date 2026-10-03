import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { useLanguage } from "@/lib/i18n";
import {
  finishDemoSprintGuest,
  getDemoSprintGuestState,
  joinDemoSprint,
  saveDemoSprintStrength,
  type DemoSprintGuestState,
} from "@/lib/demo-sprint.functions";
import { checkDemoSprintPasscode } from "@/lib/demo-sprint-public.functions";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";

export const Route = createFileRoute("/sprint/demo")({
  head: () => ({
    meta: [
      { title: "Demo Strength Sprint — Strength Portfolio" },
      { name: "description", content: "Join a temporary Strength Sprint demo." },
    ],
  }),
  component: DemoSprintGuestPage,
});

const TOKEN_KEY = "strength_portfolio_demo_sprint_guest_token";

const COPY = {
  fi: {
    title: "Vahvuussprintti",
    demo: "Demosprintti",
    enterCode: "Syötä pääsykoodi",
    codeHint: "Saat 6-merkkisen koodin sprintin vetäjältä.",
    continue: "Jatka",
    invalidCode: "Koodi ei ole voimassa tai liittyminen on suljettu.",
    fullName: "Koko nimesi",
    fullNameHint: "Syötä etu- ja sukunimi, jotta kollegasi tunnistavat sinut.",
    join: "Liity sprinttiin",
    joining: "Liitytään…",
    waitingTitle: "Olet mukana!",
    waiting: "Odotetaan, että vetäjä aloittaa sprintin.",
    joined: "osallistujaa mukana",
    question: "Minkä vahvuuden näet henkilössä",
    progress: "kollegaa",
    back: "Takaisin",
    review: "Tarkista vastauksesi",
    reviewHint: "Voit vielä muuttaa vahvuuksia ennen lähettämistä.",
    change: "Muuta",
    finish: "Lähetä vahvuudet",
    finishing: "Lähetetään…",
    doneTitle: "Hienoa!",
    done: "Palautteesi on lähetetty. Odotetaan muiden valmistumista ja tuloksia.",
    results: "Kollegoidesi näkemät vahvuudet sinussa",
    from: "Valitsivat",
    noResults: "Et saanut tällä kierroksella vahvuuksia.",
    expired: "Tämä demosprintti on päättynyt tai vanhentunut.",
    startOver: "Liity uuteen sprinttiin",
    copied: "Kopioitu",
  },
  en: {
    title: "Strength Sprint",
    demo: "Demo Sprint",
    enterCode: "Enter passcode",
    codeHint: "Get the 6-character passcode from the Sprint host.",
    continue: "Continue",
    invalidCode: "The passcode is not active or joining is closed.",
    fullName: "Your full name",
    fullNameHint: "Enter your first and last name so your colleagues can recognize you.",
    join: "Join Sprint",
    joining: "Joining…",
    waitingTitle: "You’re in!",
    waiting: "Waiting for the host to start the Sprint.",
    joined: "participants joined",
    question: "What strength do you see in",
    progress: "colleagues",
    back: "Back",
    review: "Review your feedback",
    reviewHint: "You can still change strengths before submitting.",
    change: "Change",
    finish: "Send strengths",
    finishing: "Sending…",
    doneTitle: "Great!",
    done: "Your feedback has been sent. Waiting for the others and the results.",
    results: "Strengths your colleagues see in you",
    from: "Selected by",
    noResults: "You did not receive any strengths in this round.",
    expired: "This Demo Sprint has ended or expired.",
    startOver: "Join a new Sprint",
    copied: "Copied",
  },
  sv: {
    title: "Styrkesprint",
    demo: "Demosprint",
    enterCode: "Ange kod",
    codeHint: "Du får den 6 tecken långa koden av sprintens värd.",
    continue: "Fortsätt",
    invalidCode: "Koden är inte aktiv eller anslutningen är stängd.",
    fullName: "Ditt fullständiga namn",
    fullNameHint: "Ange för- och efternamn så att dina kollegor känner igen dig.",
    join: "Delta i sprinten",
    joining: "Ansluter…",
    waitingTitle: "Du är med!",
    waiting: "Väntar på att värden startar sprinten.",
    joined: "deltagare anslutna",
    question: "Vilken styrka ser du hos",
    progress: "kollegor",
    back: "Tillbaka",
    review: "Granska din feedback",
    reviewHint: "Du kan fortfarande ändra styrkor innan du skickar.",
    change: "Ändra",
    finish: "Skicka styrkor",
    finishing: "Skickar…",
    doneTitle: "Bra!",
    done: "Din feedback har skickats. Väntar på de andra och resultaten.",
    results: "Styrkor som dina kollegor ser hos dig",
    from: "Valdes av",
    noResults: "Du fick inga styrkor i den här omgången.",
    expired: "Den här demosprinten har avslutats eller gått ut.",
    startOver: "Delta i en ny sprint",
    copied: "Kopierat",
  },
} as const;

type Step = "code" | "name" | "session" | "expired";

function DemoSprintGuestPage() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const [step, setStep] = useState<Step>("code");
  const [passcode, setPasscode] = useState("");
  const [fullName, setFullName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<DemoSprintGuestState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const checkCode = useServerFn(checkDemoSprintPasscode);
  const join = useServerFn(joinDemoSprint);
  const fetchState = useServerFn(getDemoSprintGuestState);
  const saveStrength = useServerFn(saveDemoSprintStrength);
  const finish = useServerFn(finishDemoSprintGuest);

  const reload = useCallback(async (activeToken: string) => {
    try {
      const next = await fetchState({ data: { token: activeToken } });
      setState(next);
      setStep("session");
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setState(null);
      setStep("expired");
    }
  }, [fetchState]);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    setToken(stored);
    void reload(stored);
  }, [reload]);

  useEffect(() => {
    if (!token || step !== "session" || !state || state.status === "completed") return;
    const id = window.setInterval(() => void reload(token), 1500);
    return () => window.clearInterval(id);
  }, [token, step, state, reload]);

  useEffect(() => {
    if (!state || state.status !== "active" || state.finished || state.assignments.length === 0) return;
    const firstMissing = state.assignments.findIndex((a) => a.strengthId == null);
    if (firstMissing >= 0) setCurrentIndex((old) => Math.min(old, firstMissing));
  }, [state?.status, state?.finished, state?.assignments]);

  const answered = state?.assignments.filter((a) => a.strengthId != null).length ?? 0;
  const total = state?.assignments.length ?? 0;
  const current = state?.assignments[currentIndex] ?? null;
  const reviewing = !!state && state.status === "active" && !state.finished && total > 0 && currentIndex >= total;

  async function validateCode() {
    const normalized = passcode.trim().toUpperCase();
    if (normalized.length !== 6) return;
    setBusy(true);
    try {
      const result = await checkCode({ data: { passcode: normalized } });
      if (!result.ok) {
        toast.error(copy.invalidCode);
        return;
      }
      setPasscode(normalized);
      setStep("name");
    } catch {
      toast.error(copy.invalidCode);
    } finally {
      setBusy(false);
    }
  }

  async function joinNow() {
    setBusy(true);
    try {
      const result = await join({ data: { passcode, fullName } });
      window.localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setState(result.state);
      setStep("session");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function chooseStrength(strengthId: number) {
    if (!token || !current) return;
    setBusy(true);
    try {
      const next = await saveStrength({
        data: { token, toParticipantId: current.participantId, strengthId },
      });
      setState(next);
      if (currentIndex < next.assignments.length - 1) setCurrentIndex(currentIndex + 1);
      else setCurrentIndex(next.assignments.length);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finishNow() {
    if (!token) return;
    setBusy(true);
    try {
      setState(await finish({ data: { token } }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setState(null);
    setPasscode("");
    setFullName("");
    setCurrentIndex(0);
    setStep("code");
  }

  const resultMax = state?.results[0]?.count ?? 1;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background px-4 py-6 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 mx-auto w-full max-w-xl space-y-5 pt-14 sm:pt-10">
        <header className="space-y-1 text-center">
          <span className="inline-flex rounded-full bg-[color:var(--yellow)] px-3 py-1 text-xs font-bold text-[color:var(--purple)]">{copy.demo}</span>
          <h1 className="font-display text-3xl">{copy.title}</h1>
        </header>

        {step === "code" && (
          <StickyNote seed="guest-code" className="space-y-5 p-5 sm:p-7">
            <div className="space-y-1 text-center">
              <h2 className="font-display text-2xl">{copy.enterCode}</h2>
              <p className="text-sm opacity-70">{copy.codeHint}</p>
            </div>
            <Input
              value={passcode}
              maxLength={6}
              autoComplete="off"
              inputMode="text"
              onChange={(e) => setPasscode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
              className="h-16 text-center font-mono text-3xl font-black uppercase tracking-[0.25em]"
              placeholder="K7P4Q2"
            />
            <Button
              className="h-14 w-full rounded-full bg-[color:var(--yellow)] text-base font-bold text-slate-900"
              disabled={busy || passcode.length !== 6}
              onClick={() => void validateCode()}
            >
              {copy.continue}
            </Button>
          </StickyNote>
        )}

        {step === "name" && (
          <StickyNote seed="guest-name" className="space-y-5 p-5 sm:p-7">
            <button type="button" className="flex items-center gap-1 text-sm font-bold opacity-70" onClick={() => setStep("code")}>
              <ArrowLeft className="h-4 w-4" /> {copy.back}
            </button>
            <div className="space-y-1">
              <Label htmlFor="demo-full-name" className="text-base font-bold">{copy.fullName}</Label>
              <p className="text-sm opacity-70">{copy.fullNameHint}</p>
            </div>
            <Input
              id="demo-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="h-14 text-lg"
              placeholder={language === "en" ? "Alex Johnson" : language === "sv" ? "Anna Lindström" : "Aino Virtanen"}
            />
            <Button
              className="h-14 w-full rounded-full bg-[color:var(--yellow)] text-base font-bold text-slate-900"
              disabled={busy || fullName.trim().split(/\s+/).filter(Boolean).length < 2}
              onClick={() => void joinNow()}
            >
              {busy ? copy.joining : copy.join}
            </Button>
          </StickyNote>
        )}

        {step === "expired" && (
          <StickyNote seed="guest-expired" className="space-y-5 p-6 text-center">
            <p className="font-bold">{copy.expired}</p>
            <Button className="w-full rounded-full bg-[color:var(--yellow)] font-bold text-slate-900" onClick={startOver}>
              {copy.startOver}
            </Button>
          </StickyNote>
        )}

        {step === "session" && state?.status === "waiting" && (
          <StickyNote seed="guest-waiting" className="space-y-5 p-5 text-center sm:p-7">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--yellow)] text-[color:var(--purple)]">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-display text-2xl">{copy.waitingTitle}</h2>
              <p className="mt-1 text-sm opacity-70">{copy.waiting}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-bold">
              <Users className="h-5 w-5" /> {state.participants.length} {copy.joined}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {state.participants.map((name) => (
                <span key={name} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm">{name}</span>
              ))}
            </div>
          </StickyNote>
        )}

        {step === "session" && state?.status === "active" && !state.finished && !reviewing && current && (
          <StickyNote seed="guest-play" className="space-y-5 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>{answered} / {total} {copy.progress}</span>
                <span>{state.name}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white shadow-inner">
                <div className="h-full rounded-full bg-[color:var(--yellow)]" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
              </div>
            </div>
            <h2 className="text-center font-display text-2xl leading-tight">{copy.question} <span className="text-[color:var(--purple)]">{current.name}</span>?</h2>
            <StrengthPickerGrid
              lang={lang}
              selected={current.strengthId}
              disabled={busy}
              onSelect={(id) => void chooseStrength(id)}
              className="grid-cols-2 sm:grid-cols-3"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> {copy.back}
              </Button>
              {answered === total && (
                <Button
                  className="flex-1 rounded-full bg-[color:var(--yellow)] font-bold text-slate-900"
                  onClick={() => setCurrentIndex(total)}
                >
                  {copy.review}
                </Button>
              )}
            </div>
          </StickyNote>
        )}

        {step === "session" && reviewing && state && (
          <StickyNote seed="guest-review" className="space-y-5 p-5 sm:p-7">
            <div className="space-y-1 text-center">
              <h2 className="font-display text-2xl">{copy.review}</h2>
              <p className="text-sm opacity-70">{copy.reviewHint}</p>
            </div>
            <div className="space-y-2">
              {state.assignments.map((item, index) => (
                <button
                  key={item.participantId}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left text-slate-900 shadow-sm"
                >
                  <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: item.strengthId ? getStrengthColor(item.strengthId) : "#e5e7eb" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{item.name}</span>
                    <span className="block text-xs opacity-70">{item.strengthId ? getStrengthName(item.strengthId, lang) : "—"}</span>
                  </span>
                  <span className="text-xs font-bold text-[color:var(--purple)]">{copy.change}</span>
                </button>
              ))}
            </div>
            <Button
              className="h-14 w-full rounded-full bg-[color:var(--yellow)] text-base font-bold text-slate-900"
              disabled={busy || answered !== total}
              onClick={() => void finishNow()}
            >
              {busy ? copy.finishing : copy.finish}
            </Button>
          </StickyNote>
        )}

        {step === "session" && state?.status === "active" && state.finished && (
          <StickyNote seed="guest-done" className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--yellow)] text-[color:var(--purple)]">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl">{copy.doneTitle}</h2>
            <p className="text-sm opacity-70">{copy.done}</p>
          </StickyNote>
        )}

        {step === "session" && state?.status === "completed" && (
          <StickyNote seed="guest-results" className="space-y-5 p-5 sm:p-7">
            <div className="space-y-1 text-center">
              <h2 className="font-display text-2xl">{copy.results}</h2>
              <p className="text-sm font-bold opacity-60">{state.name}</p>
            </div>
            {state.results.length === 0 ? (
              <p className="text-center text-sm opacity-70">{copy.noResults}</p>
            ) : (
              <div className="space-y-4">
                {state.results.map((result) => (
                  <div key={result.strengthId} className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-11 w-11 shrink-0 rounded-full" style={{ background: getStrengthColor(result.strengthId) }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold">{getStrengthName(result.strengthId, lang)}</span>
                          <span className="font-mono text-xl font-black">×{result.count}</span>
                        </div>
                        <p className="mt-1 text-xs opacity-65">{copy.from}: {result.names.join(", ")}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round((result.count / resultMax) * 100)}%`, background: getStrengthColor(result.strengthId) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full rounded-full" onClick={startOver}>
              {copy.startOver}
            </Button>
          </StickyNote>
        )}

        <button
          type="button"
          className="mx-auto flex items-center gap-1 text-xs font-semibold opacity-40"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
            toast.success(copy.copied);
          }}
        >
          <Copy className="h-3 w-3" /> strengthportfolio.com/sprint/demo
        </button>
      </div>
    </div>
  );
}

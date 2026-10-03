import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { Copy, Clock3, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import { markFreeTrialEntry, recordFreeTrialEvent, saveFreeTrialIntent } from "@/lib/free-trial.functions";

type TrialState = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof markFreeTrialEntry>>>>;

const copy = {
  en: {
    days: (n: number) => `${n} days left in your free trial`,
    ended: "Your free trial has ended",
    endedBody: "Your school trial is now locked. Contact us to continue with Strength Portfolio. Your trial data is retained for 90 days so it can be restored if your school purchases.",
    contact: "Request contact",
    meeting: "Book a meeting",
    buy: "Get Strength Portfolio for your school",
    referralTitle: "Invite a teacher and both get 30 extra days",
    referralBody: "Share your personal referral code. Your 30-day bonus is added after the other teacher verifies their work email and enters the platform.",
    copied: "Referral link copied",
    referrals: "Extra trial days earned",
    intentTitle: "What are you mainly using Strength Portfolio for?",
    intentBody: "Choose one option to continue.",
    students: "Trying it with my students",
    evaluate: "Evaluating it for my school",
    explore: "Exploring the platform myself",
    recommend: "Planning to recommend it to school leadership",
    other: "Other",
    save: "Continue",
  },
  fi: {
    days: (n: number) => `Maksutonta kokeilua jäljellä ${n} päivää`,
    ended: "Maksuton kokeilusi on päättynyt",
    endedBody: "Koulun kokeilujakso on nyt lukittu. Ota yhteyttä jatkaaksesi Vahvuusportfolion käyttöä. Kokeilun tiedot säilytetään 90 päivää, jotta ne voidaan palauttaa, jos koulu hankkii palvelun.",
    contact: "Pyydä yhteydenottoa",
    meeting: "Varaa tapaaminen",
    buy: "Hanki Vahvuusportfolio koulullesi",
    referralTitle: "Kutsu opettaja – molemmat saavat 30 lisäpäivää",
    referralBody: "Jaa henkilökohtainen suosittelukoodisi. 30 lisäpäivää lisätään, kun toinen opettaja vahvistaa työsähköpostinsa ja kirjautuu palveluun.",
    copied: "Suosittelulinkki kopioitu",
    referrals: "Ansaitut lisäpäivät",
    intentTitle: "Mihin käytät Vahvuusportfoliota ensisijaisesti?",
    intentBody: "Valitse yksi vaihtoehto jatkaaksesi.",
    students: "Kokeilen sitä opiskelijoideni kanssa",
    evaluate: "Arvioin sitä koululleni",
    explore: "Tutustun alustaan itse",
    recommend: "Aion suositella sitä koulun johdolle",
    other: "Muu",
    save: "Jatka",
  },
  sv: {
    days: (n: number) => `${n} dagar kvar av din gratis provperiod`,
    ended: "Din gratis provperiod har avslutats",
    endedBody: "Skolans provperiod är nu låst. Kontakta oss för att fortsätta med Styrkeportfolio. Provperiodens data sparas i 90 dagar så att den kan återställas om skolan köper tjänsten.",
    contact: "Be om kontakt",
    meeting: "Boka ett möte",
    buy: "Skaffa Styrkeportfolio för din skola",
    referralTitle: "Bjud in en lärare – båda får 30 extra dagar",
    referralBody: "Dela din personliga rekommendationskod. Bonusen läggs till när den andra läraren bekräftar sin arbets-e-post och går in på plattformen.",
    copied: "Rekommendationslänk kopierad",
    referrals: "Intjänade extradagar",
    intentTitle: "Vad använder du främst Styrkeportfolio till?",
    intentBody: "Välj ett alternativ för att fortsätta.",
    students: "Provar det med mina elever",
    evaluate: "Utvärderar det för min skola",
    explore: "Utforskar plattformen själv",
    recommend: "Planerar att rekommendera det till skolledningen",
    other: "Annat",
    save: "Fortsätt",
  },
} as const;

export function TrialExperience() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const inStaffArea = pathname.startsWith("/teacher") || pathname.startsWith("/school-admin");
  const { language } = useLanguage();
  const text = copy[language];
  const markEntry = useServerFn(markFreeTrialEntry);
  const recordEvent = useServerFn(recordFreeTrialEvent);
  const saveIntent = useServerFn(saveFreeTrialIntent);
  const [trial, setTrial] = useState<any>(null);
  const [intent, setIntent] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    if (!inStaffArea || loaded.current) return;
    loaded.current = true;
    void markEntry({}).then((result) => {
      if (result.isTrial) setTrial(result);
    }).catch(() => undefined);
  }, [inStaffArea, markEntry]);

  const referralLink = useMemo(() => {
    if (!trial?.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/trial?ref=${trial.referralCode}`;
  }, [trial?.referralCode]);

  if (!inStaffArea || !trial) return null;

  const expired = trial.status !== "active" || trial.daysLeft <= 0;
  const requireIntent = trial.loginCount >= 3 && !trial.thirdLoginIntent;
  const showCountdown = !expired && trial.daysLeft <= 15;
  const referralEligible = trial.creatorRole === "teacher" && !!trial.referralCode && trial.loginCount >= 2;

  async function salesAction(eventName: "contact_requested" | "meeting_requested") {
    await recordEvent({ data: { eventName } });
    const subject = encodeURIComponent(eventName === "meeting_requested" ? "Strength Portfolio trial - meeting request" : "Strength Portfolio trial - contact request");
    window.location.href = `mailto:hello@strengthportfolio.com?subject=${subject}`;
  }

  async function submitIntent() {
    if (!intent) return;
    await saveIntent({ data: { intent } });
    setTrial((current: any) => ({ ...current, thirdLoginIntent: intent }));
  }

  if (expired) return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
      <StickyNote seed="trial-ended" className="max-w-xl space-y-5 text-center">
        <h1 className="text-4xl font-bold">{text.ended}</h1>
        <p className="opacity-80">{text.endedBody}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => void salesAction("meeting_requested")} className="rounded-full bg-[color:var(--purple)] text-white">{text.meeting}</Button>
          <Button onClick={() => void salesAction("contact_requested")} variant="outline" className="rounded-full">{text.contact}</Button>
        </div>
      </StickyNote>
    </div>
  );

  return <>
    {showCountdown && (
      <div className="fixed right-4 top-4 z-[80] flex items-center gap-2 rounded-full bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-[color:var(--purple)] shadow-lg">
        <Clock3 className="h-4 w-4" /> {text.days(trial.daysLeft)}
      </div>
    )}

    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2">
      {referralEligible && (
        <details className="max-w-sm rounded-3xl bg-white p-4 shadow-xl open:w-[min(92vw,24rem)]">
          <summary className="cursor-pointer list-none font-bold text-[color:var(--purple)]"><span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" />{text.referralTitle}</span></summary>
          <p className="mt-2 text-sm opacity-75">{text.referralBody}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/5 p-2"><code className="font-bold tracking-widest">{trial.referralCode}</code><button type="button" onClick={() => { void navigator.clipboard.writeText(referralLink); void recordEvent({ data: { eventName: "referral_link_copied" } }); toast.success(text.copied); }}><Copy className="h-4 w-4" /></button></div>
          <p className="mt-2 text-xs opacity-65">{text.referrals}: <strong>+{trial.referralBonusDays}</strong></p>
        </details>
      )}
      <details className="rounded-full bg-[color:var(--purple)] px-5 py-3 text-white shadow-xl open:rounded-3xl open:p-4">
        <summary className="cursor-pointer list-none font-bold">{text.buy}</summary>
        <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void salesAction("meeting_requested")} className="bg-white text-[color:var(--purple)] hover:bg-white/90">{text.meeting}</Button><Button size="sm" onClick={() => void salesAction("contact_requested")} variant="outline" className="border-white text-white hover:bg-white/10">{text.contact}</Button></div>
      </details>
    </div>

    {requireIntent && (
      <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
        <StickyNote seed="trial-third-login-intent" className="w-full max-w-xl space-y-4">
          <h2 className="text-2xl font-bold">{text.intentTitle}</h2><p className="text-sm opacity-70">{text.intentBody}</p>
          <div className="space-y-2">
            {[["students", text.students], ["evaluate_school", text.evaluate], ["explore", text.explore], ["recommend_leadership", text.recommend], ["other", text.other]].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3"><input type="radio" name="trial-intent" value={value} checked={intent === value} onChange={() => setIntent(value)} /><span>{label}</span></label>
            ))}
          </div>
          <Button disabled={!intent} onClick={() => void submitIntent()} className="w-full rounded-full bg-[color:var(--purple)] text-white">{text.save}</Button>
        </StickyNote>
      </div>
    )}
  </>;
}

import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import { confirmFreeTrialAuthorization } from "@/lib/free-trial.functions";
import { getFreeTrialAccessPolicy } from "@/lib/free-trial-access.functions";

const copy = {
  en: {
    authTitle: "Confirm school authorization before creating a class",
    authBody: "I confirm that I am authorized by my school to use Strength Portfolio with students and to process student information through the service.",
    confirm: "Confirm authorization",
    blockedTitle: "This school trial has ended",
    blockedBody: "Student access is unavailable because the school's free trial has ended. Your teacher or school can contact Strength Portfolio to continue.",
  },
  fi: {
    authTitle: "Vahvista koulun valtuutus ennen luokan luomista",
    authBody: "Vahvistan, että kouluni on valtuuttanut minut käyttämään Vahvuusportfoliota opiskelijoiden kanssa ja käsittelemään opiskelijatietoja palvelussa.",
    confirm: "Vahvista valtuutus",
    blockedTitle: "Koulun kokeilujakso on päättynyt",
    blockedBody: "Opiskelijan käyttö on estetty, koska koulun maksuton kokeilujakso on päättynyt. Opettaja tai koulu voi ottaa yhteyttä Vahvuusportfolioon jatkaakseen.",
  },
  sv: {
    authTitle: "Bekräfta skolans behörighet innan du skapar en klass",
    authBody: "Jag bekräftar att min skola har gett mig behörighet att använda Styrkeportfolio med elever och behandla elevinformation i tjänsten.",
    confirm: "Bekräfta behörighet",
    blockedTitle: "Skolans provperiod har avslutats",
    blockedBody: "Elevåtkomst är inte tillgänglig eftersom skolans gratis provperiod har avslutats. Läraren eller skolan kan kontakta Styrkeportfolio för att fortsätta.",
  },
} as const;

export function TrialAccessPolicy() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const relevant = pathname.startsWith("/teacher") || pathname.startsWith("/school-admin") || pathname.startsWith("/seikkailu") || pathname.startsWith("/student");
  const { language } = useLanguage();
  const text = copy[language];
  const getPolicy = useServerFn(getFreeTrialAccessPolicy);
  const confirm = useServerFn(confirmFreeTrialAuthorization);
  const [policy, setPolicy] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const loadedFor = useRef("");

  useEffect(() => {
    if (!relevant || loadedFor.current === pathname) return;
    loadedFor.current = pathname;
    void getPolicy().then(setPolicy).catch(() => undefined);
  }, [getPolicy, pathname, relevant]);

  if (!relevant || !policy) return null;

  if (policy.studentBlocked) {
    return (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
        <StickyNote seed="trial-student-expired" className="max-w-lg space-y-4 text-center">
          <h1 className="text-3xl font-bold">{text.blockedTitle}</h1>
          <p className="opacity-80">{text.blockedBody}</p>
        </StickyNote>
      </div>
    );
  }

  if (policy.isTrialUser && !policy.authorizationConfirmed) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[85] w-[min(94vw,42rem)] -translate-x-1/2 rounded-3xl bg-white p-4 text-black shadow-2xl">
        <h2 className="font-bold text-black">{text.authTitle}</h2>
        <label className="mt-2 flex items-start gap-2 text-sm text-black"><input className="mt-1" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span className="text-black">{text.authBody}</span></label>
        <Button disabled={!confirmed} className="mt-3 rounded-full bg-[color:var(--purple)] text-white" onClick={() => void confirm({}).then(() => setPolicy((current: any) => ({ ...current, authorizationConfirmed: true })))}>{text.confirm}</Button>
      </div>
    );
  }

  return null;
}

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, isLanguage } from "@/lib/i18n";
import { finalizeFreeTrialRegistration } from "@/lib/free-trial.functions";

export const Route = createFileRoute("/confirm-trial")({ component: ConfirmTrial });

const copy = {
  en: { title: "Activating your free trial…", body: "We are creating your school trial and opening Strength Portfolio.", errorTitle: "We could not activate the trial", retry: "Start again", login: "Sign in" },
  fi: { title: "Aktivoidaan maksutonta kokeilua…", body: "Luomme koulusi kokeilujakson ja avaamme Vahvuusportfolion.", errorTitle: "Kokeilua ei voitu aktivoida", retry: "Aloita uudelleen", login: "Kirjaudu sisään" },
  sv: { title: "Aktiverar din gratis provperiod…", body: "Vi skapar skolans provperiod och öppnar Styrkeportfolio.", errorTitle: "Provperioden kunde inte aktiveras", retry: "Börja om", login: "Logga in" },
} as const;

function ConfirmTrial() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];
  const finalize = useServerFn(finalizeFreeTrialRegistration);
  const finalizing = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const complete = useCallback(async () => {
    if (finalizing.current) return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) { setError(exchangeError.message); return; }
      window.history.replaceState({}, "", "/confirm-trial");
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    finalizing.current = true;
    try {
      const result = await finalize({});
      if (isLanguage(result.language)) setLanguage(result.language);
      window.location.replace(result.role === "school_admin" ? "/school-admin/dashboard" : "/teacher/dashboard");
    } catch (e) {
      finalizing.current = false;
      setError(e instanceof Error ? e.message : "Trial activation failed");
    }
  }, [finalize, setLanguage]);

  useEffect(() => {
    void complete();
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN") void complete(); });
    const timer = window.setTimeout(() => void complete(), 1800);
    return () => { data.subscription.unsubscribe(); window.clearTimeout(timer); };
  }, [complete]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <CornerBlobs /><AuthLanguageSwitcher />
      <StickyNote seed="confirm-free-trial" className="relative z-10 max-w-lg space-y-4 text-center">
        {error ? <>
          <h1 className="text-3xl font-bold">{text.errorTitle}</h1><p className="text-xs opacity-60">{error}</p>
          <div className="flex justify-center gap-2"><Button asChild><a href="/trial">{text.retry}</a></Button><Button asChild variant="outline"><a href="/auth/login">{text.login}</a></Button></div>
        </> : <><h1 className="text-3xl font-bold">{text.title}</h1><p className="opacity-80">{text.body}</p></>}
      </StickyNote>
    </div>
  );
}

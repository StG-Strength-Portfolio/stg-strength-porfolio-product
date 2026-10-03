import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, isLanguage } from "@/lib/i18n";
import { finalizeStaffRegistration } from "@/lib/staff-registration.functions";

export const Route = createFileRoute("/confirm-staff")({
  component: ConfirmStaff,
});

const copy = {
  fi: {
    title: "Vahvistetaan sähköpostia…",
    body: "Viimeistelemme henkilökunnan tilisi ja avaamme opettajan hallintapaneelin.",
    errorTitle: "Vahvistusta ei voitu viimeistellä",
    errorBody: "Vahvistuslinkki voi olla vanhentunut tai jo käytetty. Rekisteröidy uudelleen tai kirjaudu sisään, jos tilisi on jo vahvistettu.",
    register: "Rekisteröidy uudelleen",
    login: "Kirjaudu sisään",
  },
  en: {
    title: "Confirming your email…",
    body: "We are finishing your staff account and opening the Teacher Dashboard.",
    errorTitle: "We could not complete the confirmation",
    errorBody: "The confirmation link may have expired or already been used. Register again, or sign in if your account has already been confirmed.",
    register: "Register again",
    login: "Sign in",
  },
  sv: {
    title: "Bekräftar din e-post…",
    body: "Vi slutför ditt personalkonto och öppnar lärarpanelen.",
    errorTitle: "Bekräftelsen kunde inte slutföras",
    errorBody: "Bekräftelselänken kan ha gått ut eller redan använts. Registrera dig igen eller logga in om kontot redan är bekräftat.",
    register: "Registrera igen",
    login: "Logga in",
  },
} as const;

function ConfirmStaff() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];
  const finalize = useServerFn(finalizeStaffRegistration);
  const finalizing = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const complete = useCallback(async () => {
    if (finalizing.current) return;

    const url = new URL(window.location.href);
    const authCode = url.searchParams.get("code");
    if (authCode) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }
      window.history.replaceState({}, "", "/confirm-staff");
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    finalizing.current = true;
    try {
      const result = await finalize({});
      if (isLanguage(result.language)) setLanguage(result.language);
      window.location.replace("/teacher/dashboard");
    } catch (e) {
      finalizing.current = false;
      setError(e instanceof Error ? e.message : "Confirmation failed");
    }
  }, [finalize, setLanguage]);

  useEffect(() => {
    void complete();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void complete();
    });
    const timer = window.setTimeout(() => {
      void complete().then(() => {
        if (!finalizing.current) setError((current) => current ?? "No confirmed session was found");
      });
    }, 1800);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [complete]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md">
        <StickyNote seed="confirm-staff" className="space-y-4 text-center">
          {error ? (
            <>
              <h1 className="text-3xl font-bold">{text.errorTitle}</h1>
              <p className="text-sm opacity-80">{text.errorBody}</p>
              <p className="break-words text-xs opacity-50">{error}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild className="rounded-full bg-[color:var(--purple)] text-white">
                  <a href="/register-staff">{text.register}</a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href="/auth/login">{text.login}</a>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{text.title}</h1>
              <p className="opacity-80">{text.body}</p>
            </>
          )}
        </StickyNote>
      </div>
    </div>
  );
}

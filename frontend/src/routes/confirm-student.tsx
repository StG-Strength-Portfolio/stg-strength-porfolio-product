import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getStudentClassMembership } from "@/lib/auth-helpers";
import { useLanguage, isLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/confirm-student")({
  component: ConfirmStudent,
});

const copy = {
  fi: {
    title: "Vahvistetaan sähköpostia…",
    body: "Viimeistelemme tilisi ja avaamme palvelun.",
    errorTitle: "Vahvistusta ei voitu viimeistellä",
    errorBody:
      "Vahvistuslinkki voi olla vanhentunut tai jo käytetty. Rekisteröidy uudelleen tai kirjaudu sisään, jos tilisi on jo vahvistettu.",
    classErrorTitle: "Sähköposti on vahvistettu",
    classErrorBody:
      "Tili on valmis, mutta luokkaan liittymistä ei voitu viimeistellä automaattisesti. Jatka syöttämään luokan koodi.",
    joinClass: "Jatka luokan koodiin",
    register: "Rekisteröidy uudelleen",
    login: "Kirjaudu sisään",
  },
  en: {
    title: "Confirming your email…",
    body: "We are finishing your account and opening the platform.",
    errorTitle: "We could not complete the confirmation",
    errorBody:
      "The confirmation link may have expired or already been used. Register again, or sign in if your account has already been confirmed.",
    classErrorTitle: "Your email is confirmed",
    classErrorBody:
      "Your account is ready, but we could not join your class automatically. Continue to enter your class code.",
    joinClass: "Continue to class code",
    register: "Register again",
    login: "Sign in",
  },
  sv: {
    title: "Bekräftar din e-post…",
    body: "Vi slutför ditt konto och öppnar tjänsten.",
    errorTitle: "Bekräftelsen kunde inte slutföras",
    errorBody:
      "Bekräftelselänken kan ha gått ut eller redan använts. Registrera dig igen eller logga in om kontot redan är bekräftat.",
    classErrorTitle: "Din e-post är bekräftad",
    classErrorBody:
      "Ditt konto är klart, men vi kunde inte ansluta dig till klassen automatiskt. Fortsätt för att ange klasskoden.",
    joinClass: "Fortsätt till klasskoden",
    register: "Registrera igen",
    login: "Logga in",
  },
} as const;

type ErrorKind = "confirmation" | "class";

function ConfirmStudent() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];
  const finalizing = useRef(false);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const complete = useCallback(async () => {
    if (finalizing.current) return;

    const url = new URL(window.location.href);
    const authCode = url.searchParams.get("code");
    if (authCode) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
      if (exchangeError) {
        setErrorKind("confirmation");
        return;
      }
      window.history.replaceState({}, "", "/confirm-student");
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    finalizing.current = true;
    const user = data.session.user;
    const metadata = user.user_metadata as Record<string, unknown>;
    const registrationLanguage = metadata.registration_language;
    if (isLanguage(registrationLanguage)) setLanguage(registrationLanguage);

    const displayName =
      typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";
    const pendingJoinCode =
      typeof metadata.pending_join_code === "string"
        ? metadata.pending_join_code.trim().toUpperCase()
        : "";

    try {
      if (displayName) {
        const { error: profileError } = await supabase
          .from("profiles" as never)
          .upsert({ id: user.id, display_name: displayName } as never);
        if (profileError) console.error("[confirm-student-profile]", profileError);
      }

      if (!pendingJoinCode) {
        const membership = await getStudentClassMembership();
        if (membership) {
          window.location.replace("/seikkailu");
          return;
        }
        setErrorKind("class");
        return;
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "join_class" as never,
        { p_join_code: pendingJoinCode } as never,
      );
      if (rpcError) throw rpcError;

      const result = rpcData as {
        ok?: boolean;
        error?: string;
        language?: string;
      } | null;

      if (!result?.ok) {
        const membership = await getStudentClassMembership();
        if (membership) {
          window.location.replace("/seikkailu");
          return;
        }
        setErrorKind("class");
        return;
      }

      if (isLanguage(result.language)) setLanguage(result.language);
      window.location.replace("/seikkailu");
    } catch (error) {
      console.error("[confirm-student]", error);
      const membership = await getStudentClassMembership().catch(() => null);
      if (membership) {
        window.location.replace("/seikkailu");
        return;
      }
      setErrorKind("class");
    }
  }, [setLanguage]);

  useEffect(() => {
    void complete();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void complete();
    });
    const timer = window.setTimeout(() => {
      void complete().then(() => {
        if (!finalizing.current) setErrorKind((current) => current ?? "confirmation");
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
        <StickyNote seed="confirm-student" className="space-y-4 text-center">
          {errorKind === "confirmation" ? (
            <>
              <h1 className="text-3xl font-bold">{text.errorTitle}</h1>
              <p className="text-sm opacity-80">{text.errorBody}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild className="rounded-full bg-[color:var(--purple)] text-white">
                  <a href="/auth/student">{text.register}</a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href="/auth/login">{text.login}</a>
                </Button>
              </div>
            </>
          ) : errorKind === "class" ? (
            <>
              <h1 className="text-3xl font-bold">{text.classErrorTitle}</h1>
              <p className="text-sm opacity-80">{text.classErrorBody}</p>
              <Button asChild className="rounded-full bg-[color:var(--purple)] text-white">
                <a href="/liity-yhteisoon">{text.joinClass}</a>
              </Button>
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

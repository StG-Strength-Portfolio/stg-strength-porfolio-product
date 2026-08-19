import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { z } from "zod";

const RECOVERY_WAIT_MS = 4000;

const RESET_COPY = {
  fi: {
    title: "Salasanan palautus",
    checking: "Tarkistetaan palautuslinkkiä…",
    invalid: "Palautuslinkki on vanhentunut tai jo käytetty.",
    requestNew: "Pyydä uusi palautuslinkki",
    done: "Salasana vaihdettu! Voit nyt kirjautua sisään.",
    login: "Kirjaudu sisään",
    newPassword: "Uusi salasana",
    confirmPassword: "Vahvista salasana",
    save: "Tallenna",
    saving: "Tallennetaan…",
    passwordShort: "Salasanan tulee olla vähintään 6 merkkiä.",
    passwordMismatch: "Salasanat eivät täsmää.",
    genericError: "Salasanan vaihtaminen epäonnistui. Yritä uudelleen.",
    browserTitle: "Salasanan palautus — Vahvuusportfolio",
    description: "Aseta uusi salasana Vahvuusportfolio-tilillesi.",
  },
  en: {
    title: "Password Reset",
    checking: "Checking the reset link…",
    invalid: "The reset link has expired or has already been used.",
    requestNew: "Request a new reset link",
    done: "Password changed successfully! You can now log in.",
    login: "Log in",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    save: "Save",
    saving: "Saving…",
    passwordShort: "Password must be at least 6 characters.",
    passwordMismatch: "Passwords do not match.",
    genericError: "The password could not be changed. Please try again.",
    browserTitle: "Password Reset — Strength Portfolio",
    description: "Set a new password for your Strength Portfolio account.",
  },
  sv: {
    title: "Återställ lösenord",
    checking: "Kontrollerar återställningslänken…",
    invalid: "Återställningslänken har gått ut eller har redan använts.",
    requestNew: "Begär en ny återställningslänk",
    done: "Lösenordet har ändrats! Du kan nu logga in.",
    login: "Logga in",
    newPassword: "Nytt lösenord",
    confirmPassword: "Bekräfta lösenord",
    save: "Spara",
    saving: "Sparar…",
    passwordShort: "Lösenordet måste innehålla minst 6 tecken.",
    passwordMismatch: "Lösenorden matchar inte.",
    genericError: "Lösenordet kunde inte ändras. Försök igen.",
    browserTitle: "Återställ lösenord — Styrkeportfolio",
    description: "Ange ett nytt lösenord för ditt Styrkeportfolio-konto.",
  },
} as const;

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Password Reset — Strength Portfolio" },
      { name: "description", content: "Set a new password for your Strength Portfolio account." },
      { property: "og:title", content: "Password Reset — Strength Portfolio" },
      {
        property: "og:description",
        content: "Set a new password for your Strength Portfolio account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) =>
    z
      .object({
        source: z
          .string()
          .optional()
          .transform((v) => (v === "superadmin" ? ("superadmin" as const) : undefined)),
      })
      .parse(search),
  ssr: false,
  component: ResetPasswordPage,
});

type SessionState = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const { language } = useLanguage();
  const copy = RESET_COPY[language];
  const navigate = useNavigate();
  const { source } = Route.useSearch();

  const [detectedSuperAdmin, setDetectedSuperAdmin] = useState(source === "superadmin");
  const isSuperAdmin = source === "superadmin" || detectedSuperAdmin;
  const loginTo = isSuperAdmin ? "/superadmin/login" : "/auth/login";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  useEffect(() => {
    document.title = copy.browserTitle;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = copy.description;
  }, [copy.browserTitle, copy.description]);

  const acceptSession = useMemo(
    () =>
      async (session: { user: { id: string } } | null) => {
        if (!session) return;
        setSessionState("ready");

        if (source !== "superadmin") {
          const { data } = await supabase
            .from("user_roles" as never)
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "super_admin")
            .maybeSingle();
          if ((data as { role?: string } | null)?.role === "super_admin") {
            setDetectedSuperAdmin(true);
          }
        }
      },
    [source],
  );

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) void acceptSession(session);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void acceptSession(data.session);
    });

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setSessionState((prev) => (prev === "ready" ? prev : "invalid"));
      }
    }, RECOVERY_WAIT_MS);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [acceptSession]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(copy.passwordShort);
      return;
    }
    if (password !== confirm) {
      toast.error(copy.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("expired") || m.includes("invalid") || m.includes("session")) {
          setSessionState("invalid");
          toast.error(copy.invalid);
        } else if (m.includes("weak") || m.includes("password") || m.includes("short")) {
          toast.error(copy.passwordShort);
        } else {
          toast.error(copy.genericError);
        }
        return;
      }
      setDone(true);
      toast.success(copy.done);
      setTimeout(() => {
        void navigate({ to: loginTo, replace: true });
      }, 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <h1 className="text-center text-3xl font-bold">{copy.title}</h1>
        <StickyNote seed="reset-card">
          {sessionState === "checking" ? (
            <p className="text-center font-semibold opacity-70">{copy.checking}</p>
          ) : sessionState === "invalid" ? (
            <div className="space-y-4 text-center">
              <p className="font-semibold">{copy.invalid}</p>
              <Link
                to={loginTo}
                className="inline-block rounded-full bg-[color:var(--purple)] px-5 py-2 text-sm font-bold text-white"
              >
                {copy.requestNew}
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <p className="font-semibold">{copy.done}</p>
              <Link
                to={loginTo}
                className="inline-block rounded-full bg-[color:var(--purple)] px-5 py-2 text-sm font-bold text-white"
              >
                {copy.login}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{copy.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{copy.confirmPassword}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-auto w-full rounded-full bg-[color:var(--purple)] py-6 text-base font-bold text-white hover:bg-[color:var(--purple)]/90"
              >
                {busy ? copy.saving : copy.save}
              </Button>
            </form>
          )}
        </StickyNote>
      </div>
    </div>
  );
}
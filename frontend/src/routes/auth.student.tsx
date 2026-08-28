import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { toast } from "sonner";
import { useT, useLanguage, isLanguage } from "@/lib/i18n";
import { isStrongPassword, passwordPolicyMessage } from "@/lib/password-policy";

export const Route = createFileRoute("/auth/student")({
  component: StudentSignup,
});

const confirmationCopy = {
  fi: {
    title: "Vahvista sähköpostiosoitteesi",
    sentBody: "Lähetimme vahvistuslinkin osoitteeseen",
    sentHint:
      "Avaa sähköposti ja napsauta vahvistuslinkkiä. Sen jälkeen pääset automaattisesti suoraan palveluun.",
    resend: "Lähetä vahvistusviesti uudelleen",
    resending: "Lähetetään…",
    resent: "Uusi vahvistusviesti lähetettiin.",
    resendError: "Vahvistusviestiä ei voitu lähettää uudelleen.",
    login: "Takaisin kirjautumiseen",
  },
  en: {
    title: "Confirm your email address",
    sentBody: "We sent a confirmation link to",
    sentHint:
      "Open the email and click the confirmation link. You will then enter the platform automatically.",
    resend: "Resend confirmation email",
    resending: "Sending…",
    resent: "A new confirmation email was sent.",
    resendError: "We could not resend the confirmation email.",
    login: "Back to login",
  },
  sv: {
    title: "Bekräfta din e-postadress",
    sentBody: "Vi skickade en bekräftelselänk till",
    sentHint:
      "Öppna e-postmeddelandet och klicka på bekräftelselänken. Därefter kommer du automatiskt direkt in i tjänsten.",
    resend: "Skicka bekräftelsemejlet igen",
    resending: "Skickar…",
    resent: "Ett nytt bekräftelsemejl har skickats.",
    resendError: "Bekräftelsemejlet kunde inte skickas igen.",
    login: "Tillbaka till inloggningen",
  },
} as const;

function StudentSignup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const confirmation = confirmationCopy[language];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/seikkailu", replace: true });
    });
  }, [navigate]);

  async function finishStudentSetup(code: string, name: string) {
    const { data: u, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!u.user) throw new Error("No authenticated user");

    const { error: profileErr } = await supabase
      .from("profiles" as never)
      .upsert({ id: u.user.id, display_name: name } as never);
    if (profileErr) console.error("Failed to save display name:", profileErr);

    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "join_class" as never,
      { p_join_code: code } as never,
    );
    if (rpcErr) throw rpcErr;

    const result = rpcData as { ok?: boolean; error?: string; language?: string } | null;
    if (!result?.ok) {
      toast.error(t("auth.student.err.codeInvalid"));
      navigate({ to: "/liity-yhteisoon", replace: true });
      return;
    }

    if (isLanguage(result.language)) setLanguage(result.language);
    navigate({ to: "/seikkailu", replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const code = joinCode.trim().toUpperCase();
    const name = displayName.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error(t("auth.student.err.emailInvalid"));
      return;
    }
    if (!isStrongPassword(password)) {
      toast.error(passwordPolicyMessage(language));
      return;
    }
    if (!name) {
      toast.error(t("auth.student.err.nameMissing"));
      return;
    }
    if (!code) {
      toast.error(t("auth.student.err.codeMissing"));
      return;
    }
    setBusy(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-student`,
          data: {
            display_name: name,
            registration_type: "student",
            pending_join_code: code,
            registration_language: language,
          },
        },
      });
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase();
        toast.error(msg.includes("already registered") ? t("auth.student.err.emailTaken") : signUpErr.message);
        return;
      }

      // If email confirmation is disabled in a non-production environment,
      // preserve the same end result and enter the platform immediately.
      if (signUpData.session) {
        await finishStudentSetup(code, name);
        return;
      }

      // Production requires email confirmation. Do not attempt a password sign-in
      // here: that only produces the confusing Supabase "Email not confirmed" error.
      setSentTo(normalizedEmail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!sentTo || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sentTo,
        options: { emailRedirectTo: `${window.location.origin}/confirm-student` },
      });
      if (error) throw error;
      toast.success(confirmation.resent);
    } catch (error) {
      console.error("[student-registration-resend]", error);
      toast.error(confirmation.resendError);
    } finally {
      setResending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
        <CornerBlobs />
        <AuthLanguageSwitcher />
        <div className="relative z-10 w-full max-w-md">
          <StickyNote seed="student-confirmation-sent" className="space-y-4 text-center">
            <h1 className="text-3xl font-bold">{confirmation.title}</h1>
            <p>
              {confirmation.sentBody} <strong>{sentTo}</strong>.
            </p>
            <p className="text-sm opacity-75">{confirmation.sentHint}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                disabled={resending}
                onClick={() => void resendConfirmation()}
                className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
              >
                {resending ? confirmation.resending : confirmation.resend}
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/auth/login">{confirmation.login}</Link>
              </Button>
            </div>
          </StickyNote>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{t("auth.student.title")}</h1>
          <p className="mt-2 opacity-90">{t("auth.student.subtitle")}</p>
        </div>

        <StickyNote seed="student-signup-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.student.emailPh")}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("common.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.student.passwordPh")}
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">{passwordPolicyMessage(language)}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">{t("auth.student.nameLabel")}</Label>
              <Input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.student.namePh")}
                autoComplete="name"
              />
              <p className="text-sm text-muted-foreground">{t("auth.student.nameHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">{t("auth.student.codeLabel")}</Label>
              <Input
                id="code"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t("auth.student.codePh")}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 text-base"
            >
              {busy ? t("auth.login.busy") : t("auth.student.submit")}
            </Button>
          </form>

          <div className="mt-5 flex justify-between text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-[color:var(--purple)] underline">
              {t("common.back")}
            </Link>
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">
              {t("common.login")}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}
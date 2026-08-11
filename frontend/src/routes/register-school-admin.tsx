import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { validateSchoolAdminCode } from "@/lib/school-admin-invitations.functions";

export const Route = createFileRoute("/register-school-admin")({
  component: RegisterSchoolAdmin,
});

const copy = {
  fi: {
    title: "Luo koulun admin-tili",
    subtitle: "Rekisteröidy koulusi ylläpitäjäksi superadminilta saamallasi kutsukoodilla.",
    name: "Nimi",
    email: "Sähköposti",
    password: "Salasana",
    code: "Koulun admin-koodi",
    codeHint: "Koodi alkaa muodossa ADMIN- ja on kertakäyttöinen.",
    submit: "Rekisteröidy koulun adminiksi",
    busy: "Rekisteröidään…",
    invalidCode: "Koulun admin-koodi ei ole voimassa tai se on jo käytetty.",
    emailInvalid: "Tarkista sähköpostiosoite.",
    passwordWeak: "Salasanan tulee olla vähintään 8 merkkiä.",
    nameMissing: "Anna nimesi.",
    back: "Takaisin",
  },
  en: {
    title: "Create school admin account",
    subtitle: "Register as your school's administrator with the invitation code from your super admin.",
    name: "Name",
    email: "Email",
    password: "Password",
    code: "School admin code",
    codeHint: "The code starts with ADMIN- and can only be used once.",
    submit: "Register as school admin",
    busy: "Registering…",
    invalidCode: "This school admin code is invalid, expired, revoked, or already used.",
    emailInvalid: "Check the email address.",
    passwordWeak: "Password must be at least 8 characters.",
    nameMissing: "Enter your name.",
    back: "Back",
  },
  sv: {
    title: "Skapa konto för skoladministratör",
    subtitle: "Registrera dig som skolans administratör med inbjudningskoden från superadministratören.",
    name: "Namn",
    email: "E-post",
    password: "Lösenord",
    code: "Kod för skoladministratör",
    codeHint: "Koden börjar med ADMIN- och kan bara användas en gång.",
    submit: "Registrera som skoladministratör",
    busy: "Registrerar…",
    invalidCode: "Koden för skoladministratör är ogiltig, spärrad eller redan använd.",
    emailInvalid: "Kontrollera e-postadressen.",
    passwordWeak: "Lösenordet måste innehålla minst 8 tecken.",
    nameMissing: "Ange ditt namn.",
    back: "Tillbaka",
  },
} as const;

function RegisterSchoolAdmin() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const text = copy[language];
  const validateCode = useServerFn(validateSchoolAdminCode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const fullName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!fullName) {
      toast.error(text.nameMissing);
      return;
    }
    if (!normalizedEmail.includes("@")) {
      toast.error(text.emailInvalid);
      return;
    }
    if (password.length < 8) {
      toast.error(text.passwordWeak);
      return;
    }

    setBusy(true);
    try {
      const invitation = await validateCode({ data: { code: normalizedCode } });
      if (!invitation.valid) {
        toast.error(text.invalidCode);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: fullName, name: fullName, role: "school_admin" },
        },
      });
      if (signUpError) throw signUpError;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Authentication failed");

      const { error: profileError } = await supabase.from("profiles" as never).upsert({
        id: userData.user.id,
        display_name: fullName,
        language,
      } as never);
      if (profileError) throw profileError;

      const { data: resultData, error: claimError } = await supabase.rpc(
        "register_school_admin_with_code" as never,
        { p_code: normalizedCode } as never,
      );
      if (claimError) throw claimError;

      const result = resultData as { ok?: boolean; error?: string } | null;
      if (!result?.ok) {
        toast.error(text.invalidCode);
        await supabase.auth.signOut();
        return;
      }

      navigate({ to: "/school-admin/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{text.title}</h1>
          <p className="mt-2 opacity-90">{text.subtitle}</p>
        </div>

        <StickyNote seed="school-admin-register-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="school-admin-name">{text.name}</Label>
              <Input
                id="school-admin-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="school-admin-email">{text.email}</Label>
              <Input
                id="school-admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="school-admin-password">{text.password}</Label>
              <Input
                id="school-admin-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="school-admin-code">{text.code}</Label>
              <Input
                id="school-admin-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ADMIN-0123456789ABCDEFABCD"
                className="uppercase tracking-wider"
                autoComplete="off"
              />
              <p className="text-sm text-muted-foreground">{text.codeHint}</p>
            </div>

            <Button
              type="submit"
              disabled={busy || !code.trim()}
              className="h-auto w-full rounded-full bg-[color:var(--coral)] py-6 text-base font-bold text-white hover:bg-[color:var(--coral)]/90"
            >
              {busy ? text.busy : text.submit}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">
              {text.back}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}

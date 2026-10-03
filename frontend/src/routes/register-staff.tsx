import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { registerStaffAccount } from "@/lib/staff-registration.functions";

export const Route = createFileRoute("/register-staff")({
  component: RegisterStaff,
});

const copy = {
  fi: {
    title: "Luo henkilökunnan tili",
    subtitle: "Rekisteröidy koulusi henkilökunnan yhteisellä koodilla.",
    name: "Nimi",
    email: "Työsähköposti",
    password: "Salasana",
    code: "Henkilökunnan koodi",
    codeHint: "Syötä koulultasi saamasi 8-merkkinen henkilökunnan koodi.",
    passwordHint: "Vähintään 8 merkkiä sekä vähintään yksi kirjain, numero ja erikoismerkki.",
    submit: "Luo henkilökunnan tili",
    busy: "Luodaan tiliä…",
    nameError: "Anna nimesi.",
    workEmailError: "Käytä koulun tai työpaikan sähköpostiosoitetta. Henkilökohtaisia sähköposteja ei hyväksytä.",
    passwordError: "Salasanassa pitää olla vähintään 8 merkkiä, yksi kirjain, yksi numero ja yksi erikoismerkki.",
    codeError: "Henkilökunnan koodi ei ole voimassa. Tarkista koodi tai pyydä koulultasi uusi koodi.",
    expiredError: "Henkilökunnan koodi on vanhentunut. Pyydä koulultasi uusi koodi.",
    schoolError: "Koulu ei ole tällä hetkellä aktiivinen.",
    emailUsed: "Tämä sähköpostiosoite on jo käytössä. Kirjaudu sisään olemassa olevalla tilillä.",
    login: "Kirjaudu sisään",
    back: "Takaisin",
    sentTitle: "Vahvista sähköpostiosoitteesi",
    sentBody: "Lähetimme vahvistuslinkin osoitteeseen",
    sentHint: "Avaa sähköposti ja napsauta vahvistuslinkkiä. Sen jälkeen pääset suoraan opettajan hallintapaneeliin.",
  },
  en: {
    title: "Create staff account",
    subtitle: "Register with your school's shared staff code.",
    name: "Full name",
    email: "Work email",
    password: "Password",
    code: "Staff code",
    codeHint: "Enter the 8-character staff code provided by your school.",
    passwordHint: "At least 8 characters with at least one letter, one number and one special character.",
    submit: "Create staff account",
    busy: "Creating account…",
    nameError: "Enter your name.",
    workEmailError: "Use your school or work email address. Personal email providers are not accepted.",
    passwordError: "Password must be at least 8 characters and include a letter, number and special character.",
    codeError: "This staff code is not valid. Check the code or ask your school for a new one.",
    expiredError: "This staff code has expired. Ask your school for a new code.",
    schoolError: "This school is not currently active.",
    emailUsed: "This email address is already in use. Sign in with your existing account.",
    login: "Sign in",
    back: "Back",
    sentTitle: "Confirm your email address",
    sentBody: "We sent a confirmation link to",
    sentHint: "Open the email and click the confirmation link. You will then go directly to the Teacher Dashboard.",
  },
  sv: {
    title: "Skapa personalkonto",
    subtitle: "Registrera dig med skolans gemensamma personalkod.",
    name: "Fullständigt namn",
    email: "Arbets-e-post",
    password: "Lösenord",
    code: "Personalkod",
    codeHint: "Ange den 8 tecken långa personalkoden som du fått av skolan.",
    passwordHint: "Minst 8 tecken med minst en bokstav, en siffra och ett specialtecken.",
    submit: "Skapa personalkonto",
    busy: "Skapar konto…",
    nameError: "Ange ditt namn.",
    workEmailError: "Använd skolans eller arbetsplatsens e-postadress. Personliga e-posttjänster godkänns inte.",
    passwordError: "Lösenordet måste ha minst 8 tecken och innehålla en bokstav, en siffra och ett specialtecken.",
    codeError: "Personalkoden är inte giltig. Kontrollera koden eller be skolan om en ny.",
    expiredError: "Personalkoden har gått ut. Be skolan om en ny kod.",
    schoolError: "Skolan är inte aktiv just nu.",
    emailUsed: "Den här e-postadressen används redan. Logga in med ditt befintliga konto.",
    login: "Logga in",
    back: "Tillbaka",
    sentTitle: "Bekräfta din e-postadress",
    sentBody: "Vi skickade en bekräftelselänk till",
    sentHint: "Öppna e-postmeddelandet och klicka på bekräftelselänken. Därefter går du direkt till lärarpanelen.",
  },
} as const;

function RegisterStaff() {
  const { language } = useLanguage();
  const text = copy[language];
  const register = useServerFn(registerStaffAccount);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await register({ data: { name, email: normalizedEmail, password, code, language } });
      if (!result.ok) {
        const messages = {
          name: text.nameError,
          work_email: text.workEmailError,
          password: text.passwordError,
          code: text.codeError,
          expired: text.expiredError,
          school: text.schoolError,
          email_used: text.emailUsed,
        } as const;
        toast.error(messages[result.error]);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-staff`,
          data: {
            display_name: name.trim(),
            name: name.trim(),
            registration_type: "staff",
            pending_staff_token: result.pendingToken,
          },
        },
      });
      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (message.includes("already") || message.includes("registered")) toast.error(text.emailUsed);
        else toast.error(signUpError.message);
        return;
      }

      // Access is intentionally withheld until the confirmation link is used.
      await supabase.auth.signOut();
      setSentTo(normalizedEmail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
        <CornerBlobs />
        <AuthLanguageSwitcher />
        <div className="relative z-10 w-full max-w-md">
          <StickyNote seed="staff-confirmation-sent" className="space-y-4 text-center">
            <h1 className="text-3xl font-bold">{text.sentTitle}</h1>
            <p>{text.sentBody} <strong>{sentTo}</strong>.</p>
            <p className="text-sm opacity-75">{text.sentHint}</p>
            <Link to="/auth/login" className="inline-block font-semibold text-[color:var(--purple)] underline">
              {text.login}
            </Link>
          </StickyNote>
        </div>
      </div>
    );
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

        <StickyNote seed="staff-register-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">{text.name}</Label>
              <Input id="staff-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">{text.email}</Label>
              <Input id="staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="firstname.lastname@school.fi" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password">{text.password}</Label>
              <Input id="staff-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <p className="text-sm text-muted-foreground">{text.passwordHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-code">{text.code}</Label>
              <Input id="staff-code" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="K7PM4Q2X" className="font-mono uppercase tracking-[0.18em]" autoComplete="off" />
              <p className="text-sm text-muted-foreground">{text.codeHint}</p>
            </div>
            <Button type="submit" disabled={busy} className="h-auto w-full rounded-full bg-[color:var(--coral)] py-6 text-base font-bold text-white hover:bg-[color:var(--coral)]/90">
              {busy ? text.busy : text.submit}
            </Button>
          </form>

          <div className="mt-5 flex justify-between text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-[color:var(--purple)] underline">{text.back}</Link>
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">{text.login}</Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}

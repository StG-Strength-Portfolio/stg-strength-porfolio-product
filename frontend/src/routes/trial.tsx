import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { registerFreeTrial } from "@/lib/free-trial.functions";

export const Route = createFileRoute("/trial")({ component: TrialPage });

const copy = {
  en: {
    eyebrow: "Strength Portfolio for schools",
    title: "Try Strength Portfolio free for 30 days",
    subtitle: "Explore the full platform with your school, create classes and invite students using the same classroom flow as a paid school.",
    promise: "Free for 30 days · No credit card required",
    start: "Start free trial",
    benefit1: "Full Strength Portfolio platform",
    benefit2: "Create classes and invite students",
    benefit3: "For teachers and school leaders",
    formTitle: "Create your school trial",
    name: "Full name",
    email: "Work email",
    password: "Password",
    school: "School name",
    city: "City",
    country: "Country",
    role: "Role",
    teacher: "Teacher",
    admin: "Principal or School Admin",
    passwordHint: "At least 8 characters with a letter, number and special character.",
    terms: "I accept the Terms of Service",
    privacy: "I have read the Privacy Notice",
    marketing: "Send me product tips and marketing updates (optional)",
    submit: "Create free trial",
    busy: "Creating trial…",
    sentTitle: "Confirm your work email",
    sentBody: "We sent a confirmation link to",
    sentHint: "Open the email and confirm your address to activate your school trial.",
    workEmail: "Use a school or work email address. Personal email providers are not accepted.",
    used: "This email already has an account. Sign in instead of creating a free trial.",
    referral: "This referral code is not active.",
    required: "Complete all required fields.",
  },
  fi: {
    eyebrow: "Vahvuusportfolio kouluille",
    title: "Kokeile Vahvuusportfoliota maksutta 30 päivää",
    subtitle: "Tutustu koko palveluun koulusi kanssa, luo luokkia ja kutsu opiskelijoita samalla tavalla kuin maksullisessa koulutilissä.",
    promise: "30 päivää maksutta · Ei luottokorttia",
    start: "Aloita maksuton kokeilu",
    benefit1: "Koko Vahvuusportfolio käytössä",
    benefit2: "Luo luokkia ja kutsu opiskelijoita",
    benefit3: "Opettajille ja koulun johdolle",
    formTitle: "Luo koulusi kokeilujakso",
    name: "Koko nimi",
    email: "Työsähköposti",
    password: "Salasana",
    school: "Koulun nimi",
    city: "Kaupunki",
    country: "Maa",
    role: "Rooli",
    teacher: "Opettaja",
    admin: "Rehtori tai koulun ylläpitäjä",
    passwordHint: "Vähintään 8 merkkiä sekä kirjain, numero ja erikoismerkki.",
    terms: "Hyväksyn käyttöehdot",
    privacy: "Olen lukenut tietosuojailmoituksen",
    marketing: "Haluan tuotevinkkejä ja markkinointiviestejä (valinnainen)",
    submit: "Luo maksuton kokeilu",
    busy: "Luodaan kokeilua…",
    sentTitle: "Vahvista työsähköpostisi",
    sentBody: "Lähetimme vahvistuslinkin osoitteeseen",
    sentHint: "Avaa sähköposti ja vahvista osoitteesi aktivoidaksesi koulun kokeilujakson.",
    workEmail: "Käytä koulun tai työpaikan sähköpostiosoitetta. Henkilökohtaisia sähköposteja ei hyväksytä.",
    used: "Tällä sähköpostilla on jo tili. Kirjaudu sisään uuden kokeilun sijaan.",
    referral: "Tämä suosittelukoodi ei ole aktiivinen.",
    required: "Täytä kaikki pakolliset kentät.",
  },
  sv: {
    eyebrow: "Styrkeportfolio för skolor",
    title: "Prova Styrkeportfolio gratis i 30 dagar",
    subtitle: "Utforska hela plattformen med din skola, skapa klasser och bjud in elever med samma flöde som i en betald skollicens.",
    promise: "Gratis i 30 dagar · Inget kreditkort krävs",
    start: "Starta gratis provperiod",
    benefit1: "Hela Styrkeportfolio-plattformen",
    benefit2: "Skapa klasser och bjud in elever",
    benefit3: "För lärare och skolledare",
    formTitle: "Skapa skolans provperiod",
    name: "Fullständigt namn",
    email: "Arbets-e-post",
    password: "Lösenord",
    school: "Skolans namn",
    city: "Stad",
    country: "Land",
    role: "Roll",
    teacher: "Lärare",
    admin: "Rektor eller skoladministratör",
    passwordHint: "Minst 8 tecken med en bokstav, en siffra och ett specialtecken.",
    terms: "Jag godkänner användarvillkoren",
    privacy: "Jag har läst integritetsmeddelandet",
    marketing: "Skicka produktips och marknadsföringsuppdateringar (valfritt)",
    submit: "Skapa gratis provperiod",
    busy: "Skapar provperiod…",
    sentTitle: "Bekräfta din arbets-e-post",
    sentBody: "Vi skickade en bekräftelselänk till",
    sentHint: "Öppna e-postmeddelandet och bekräfta adressen för att aktivera skolans provperiod.",
    workEmail: "Använd skolans eller arbetsplatsens e-postadress. Personliga e-posttjänster godkänns inte.",
    used: "Den här e-postadressen har redan ett konto. Logga in i stället för att skapa en provperiod.",
    referral: "Den här rekommendationskoden är inte aktiv.",
    required: "Fyll i alla obligatoriska fält.",
  },
} as const;

function TrialPage() {
  const { language } = useLanguage();
  const text = copy[language];
  const register = useServerFn(registerFreeTrial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolName: "", city: "", country: "", role: "teacher" as "teacher" | "school_admin", terms: false, privacy: false, marketing: false });
  const params = useMemo(() => typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search), []);
  const referralCode = params.get("ref")?.trim().toUpperCase() || undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.schoolName.trim() || !form.city.trim() || !form.country.trim() || !form.terms || !form.privacy) {
      toast.error(text.required);
      return;
    }
    setBusy(true);
    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const result = await register({ data: {
        name: form.name,
        email: normalizedEmail,
        password: form.password,
        schoolName: form.schoolName,
        city: form.city,
        country: form.country,
        role: form.role,
        language,
        referralCode,
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        utmContent: params.get("utm_content") ?? undefined,
        utmTerm: params.get("utm_term") ?? undefined,
        marketingConsent: form.marketing,
      } });
      if (!result.ok) {
        toast.error(result.error === "work_email" ? text.workEmail : result.error === "email_used" ? text.used : result.error === "referral" ? text.referral : result.error === "password" ? text.passwordHint : text.required);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-trial`,
          data: { display_name: form.name.trim(), name: form.name.trim(), registration_type: "free_trial", pending_trial_token: result.pendingToken },
        },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      setSentTo(normalizedEmail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <CornerBlobs /><AuthLanguageSwitcher />
      <StickyNote seed="trial-email-confirm" className="relative z-10 max-w-lg space-y-4 text-center">
        <h1 className="text-3xl font-bold">{text.sentTitle}</h1>
        <p>{text.sentBody} <strong>{sentTo}</strong>.</p>
        <p className="text-sm opacity-70">{text.sentHint}</p>
      </StickyNote>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground">
      <CornerBlobs /><AuthLanguageSwitcher />
      <main className="relative z-10 mx-auto max-w-6xl">
        {!showForm ? (
          <div className="grid min-h-[78vh] items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
            <section>
              <p className="font-bold uppercase tracking-[.18em] text-[color:var(--purple)]">{text.eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight md:text-6xl">{text.title}</h1>
              <p className="mt-5 max-w-2xl text-lg opacity-80">{text.subtitle}</p>
              <p className="mt-5 font-bold">{text.promise}</p>
              <Button onClick={() => setShowForm(true)} className="mt-7 h-auto rounded-full bg-[color:var(--coral)] px-8 py-5 text-base font-bold text-white hover:bg-[color:var(--coral)]/90">{text.start}</Button>
            </section>
            <StickyNote seed="trial-benefits" className="space-y-5">
              {[text.benefit1, text.benefit2, text.benefit3].map((item) => <div key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--purple)]"/><span className="font-semibold">{item}</span></div>)}
              {referralCode && <div className="rounded-2xl bg-black/5 p-4 text-sm"><strong>Referral:</strong> <code>{referralCode}</code> · +30 days after verified activation.</div>}
            </StickyNote>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl py-10">
            <h1 className="mb-6 text-center text-4xl font-bold">{text.formTitle}</h1>
            <StickyNote seed="trial-register-form">
              <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                <Field label={text.name}><Input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></Field>
                <Field label={text.email}><Input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></Field>
                <Field label={text.password}><Input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/><p className="mt-1 text-xs opacity-65">{text.passwordHint}</p></Field>
                <Field label={text.role}><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "teacher" | "school_admin" })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="teacher">{text.teacher}</option><option value="school_admin">{text.admin}</option></select></Field>
                <Field label={text.school}><Input required value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })}/></Field>
                <Field label={text.city}><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></Field>
                <Field label={text.country}><Input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}/></Field>
                {referralCode && <Field label="Referral code"><Input readOnly value={referralCode} className="font-mono"/></Field>}
                <div className="space-y-3 md:col-span-2">
                  <Check label={text.terms} checked={form.terms} onChange={(checked) => setForm({ ...form, terms: checked })}/>
                  <Check label={text.privacy} checked={form.privacy} onChange={(checked) => setForm({ ...form, privacy: checked })}/>
                  <Check label={text.marketing} checked={form.marketing} onChange={(checked) => setForm({ ...form, marketing: checked })}/>
                </div>
                <div className="md:col-span-2"><Button disabled={busy} className="h-auto w-full rounded-full bg-[color:var(--coral)] py-5 font-bold text-white hover:bg-[color:var(--coral)]/90">{busy ? text.busy : text.submit}</Button></div>
              </form>
            </StickyNote>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) { return <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1"/><span>{label}</span></label>; }

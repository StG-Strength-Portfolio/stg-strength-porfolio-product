import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import {
  domainDefaultLanguage,
  readDomainLanguagePreference,
} from "@/lib/domain-language";
import { registerFreeTrial } from "@/lib/free-trial.functions";

export const Route = createFileRoute("/trial")({ component: TrialPage });

const PRIORITY_COUNTRIES = ["FI", "SE", "US"] as const;
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
] as const;

const copy = {
  en: {
    formTitle: "Create your school trial",
    name: "Full name",
    email: "Work email",
    password: "Password",
    school: "School name",
    country: "Country",
    chooseCountry: "Select country",
    priorityCountries: "Finland, Sweden and United States",
    allCountries: "All countries",
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
    formTitle: "Luo koulusi kokeilujakso",
    name: "Koko nimi",
    email: "Työsähköposti",
    password: "Salasana",
    school: "Koulun nimi",
    country: "Maa",
    chooseCountry: "Valitse maa",
    priorityCountries: "Suomi, Ruotsi ja Yhdysvallat",
    allCountries: "Kaikki maat",
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
    formTitle: "Skapa skolans provperiod",
    name: "Fullständigt namn",
    email: "Arbets-e-post",
    password: "Lösenord",
    school: "Skolans namn",
    country: "Land",
    chooseCountry: "Välj land",
    priorityCountries: "Finland, Sverige och USA",
    allCountries: "Alla länder",
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
  const { language, setLanguage } = useLanguage();
  const text = copy[language];
  const register = useServerFn(registerFreeTrial);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    schoolName: "",
    country: "",
    role: "teacher" as "teacher" | "school_admin",
    terms: false,
    privacy: false,
    marketing: false,
  });
  const params = useMemo(
    () =>
      typeof window === "undefined"
        ? new URLSearchParams()
        : new URLSearchParams(window.location.search),
    [],
  );
  const referralCode = params.get("ref")?.trim().toUpperCase() || undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readDomainLanguagePreference()) return;

    const defaultLanguage = domainDefaultLanguage(window.location.hostname);
    if (defaultLanguage && defaultLanguage !== language) {
      setLanguage(defaultLanguage);
    }
  }, [language, setLanguage]);

  const countryOptions = useMemo(() => {
    const displayNames = new Intl.DisplayNames([language], { type: "region" });
    const nameFor = (code: string) => displayNames.of(code) ?? code;
    const priority = PRIORITY_COUNTRIES.map((code) => ({ code, name: nameFor(code) }));
    const rest = COUNTRY_CODES
      .filter((code) => !PRIORITY_COUNTRIES.includes(code as (typeof PRIORITY_COUNTRIES)[number]))
      .map((code) => ({ code, name: nameFor(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, language));
    return { priority, rest };
  }, [language]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.schoolName.trim() ||
      !form.country.trim() ||
      !form.terms ||
      !form.privacy
    ) {
      toast.error(text.required);
      return;
    }
    setBusy(true);
    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const result = await register({
        data: {
          name: form.name,
          email: normalizedEmail,
          password: form.password,
          schoolName: form.schoolName,
          city: "N/A",
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
        },
      });
      if (!result.ok) {
        toast.error(
          result.error === "work_email"
            ? text.workEmail
            : result.error === "email_used"
              ? text.used
              : result.error === "referral"
                ? text.referral
                : result.error === "password"
                  ? text.passwordHint
                  : text.required,
        );
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-trial`,
          data: {
            display_name: form.name.trim(),
            name: form.name.trim(),
            registration_type: "free_trial",
            pending_trial_token: result.pendingToken,
          },
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

  if (sentTo)
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <CornerBlobs />
        <AuthLanguageSwitcher />
        <StickyNote
          seed="trial-email-confirm"
          className="relative z-10 max-w-lg space-y-4 text-center"
        >
          <h1 className="text-3xl font-bold">{text.sentTitle}</h1>
          <p>
            {text.sentBody} <strong>{sentTo}</strong>.
          </p>
          <p className="text-sm opacity-70">{text.sentHint}</p>
        </StickyNote>
      </div>
    );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <main className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl py-10">
          <h1 className="mb-6 text-center text-4xl font-bold">{text.formTitle}</h1>
          <StickyNote seed="trial-register-form">
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <Field label={text.name}>
                <Input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label={text.email}>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label={text.password}>
                <Input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="mt-1 text-xs opacity-65">{text.passwordHint}</p>
              </Field>
              <Field label={text.role}>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as "teacher" | "school_admin",
                    })
                  }
                  className="h-10 w-full rounded-md border border-[#D7D3E2] bg-white px-3 text-sm text-[#2B2342]"
                >
                  <option value="teacher">{text.teacher}</option>
                  <option value="school_admin">{text.admin}</option>
                </select>
              </Field>
              <Field label={text.school}>
                <Input
                  required
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                />
              </Field>
              <Field label={text.country}>
                <select
                  required
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="h-10 w-full rounded-md border border-[#D7D3E2] bg-white px-3 text-sm text-[#2B2342]"
                >
                  <option value="" disabled>
                    {text.chooseCountry}
                  </option>
                  <optgroup label={text.priorityCountries}>
                    {countryOptions.priority.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={text.allCountries}>
                    {countryOptions.rest.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              {referralCode && (
                <Field label="Referral code">
                  <Input readOnly value={referralCode} className="font-mono" />
                </Field>
              )}
              <div className="space-y-3 md:col-span-2">
                <Check
                  label={text.terms}
                  checked={form.terms}
                  onChange={(checked) => setForm({ ...form, terms: checked })}
                />
                <Check
                  label={text.privacy}
                  checked={form.privacy}
                  onChange={(checked) => setForm({ ...form, privacy: checked })}
                />
                <Check
                  label={text.marketing}
                  checked={form.marketing}
                  onChange={(checked) => setForm({ ...form, marketing: checked })}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  disabled={busy}
                  className="h-auto w-full rounded-full bg-[color:var(--coral)] py-5 font-bold text-white hover:bg-[color:var(--coral)]/90"
                >
                  {busy ? text.busy : text.submit}
                </Button>
              </div>
            </form>
          </StickyNote>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );
}

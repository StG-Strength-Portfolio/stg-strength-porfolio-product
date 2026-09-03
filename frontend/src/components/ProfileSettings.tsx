import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { ExternalContentPrivacySettings } from "@/components/privacy/ExternalContentPrivacySettings";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useTr, type Language } from "@/lib/i18n";
import {
  portfolioOriginForLanguage,
  registrationDomainForHostname,
  rememberDomainLanguagePreference,
} from "@/lib/domain-language";
import { seedAuthoritySilently } from "@/lib/central-sso-client";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import { updateDemoProfile } from "@/lib/demo-community";
import type { PrivacyRegion } from "@/lib/external-content-preferences";

const LANGUAGE_LABELS: Record<Language, string> = {
  fi: "Suomi",
  en: "English",
  sv: "Svenska",
};

/** Own-profile settings shared by the School Admin and Teacher dashboards. */
export function ProfileSettings({
  schoolName,
  displayName,
  email,
}: {
  schoolName?: string | null;
  displayName: string | null;
  email: string | null;
}) {
  const tr = useTr();
  const { language, setLanguage } = useLanguage();
  const [name, setName] = useState(displayName ?? "");
  const [mail, setMail] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [profileLanguage, setProfileLanguage] = useState<Language>(language);
  const [busy, setBusy] = useState(false);
  const [privacyContext, setPrivacyContext] = useState<{
    userId: string;
    schoolId: string;
    privacyRegion: PrivacyRegion;
  } | null>(null);

  const showStaffSettings =
    typeof window !== "undefined" &&
    (window.location.pathname === "/teacher/profile" ||
      window.location.pathname === "/school-admin/profile");

  useEffect(() => {
    setName(displayName ?? "");
    setMail(email ?? "");
  }, [displayName, email]);

  useEffect(() => {
    let cancelled = false;
    if (!showStaffSettings || getSuperAdminPreview().mode) return;

    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: roleRow } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const role = (roleRow as { role?: string } | null)?.role;
      if (role !== "teacher" && role !== "school_admin") return;

      const { data: profile } = await supabase
        .from("profiles" as never)
        .select("school_id, language")
        .eq("id", user.id)
        .maybeSingle();
      const profileRow = profile as { school_id?: string | null; language?: string | null } | null;
      const schoolId = profileRow?.school_id;
      const savedLanguage: Language =
        profileRow?.language === "sv" ? "sv" : profileRow?.language === "en" ? "en" : "fi";

      if (!cancelled) setProfileLanguage(savedLanguage);
      if (!schoolId) return;

      const { data: school } = await supabase
        .from("schools" as never)
        .select("privacy_region")
        .eq("id", schoolId)
        .maybeSingle();
      const privacyRegion: PrivacyRegion =
        (school as { privacy_region?: string | null } | null)?.privacy_region === "us"
          ? "us"
          : "eu_eea";

      if (!cancelled) {
        setPrivacyContext({ userId: user.id, schoolId, privacyRegion });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showStaffSettings]);

  async function redirectToSavedLanguageDomain(nextLanguage: Language) {
    if (typeof window === "undefined") return;
    if (!registrationDomainForHostname(window.location.hostname)) return;

    const targetOrigin = portfolioOriginForLanguage(nextLanguage);
    if (targetOrigin === window.location.origin) return;

    const { data } = await supabase.auth.getSession();
    if (data.session && window.location.origin !== "https://strengthportfolio.com") {
      await seedAuthoritySilently(data.session, true);
    }

    const next = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`${targetOrigin}/auth/login?next=${encodeURIComponent(next)}`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const previewMode = getSuperAdminPreview().mode;
      if (previewMode === "teacher" || previewMode === "principal") {
        updateDemoProfile(previewMode, { name, email: mail });
        setLanguage(profileLanguage);
        setPassword("");
        toast.success(tr("Tallennettu!"));
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error: profileError } = await supabase
        .from("profiles" as never)
        .update({ display_name: name.trim(), language: profileLanguage } as never)
        .eq("id", u.user.id);
      if (profileError) throw profileError;

      const patch: { email?: string; password?: string } = {};
      if (mail && mail !== email) patch.email = mail;
      if (password) patch.password = password;
      if (Object.keys(patch).length) {
        const { error } = await supabase.auth.updateUser(patch);
        if (error) throw error;
      }

      rememberDomainLanguagePreference(profileLanguage);
      setLanguage(profileLanguage);
      setPassword("");
      toast.success(tr("Tallennettu!"));
      await redirectToSavedLanguageDomain(profileLanguage);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const languageLabel = language === "en" ? "Language" : language === "sv" ? "Språk" : "Kieli";
  const languageHint =
    language === "en"
      ? "This language is also used for staff emails and reports."
      : language === "sv"
        ? "Det här språket används också för personalens e-post och rapporter."
        : "Tätä kieltä käytetään myös henkilökunnan sähköposteissa ja raporteissa.";

  return (
    <>
      <StickyNote seed="settings-profile" className="space-y-4">
        <div>
          <div className="text-[0.7rem] uppercase tracking-wider opacity-60">{tr("Koulun nimi")}</div>
          <div className="font-bold">{schoolName ?? "—"}</div>
        </div>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="set-name">{tr("Nimi")}</Label>
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="set-mail">{tr("Sähköposti")}</Label>
            <Input
              id="set-mail"
              type="email"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="set-pass">{tr("Uusi salasana")}</Label>
            <Input
              id="set-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {showStaffSettings && (
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="set-language">{languageLabel}</Label>
              <select
                id="set-language"
                value={profileLanguage}
                onChange={(e) => setProfileLanguage(e.target.value as Language)}
                className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="fi">{LANGUAGE_LABELS.fi}</option>
                <option value="en">{LANGUAGE_LABELS.en}</option>
                <option value="sv">{LANGUAGE_LABELS.sv}</option>
              </select>
              <p className="text-xs opacity-65">{languageHint}</p>
            </div>
          )}
          <div className="md:col-span-3">
            <Button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {tr("Tallenna")}
            </Button>
          </div>
        </form>
      </StickyNote>

      {showStaffSettings && privacyContext && (
        <div className="mt-6">
          <ExternalContentPrivacySettings
            userId={privacyContext.userId}
            schoolId={privacyContext.schoolId}
            privacyRegion={privacyContext.privacyRegion}
          />
        </div>
      )}
    </>
  );
}

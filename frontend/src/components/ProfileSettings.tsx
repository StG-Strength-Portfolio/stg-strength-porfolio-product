import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { ExternalContentPrivacySettings } from "@/components/privacy/ExternalContentPrivacySettings";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useTr } from "@/lib/i18n";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import { updateDemoProfile } from "@/lib/demo-community";
import { isStrongPassword, passwordPolicyMessage } from "@/lib/password-policy";
import type { PrivacyRegion } from "@/lib/external-content-preferences";

const REPORT_COPY = {
  fi: {
    title: "Kuukausiraportit",
    description:
      "Saat kuukausittain sähköpostiin yhteenvedon opetuksesi tai koulusi edistymisestä ja vahvuuksista. Raportti sisältää vain koontitietoja, ei opiskelijoiden vastauksia tai nimiä.",
    receive: "Lähetä minulle kuukausiraportti",
    saved: "Kuukausiraporttiasetus tallennettu.",
  },
  en: {
    title: "Monthly reports",
    description:
      "Receive a monthly email with aggregate progress and strengths for your classes or school. The email does not include student responses or student names.",
    receive: "Send me the monthly report",
    saved: "Monthly report preference saved.",
  },
  sv: {
    title: "Månadsrapporter",
    description:
      "Få ett månatligt e-postmeddelande med sammanställda framsteg och styrkor för dina klasser eller din skola. Meddelandet innehåller inte elevsvar eller elevnamn.",
    receive: "Skicka månadsrapporten till mig",
    saved: "Inställningen för månadsrapporten har sparats.",
  },
} as const;

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
  const { language } = useLanguage();
  const reportText = REPORT_COPY[language];
  const [name, setName] = useState(displayName ?? "");
  const [mail, setMail] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOptOut, setReportOptOut] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [privacyContext, setPrivacyContext] = useState<{
    userId: string;
    schoolId: string;
    privacyRegion: PrivacyRegion;
  } | null>(null);

  const showPrivacy =
    typeof window !== "undefined" &&
    (window.location.pathname === "/teacher/profile" ||
      window.location.pathname === "/school-admin/profile");

  useEffect(() => {
    setName(displayName ?? "");
    setMail(email ?? "");
  }, [displayName, email]);

  useEffect(() => {
    let cancelled = false;
    if (!showPrivacy || getSuperAdminPreview().mode) return;

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
        .select("school_id, monthly_report_opt_out")
        .eq("id", user.id)
        .maybeSingle();
      const typedProfile = profile as {
        school_id?: string | null;
        monthly_report_opt_out?: boolean | null;
      } | null;
      const schoolId = typedProfile?.school_id;
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
        setReportOptOut(Boolean(typedProfile?.monthly_report_opt_out));
        setPrivacyContext({ userId: user.id, schoolId, privacyRegion });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showPrivacy]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password && !isStrongPassword(password)) {
      toast.error(passwordPolicyMessage(language));
      return;
    }
    setBusy(true);
    try {
      const previewMode = getSuperAdminPreview().mode;
      // Sales demo profile fields are session-only and never update the signed-in
      // Superadmin account or customer data. Password input is simulated only.
      if (previewMode === "teacher" || previewMode === "principal") {
        updateDemoProfile(previewMode, { name, email: mail });
        setPassword("");
        toast.success(tr("Tallennettu!"));
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase
        .from("profiles" as never)
        .update({ display_name: name.trim() } as never)
        .eq("id", u.user.id);
      const patch: { email?: string; password?: string } = {};
      if (mail && mail !== email) patch.email = mail;
      if (password) patch.password = password;
      if (Object.keys(patch).length) {
        const { error } = await supabase.auth.updateUser(patch);
        if (error) throw error;
      }
      setPassword("");
      toast.success(tr("Tallennettu!"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setReceiveMonthlyReport(receive: boolean) {
    if (getSuperAdminPreview().mode) {
      setReportOptOut(!receive);
      toast.success(reportText.saved);
      return;
    }
    setReportBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        "set_my_monthly_report_opt_out" as never,
        { p_opt_out: !receive } as never,
      );
      if (error) throw error;
      setReportOptOut(Boolean(data));
      toast.success(reportText.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setReportBusy(false);
    }
  }

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs opacity-65">{passwordPolicyMessage(language)}</p>
          </div>
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

      {showPrivacy && privacyContext && (
        <>
          <div className="mt-6">
            <StickyNote seed="monthly-report-settings" className="space-y-3">
              <div>
                <h3 className="text-xl font-bold">{reportText.title}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed opacity-75">
                  {reportText.description}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!reportOptOut}
                  disabled={reportBusy}
                  onChange={(event) => void setReceiveMonthlyReport(event.target.checked)}
                  className="h-4 w-4"
                />
                <span>{reportText.receive}</span>
              </label>
            </StickyNote>
          </div>
          <div className="mt-6">
            <ExternalContentPrivacySettings
              userId={privacyContext.userId}
              schoolId={privacyContext.schoolId}
              privacyRegion={privacyContext.privacyRegion}
            />
          </div>
        </>
      )}
    </>
  );
}
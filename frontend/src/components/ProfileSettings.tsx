import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { ExternalContentPrivacySettings } from "@/components/privacy/ExternalContentPrivacySettings";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/i18n";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import type { PrivacyRegion } from "@/lib/external-content-preferences";

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
  const [name, setName] = useState(displayName ?? "");
  const [mail, setMail] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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
        .select("school_id")
        .eq("id", user.id)
        .maybeSingle();
      const schoolId = (profile as { school_id?: string | null } | null)?.school_id;
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
  }, [showPrivacy]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Sales demo profile fields are intentionally editable for presentation,
      // but never update the signed-in Superadmin account or customer data.
      if (getSuperAdminPreview().mode) {
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

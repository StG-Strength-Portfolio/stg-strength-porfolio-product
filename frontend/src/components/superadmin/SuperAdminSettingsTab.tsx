import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { SchoolPrivacyRegionsSettings } from "@/components/superadmin/SchoolPrivacyRegionsSettings";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

const COPY = {
  fi: {
    title: "Asetukset",
    account: "Omat tilitiedot",
    name: "Nimi",
    email: "Sähköpostiosoite",
    newPassword: "Uusi salasana",
    confirmPassword: "Vahvista uusi salasana",
    passwordHint: "Jätä salasanakentät tyhjiksi, jos et halua vaihtaa salasanaa.",
    emailHint: "Sähköpostiosoitteen vaihtaminen voi vaatia vahvistuksen sähköpostitse.",
    save: "Tallenna muutokset",
    saving: "Tallennetaan…",
    loading: "Ladataan tilitietoja…",
    nameRequired: "Nimi ei voi olla tyhjä.",
    passwordShort: "Salasanan tulee olla vähintään 6 merkkiä.",
    passwordMismatch: "Salasanat eivät täsmää.",
    saved: "Tilitiedot tallennettu.",
    emailConfirmation: "Sähköpostiosoitteen vaihto pyydetty. Vahvista uusi osoite sähköpostissa, jos saat vahvistusviestin.",
    loadFailed: "Tilitietojen lataaminen epäonnistui.",
    saveFailed: "Tilitietojen tallentaminen epäonnistui.",
  },
  en: {
    title: "Settings",
    account: "Account settings",
    name: "Name",
    email: "Email address",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint: "Leave the password fields empty if you do not want to change your password.",
    emailHint: "Changing your email address may require email confirmation.",
    save: "Save changes",
    saving: "Saving…",
    loading: "Loading account details…",
    nameRequired: "Name cannot be empty.",
    passwordShort: "Password must be at least 6 characters.",
    passwordMismatch: "Passwords do not match.",
    saved: "Account settings saved.",
    emailConfirmation: "Email change requested. Confirm the new address from your email if a confirmation message is sent.",
    loadFailed: "Account details could not be loaded.",
    saveFailed: "Account settings could not be saved.",
  },
  sv: {
    title: "Inställningar",
    account: "Kontoinställningar",
    name: "Namn",
    email: "E-postadress",
    newPassword: "Nytt lösenord",
    confirmPassword: "Bekräfta nytt lösenord",
    passwordHint: "Lämna lösenordsfälten tomma om du inte vill ändra lösenordet.",
    emailHint: "Ändring av e-postadress kan kräva bekräftelse via e-post.",
    save: "Spara ändringar",
    saving: "Sparar…",
    loading: "Laddar kontouppgifter…",
    nameRequired: "Namnet får inte vara tomt.",
    passwordShort: "Lösenordet måste innehålla minst 6 tecken.",
    passwordMismatch: "Lösenorden matchar inte.",
    saved: "Kontoinställningarna har sparats.",
    emailConfirmation: "Ändring av e-postadress har begärts. Bekräfta den nya adressen via e-post om ett bekräftelsemeddelande skickas.",
    loadFailed: "Kontouppgifterna kunde inte laddas.",
    saveFailed: "Kontoinställningarna kunde inte sparas.",
  },
} as const;

export function SuperAdminSettingsTab() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw authError ?? new Error("No authenticated user");

        const { data: profile, error: profileError } = await supabase
          .from("profiles" as never)
          .select("display_name")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (cancelled) return;

        const profileName = (profile as { display_name?: string | null } | null)?.display_name;
        const currentEmail = authData.user.email ?? "";
        setUserId(authData.user.id);
        setName(profileName ?? (authData.user.user_metadata?.display_name as string | undefined) ?? "");
        setEmail(currentEmail);
        setOriginalEmail(currentEmail);
      } catch (error) {
        console.warn("[superadmin-settings] load", error);
        if (!cancelled) toast.error(copy.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || busy) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) {
      toast.error(copy.nameRequired);
      return;
    }
    if (password && password.length < 6) {
      toast.error(copy.passwordShort);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(copy.passwordMismatch);
      return;
    }

    const emailChanged = cleanEmail !== originalEmail.trim().toLowerCase();
    setBusy(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles" as never)
        .update({ display_name: cleanName } as never)
        .eq("id", userId);
      if (profileError) throw profileError;

      const authPatch: { email?: string; password?: string; data?: { display_name: string } } = {
        data: { display_name: cleanName },
      };
      if (emailChanged) authPatch.email = cleanEmail;
      if (password) authPatch.password = password;

      const { data: updatedAuth, error: authError } = await supabase.auth.updateUser(authPatch);
      if (authError) throw authError;

      setPassword("");
      setConfirmPassword("");
      const activeEmail = updatedAuth.user?.email;
      if (activeEmail && activeEmail.toLowerCase() === cleanEmail) {
        setOriginalEmail(activeEmail);
        setEmail(activeEmail);
      }

      toast.success(copy.saved);
      if (emailChanged && (!activeEmail || activeEmail.toLowerCase() !== cleanEmail)) {
        toast.info(copy.emailConfirmation);
      }
    } catch (error) {
      console.warn("[superadmin-settings] save", error);
      toast.error(copy.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <StickyNote seed="sa-settings" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          <p className="mt-1 text-sm opacity-70">{copy.account}</p>
        </div>

        {loading ? (
          <p className="text-sm opacity-70">{copy.loading}</p>
        ) : (
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sa-settings-name">{copy.name}</Label>
                <Input
                  id="sa-settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-settings-email">{copy.email}</Label>
                <Input
                  id="sa-settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <p className="text-xs opacity-60">{copy.emailHint}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sa-settings-password">{copy.newPassword}</Label>
                <Input
                  id="sa-settings-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-settings-password-confirm">{copy.confirmPassword}</Label>
                <Input
                  id="sa-settings-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>
            <p className="text-xs opacity-60">{copy.passwordHint}</p>

            <Button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[color:var(--purple)] px-6 font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {busy ? copy.saving : copy.save}
            </Button>
          </form>
        )}
      </StickyNote>

      <SchoolPrivacyRegionsSettings />
    </div>
  );
}

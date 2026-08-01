import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/i18n";

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

  useEffect(() => {
    setName(displayName ?? "");
    setMail(email ?? "");
  }, [displayName, email]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
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
          <Input id="set-mail" type="email" value={mail} onChange={(e) => setMail(e.target.value)} />
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
  );
}

import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { useTr } from "@/lib/i18n";
import {
  listSuperAdmins,
  inviteSuperAdmin,
  removeSuperAdmin,
  type SuperAdminRow,
} from "@/lib/superadmin.functions";

export function SuperAdminsTab() {
  const tr = useTr();
  const fetchAdmins = useServerFn(listSuperAdmins);
  const invite = useServerFn(inviteSuperAdmin);
  const remove = useServerFn(removeSuperAdmin);

  const [rows, setRows] = useState<SuperAdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await fetchAdmins());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchAdmins]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await invite({ data: { email, name, password: password || undefined } });
      toast.success(tr("Ylläpitäjä lisätty."));
      setEmail("");
      setName("");
      setPassword("");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StickyNote seed="sa-admins-add" className="space-y-3">
        <h2 className="text-2xl font-bold">{tr("Kutsu uusi pääkäyttäjä")}</h2>
        <form onSubmit={onInvite} className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="sa-adm-email">{tr("Sähköpostiosoite")}</Label>
            <Input
              id="sa-adm-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sa-adm-name">{tr("Nimi")}</Label>
            <Input id="sa-adm-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sa-adm-pw">{tr("Salasana (valinnainen)")}</Label>
            <Input
              id="sa-adm-pw"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {tr("Kutsu")}
            </Button>
          </div>
        </form>
      </StickyNote>

      <StickyNote seed="sa-admins-list" className="space-y-3">
        <h2 className="text-2xl font-bold">{tr("Pääkäyttäjät")}</h2>
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 text-slate-900"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {r.name ?? "—"} {r.isSelf && <span className="text-xs opacity-60">({tr("sinä")})</span>}
                </p>
                <p className="truncate text-xs opacity-70">{r.email ?? "—"}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={r.isSelf}
                className="rounded-full"
                onClick={async () => {
                  if (!confirm(tr("Poistetaanko pääkäyttäjän oikeudet?"))) return;
                  try {
                    await remove({ data: { userId: r.id } });
                    toast.success(tr("Oikeudet poistettu."));
                    await load();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                {tr("Poista")}
              </Button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm opacity-70">{tr("Ei pääkäyttäjiä.")}</p>}
        </div>
      </StickyNote>
    </>
  );
}

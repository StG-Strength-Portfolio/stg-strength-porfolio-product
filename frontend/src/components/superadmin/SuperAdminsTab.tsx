import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import {
  listSuperAdmins,
  removeSuperAdmin,
  type SuperAdminRow,
} from "@/lib/superadmin.functions";
import { inviteSuperAdminByEmail } from "@/lib/superadmin-invite.functions";

const SUPERADMIN_COPY = {
  fi: {
    inviteTitle: "Kutsu uusi pääkäyttäjä",
    email: "Sähköpostiosoite",
    name: "Nimi",
    invite: "Kutsu",
    sending: "Lähetetään…",
    inviteHelp: "Kutsuttu pääkäyttäjä saa sähköpostin, jonka kautta hän asettaa oman salasanansa.",
    adminsTitle: "Pääkäyttäjät",
    you: "sinä",
    delete: "Poista",
    deleteConfirm: "Poistetaanko pääkäyttäjän oikeudet?",
    removed: "Oikeudet poistettu.",
    empty: "Ei pääkäyttäjiä.",
    inviteSent: "Kutsu lähetetty sähköpostiin.",
    setupSent: "Salasanan asetuslinkki lähetetty sähköpostiin.",
  },
  en: {
    inviteTitle: "Invite a new super admin",
    email: "Email address",
    name: "Name",
    invite: "Invite",
    sending: "Sending…",
    inviteHelp: "The invited super admin will receive an email where they can set their own password.",
    adminsTitle: "Super admins",
    you: "you",
    delete: "Delete",
    deleteConfirm: "Remove this user's super admin access?",
    removed: "Super admin access removed.",
    empty: "No super admins.",
    inviteSent: "Invitation sent by email.",
    setupSent: "Password setup link sent by email.",
  },
  sv: {
    inviteTitle: "Bjud in en ny superadministratör",
    email: "E-postadress",
    name: "Namn",
    invite: "Bjud in",
    sending: "Skickar…",
    inviteHelp: "Den inbjudna superadministratören får ett e-postmeddelande där hen kan ange sitt eget lösenord.",
    adminsTitle: "Superadministratörer",
    you: "du",
    delete: "Ta bort",
    deleteConfirm: "Ta bort den här användarens behörighet som superadministratör?",
    removed: "Behörigheten som superadministratör har tagits bort.",
    empty: "Inga superadministratörer.",
    inviteSent: "Inbjudan har skickats via e-post.",
    setupSent: "Länk för att ange lösenord har skickats via e-post.",
  },
} as const;

export function SuperAdminsTab() {
  const { language } = useLanguage();
  const copy = SUPERADMIN_COPY[language];
  const fetchAdmins = useServerFn(listSuperAdmins);
  const invite = useServerFn(inviteSuperAdminByEmail);
  const remove = useServerFn(removeSuperAdmin);

  const [rows, setRows] = useState<SuperAdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
      const result = await invite({ data: { email, name } });
      toast.success(result.emailKind === "invite" ? copy.inviteSent : copy.setupSent);
      setEmail("");
      setName("");
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
        <h2 className="text-2xl font-bold">{copy.inviteTitle}</h2>
        <form onSubmit={onInvite} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="sa-adm-email">{copy.email}</Label>
            <Input
              id="sa-adm-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sa-adm-name">{copy.name}</Label>
            <Input id="sa-adm-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {busy ? copy.sending : copy.invite}
            </Button>
          </div>
        </form>
        <p className="text-sm opacity-70">{copy.inviteHelp}</p>
      </StickyNote>

      <StickyNote seed="sa-admins-list" className="space-y-3">
        <h2 className="text-2xl font-bold">{copy.adminsTitle}</h2>
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 text-slate-900"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {r.name ?? "—"}{" "}
                  {r.isSelf && <span className="text-xs opacity-60">({copy.you})</span>}
                </p>
                <p className="truncate text-xs opacity-70">{r.email ?? "—"}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={r.isSelf}
                className="rounded-full"
                onClick={async () => {
                  if (!confirm(copy.deleteConfirm)) return;
                  try {
                    await remove({ data: { userId: r.id } });
                    toast.success(copy.removed);
                    await load();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                {copy.delete}
              </Button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm opacity-70">{copy.empty}</p>}
        </div>
      </StickyNote>
    </>
  );
}

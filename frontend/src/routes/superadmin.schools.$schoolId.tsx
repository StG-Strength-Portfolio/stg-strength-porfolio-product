import { TOTAL_REQUIRED } from "@/lib/teacher-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { useSuperAdminGuard } from "@/lib/superadmin-guard";
import { useLanguage, useTr } from "@/lib/i18n";
import { generateSecureSchoolAdminCode } from "@/lib/school-admin-invitations.functions";
import {
  getSchoolDetail,
  revokeSchoolCode,
  renewSchool,
  updateUserCredentials,
  setUserRole,
  type SchoolUser,
  type SchoolCodeRow,
} from "@/lib/superadmin.functions";

export const Route = createFileRoute("/superadmin/schools/$schoolId")({
  component: SchoolDetailPage,
});

type Detail = Awaited<ReturnType<typeof getSchoolDetail>>;

const staffCopy = {
  fi: {
    generate: "Luo uusi henkilökunnan koodi",
    linkTitle: "Henkilökunnan rekisteröinti",
    linkHint: "Jaa sama rekisteröitymislinkki ja koulun koodi koko henkilökunnalle. Koodi toimii usealle henkilölle 4 viikon ajan.",
    copyLink: "Kopioi linkki",
    codeCreated: "Uusi henkilökunnan koodi luotu: ",
    active: "Voimassa",
    expired: "Vanhentunut",
    replaced: "Korvattu",
    validUntil: "Voimassa asti",
  },
  en: {
    generate: "Generate new staff code",
    linkTitle: "Staff registration",
    linkHint: "Share the same registration link and school code with the whole staff. The code can be used by many people for 4 weeks.",
    copyLink: "Copy link",
    codeCreated: "New staff code created: ",
    active: "Active",
    expired: "Expired",
    replaced: "Replaced",
    validUntil: "Valid until",
  },
  sv: {
    generate: "Skapa ny personalkod",
    linkTitle: "Personalregistrering",
    linkHint: "Dela samma registreringslänk och skolkod med hela personalen. Koden kan användas av flera personer i 4 veckor.",
    copyLink: "Kopiera länk",
    codeCreated: "Ny personalkod skapad: ",
    active: "Giltig",
    expired: "Utgången",
    replaced: "Ersatt",
    validUntil: "Giltig till",
  },
} as const;

function SchoolDetailPage() {
  const tr = useTr();
  const { language } = useLanguage();
  const staffText = staffCopy[language];
  const ready = useSuperAdminGuard();
  const { schoolId } = Route.useParams();
  const fetchDetail = useServerFn(getSchoolDetail);
  const genCode = useServerFn(generateSecureSchoolAdminCode);
  const revoke = useServerFn(revokeSchoolCode);
  const renew = useServerFn(renewSchool);
  const updateCreds = useServerFn(updateUserCredentials);
  const changeRole = useServerFn(setUserRole);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "billing" | "codes">("overview");
  const [editUser, setEditUser] = useState<SchoolUser | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    try {
      setDetail(await fetchDetail({ data: { schoolId } }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchDetail, schoolId]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  if (!ready || !detail) return null;
  const school = detail.school as {
    name: string;
    code: string;
    is_active: boolean;
    billing_start_date: string | null;
    billing_expiry_date: string | null;
  };

  const teachers = detail.users.filter((u) => u.role === "teacher");
  const admins = detail.users.filter((u) => u.role === "school_admin");
  const students = detail.users.filter((u) => u.role === "student");

  async function saveCreds() {
    if (!editUser) return;
    try {
      await updateCreds({
        data: {
          userId: editUser.id,
          email: newEmail || undefined,
          password: newPassword || undefined,
        },
      });
      toast.success(tr("Päivitetty!"));
      setEditUser(null);
      setNewEmail("");
      setNewPassword("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function UserTable({ rows, showScreen }: { rows: SchoolUser[]; showScreen?: boolean }) {
    return rows.length === 0 ? (
      <p className="opacity-70">{tr("Ei käyttäjiä.")}</p>
    ) : (
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10">
            <th className="py-2 pr-3">{tr("Nimi")}</th>
            <th className="py-2 pr-3">{tr("Sähköposti")}</th>
            <th className="py-2 pr-3">{tr("Liittynyt")}</th>
            <th className="py-2 pr-3">{tr("Viimeksi aktiivinen")}</th>
            {showScreen && <th className="py-2 pr-3">{tr("Eteneminen")}</th>}
            <th className="py-2">{tr("Toiminnot")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-black/5">
              <td className="py-2 pr-3 font-medium">{u.name ?? "—"}</td>
              <td className="py-2 pr-3">{u.email ?? "—"}</td>
              <td className="py-2 pr-3 opacity-70">
                {u.joined ? new Date(u.joined).toLocaleDateString() : "—"}
              </td>
              <td className="py-2 pr-3 opacity-70">
                {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}
              </td>
              {showScreen && (
                <td className="py-2 pr-3">
                  {Math.min(100, Math.round(((u.currentScreen ?? 1) / TOTAL_REQUIRED) * 100))}%
                </td>
              )}
              <td className="py-2">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setEditUser(u);
                      setNewEmail(u.email ?? "");
                      setNewPassword("");
                    }}
                  >
                    {tr("Muuta käyttäjän tunnistetiedot")}
                  </Button>
                  {u.role === "teacher" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        if (!window.confirm(tr("Nimeä koulun admin"))) return;
                        await changeRole({ data: { userId: u.id, role: "school_admin" } });
                        toast.success(tr("Sinut on nimitetty koulun adminiksi!"));
                        await load();
                      }}
                    >
                      {tr("Nimeä koulun admin")}
                    </Button>
                  )}
                  {u.role === "school_admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        await changeRole({ data: { userId: u.id, role: "teacher" } });
                        toast.success(tr("Päivitetty!"));
                        await load();
                      }}
                    >
                      {tr("Poista admin-oikeudet")}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground px-4 py-8">
      <CornerBlobs />
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6">
        <Link
          to="/superadmin/dashboard"
          search={{ tab: "schools" as const }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--purple)] underline"
        >
          <ArrowLeft className="h-4 w-4" /> {tr("Takaisin")}
        </Link>

        <header className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-4xl font-bold">{school.name}</h1>
            <LanguageSwitcher />
          </div>
          <span
            className={
              school.is_active
                ? "rounded-full bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-800"
                : "rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-semibold text-red-800"
            }
          >
            {school.is_active ? tr("Aktiivinen") : tr("Vanhentuneet")}
          </span>
          <span className="text-sm opacity-70">
            {tr("Vanhentuminen")}:{" "}
            {school.billing_expiry_date
              ? new Date(school.billing_expiry_date).toLocaleDateString()
              : "—"}
          </span>
        </header>

        <nav className="flex flex-wrap gap-2">
          {(["overview", "users", "billing", "codes"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                tab === t ? "bg-[color:var(--purple)] text-white" : "bg-black/5"
              }`}
            >
              {t === "codes"
                ? staffText.linkTitle
                : tr(t === "overview" ? "Yhteenveto" : t === "users" ? "Käyttäjät" : "Laskutus")}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <StickyNote seed="sa-detail-overview" className="grid gap-4 sm:grid-cols-4">
            <Metric label={tr("Opettajat")} value={detail.metrics.teachers} />
            <Metric label={tr("Opiskelijat")} value={detail.metrics.students} />
            <Metric label={tr("Aktiiviset käyttäjät")} value={detail.metrics.activeThisMonth} />
            <Metric label={tr("Keskim. eteneminen")} value={`${detail.metrics.avgCompletion}%`} />
          </StickyNote>
        )}

        {tab === "users" && (
          <div className="space-y-6">
            <StickyNote seed="sa-detail-teachers" className="overflow-x-auto">
              <h2 className="mb-2 text-xl font-bold">{tr("Opettajat")}</h2>
              <UserTable rows={teachers} />
            </StickyNote>
            <StickyNote seed="sa-detail-admins" className="overflow-x-auto">
              <h2 className="mb-2 text-xl font-bold">{tr("Koulun admin")}</h2>
              <UserTable rows={admins} />
            </StickyNote>
            <StickyNote seed="sa-detail-students" className="overflow-x-auto">
              <h2 className="mb-2 text-xl font-bold">{tr("Opiskelijat")}</h2>
              <UserTable rows={students} showScreen />
            </StickyNote>
          </div>
        )}

        {tab === "billing" && (
          <StickyNote seed="sa-detail-billing" className="space-y-3">
            <p>
              {tr("Laskutus aloitus")}:{" "}
              {school.billing_start_date
                ? new Date(school.billing_start_date).toLocaleDateString()
                : "—"}
            </p>
            <p>
              {tr("Vanhentuminen")}:{" "}
              {school.billing_expiry_date
                ? new Date(school.billing_expiry_date).toLocaleDateString()
                : "—"}
            </p>
            <Button
              className="rounded-full bg-[color:var(--purple)] text-white font-bold"
              onClick={async () => {
                const input = window.prompt(tr("Tilin vanhentumispäivä") + " (YYYY-MM-DD)");
                if (!input) return;
                await renew({ data: { id: schoolId, expiry: new Date(input).toISOString() } });
                toast.success(tr("Päivitetty!"));
                await load();
              }}
            >
              {tr("Uusi")}
            </Button>
          </StickyNote>
        )}

        {tab === "codes" && (
          <StickyNote seed="sa-detail-codes" className="space-y-4 overflow-x-auto">
            <div className="rounded-xl bg-black/5 p-4">
              <p className="font-semibold">{staffText.linkTitle}</p>
              <p className="mt-1 text-sm opacity-75">{staffText.linkHint}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded bg-white/70 px-3 py-2 text-sm">/register-staff</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    const url = `${window.location.origin}/register-staff`;
                    void navigator.clipboard.writeText(url);
                    toast.success(tr("Kopioitu!"));
                  }}
                >
                  <Copy className="mr-1 h-4 w-4" /> {staffText.copyLink}
                </Button>
                <a
                  href="/register-staff"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[color:var(--purple)] underline"
                >
                  {staffText.linkTitle}
                </a>
              </div>
            </div>

            <Button
              className="rounded-full bg-[color:var(--purple)] text-white font-bold"
              onClick={async () => {
                const res = await genCode({ data: { schoolId } });
                toast.success(`${staffText.codeCreated}${res.code}`);
                await load();
              }}
            >
              {staffText.generate}
            </Button>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-2 pr-3">{tr("Koodi")}</th>
                  <th className="py-2 pr-3">{tr("Tila")}</th>
                  <th className="py-2 pr-3">{tr("Luotu")}</th>
                  <th className="py-2 pr-3">{staffText.validUntil}</th>
                  <th className="py-2">{tr("Toiminnot")}</th>
                </tr>
              </thead>
              <tbody>
                {(detail.codes as SchoolCodeRow[]).map((c) => {
                  const expired = !c.expires_at || new Date(c.expires_at).getTime() <= Date.now();
                  const active = !c.is_revoked && !expired;
                  return (
                    <tr key={c.id} className="border-b border-black/5">
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-2">
                          <code className="font-mono">{c.code}</code>
                          <button
                            type="button"
                            aria-label={tr("Kopioi")}
                            className="opacity-60 hover:opacity-100"
                            onClick={() => {
                              void navigator.clipboard.writeText(c.code);
                              toast.success(tr("Kopioitu!"));
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {active ? staffText.active : c.is_revoked ? staffText.replaced : staffText.expired}
                      </td>
                      <td className="py-2 pr-3 opacity-70">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 opacity-70">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2">
                        {active && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={async () => {
                              await revoke({ data: { id: c.id } });
                              toast.success(tr("Päivitetty!"));
                              await load();
                            }}
                          >
                            {tr("Peruuta")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </StickyNote>
        )}

        {editUser && (
          <StickyNote seed="sa-detail-creds" className="space-y-3">
            <h2 className="text-xl font-bold">{tr("Muuta käyttäjän tunnistetiedot")}</h2>
            <p className="text-sm opacity-70">{editUser.name ?? editUser.id}</p>
            <div className="space-y-1">
              <Label htmlFor="cred-email">{tr("Uusi sähköposti")}</Label>
              <Input
                id="cred-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cred-pass">{tr("Uusi salasana")}</Label>
              <Input
                id="cred-pass"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="rounded-full bg-[color:var(--purple)] text-white font-bold"
                onClick={() => void saveCreds()}
              >
                {tr("Päivitä")}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setEditUser(null)}>
                {tr("Peruuta")}
              </Button>
            </div>
          </StickyNote>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-black/5 p-4">
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

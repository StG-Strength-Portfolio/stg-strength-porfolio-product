import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdminGuard } from "@/lib/superadmin-guard";
import { useTr } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { EmailTemplatesTab } from "@/components/superadmin/EmailTemplatesTab";
import { EmailAnalyticsTab } from "@/components/superadmin/EmailAnalyticsTab";
// @lovable-new
import { TeachingMaterialsTab } from "@/components/superadmin/TeachingMaterialsTab";
import { SuperAdminsTab } from "@/components/superadmin/SuperAdminsTab";
// @lovable-new 2026-08-08 — super admin "view as student" (view mode only)
import { setStudentViewMode } from "@/lib/progression";
import {
  listSchools,
  createSchool,
  renewSchool,
  updateSchool,
  generateSchoolCode,
  type SchoolRow,
} from "@/lib/superadmin.functions";

const TABS = [
  "schools",
  "billing",
  "users",
  "admins",
  "emails",
  "materials",
  "reports",
  "settings",
] as const;
type Tab = (typeof TABS)[number];


export const Route = createFileRoute("/superadmin/dashboard")({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }).parse,
  component: SuperAdminDashboard,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function CopyCode({ code }: { code: string }) {
  const tr = useTr();
  return (
    <span className="inline-flex items-center gap-2">
      <code className="font-mono">{code}</code>
      <button
        type="button"
        aria-label={tr("Kopioi")}
        title={tr("Kopioi")}
        className="opacity-60 hover:opacity-100"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          toast.success(tr("Kopioitu!"));
        }}
      >
        <Copy className="h-4 w-4" />
      </button>
    </span>
  );
}

function SuperAdminDashboard() {
  const tr = useTr();
  const navigate = useNavigate();
  const ready = useSuperAdminGuard();
  const tab: Tab = Route.useSearch().tab ?? "schools";

  const fetchSchools = useServerFn(listSchools);
  const addSchool = useServerFn(createSchool);
  const renew = useServerFn(renewSchool);
  const edit = useServerFn(updateSchool);
  const genCode = useServerFn(generateSchoolCode);

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [name, setName] = useState("");
  const [start, setStart] = useState(today());
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSchools(await fetchSchools());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchSchools]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  if (!ready) return null;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !expiry) return;
    setBusy(true);
    try {
      const res = await addSchool({
        data: { name, language: "fi", start: new Date(start).toISOString(), expiry: new Date(expiry).toISOString() },
      });
      toast.success(`${tr("Koulu lisätty! Koodi: ")}${res.code}`);
      setName("");
      setExpiry("");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onRenew(s: SchoolRow) {
    const input = window.prompt(tr("Tilin vanhentumispäivä") + " (YYYY-MM-DD)");
    if (!input) return;
    await renew({ data: { id: s.id, expiry: new Date(input).toISOString() } });
    toast.success(tr("Päivitetty!"));
    await load();
  }

  async function onEdit(s: SchoolRow) {
    const newName = window.prompt(tr("Koulun nimi"), s.name);
    if (newName == null) return;
    await edit({ data: { id: s.id, name: newName } });
    toast.success(tr("Päivitetty!"));
    await load();
  }

  async function onGenerate(s: SchoolRow) {
    const res = await genCode({ data: { schoolId: s.id } });
    toast.success(`${tr("Uusi koodi luotu: ")}${res.code}`);
    await load();
  }

  const totalTeachers = schools.reduce((a, s) => a + s.teacherCount, 0);
  const totalStudents = schools.reduce((a, s) => a + s.studentCount, 0);
  const expired = schools.filter((s) => !s.is_active);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <p className="mb-3 text-sm font-bold opacity-70">{tr("Ylläpito")}</p>
          <nav className="space-y-1">
            {TABS.map((tb) => (
              <Link
                key={tb}
                to="/superadmin/dashboard"
                search={{ tab: tb }}
                className={`block rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === tb
                    ? "bg-[color:var(--purple)] text-white"
                    : "hover:bg-black/5 text-foreground"
                }`}
              >
                {tr(
                  tb === "schools"
                    ? "Koulut"
                    : tb === "billing"
                      ? "Laskutus"
                      : tb === "users"
                        ? "Käyttäjät"
                        : tb === "admins"
                          ? "Ylläpitäjät"
                          : tb === "emails"
                            ? "Sähköpostit"
                            : tb === "materials"
                              ? "Opetusmateriaalit"
                              : tb === "reports"
                              ? "Raportit"
                              : "Asetukset",
                )}

              </Link>
            ))}
          </nav>
          {/* @lovable-new 2026-08-08 — QA: open the student-facing portfolio
              with full bypass. View mode only — the DB role stays super_admin. */}
          <button
            type="button"
            className="mt-4 block w-full rounded-full bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-[color:var(--purple)]"
            onClick={() => {
              setStudentViewMode(true);
              window.location.href = "/seikkailu";
            }}
          >
            {tr("Näytä oppilaan näkymä")}
          </button>

          <button
            type="button"
            className="mt-6 px-4 text-xs underline opacity-70"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/superadmin/login", replace: true });
            }}
          >
            {tr("Kirjaudu ulos")}
          </button>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <header>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-4xl font-bold">{tr("Näy hyvää! ylläpitojakso")}</h1>
              <LanguageSwitcher />
            </div>
          </header>

          {tab === "schools" && (
            <>
              <StickyNote seed="sa-add-school">
                <form onSubmit={onAdd} className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="sa-name">{tr("Koulun nimi")}</Label>
                    <Input id="sa-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sa-start">{tr("Laskutuksen aloituspäivä")}</Label>
                    <Input
                      id="sa-start"
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sa-expiry">{tr("Tilin vanhentumispäivä")}</Label>
                    <Input
                      id="sa-expiry"
                      type="date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Button
                      type="submit"
                      disabled={busy}
                      className="rounded-full bg-[color:var(--purple)] hover:bg-[color:var(--purple)]/90 text-white font-bold"
                    >
                      {tr("Lisää koulu")}
                    </Button>
                  </div>
                </form>
              </StickyNote>

              <StickyNote seed="sa-school-list" className="overflow-x-auto">
                {schools.length === 0 ? (
                  <p className="opacity-70">{tr("Ei kouluja vielä.")}</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="py-2 pr-3">{tr("Koulun nimi")}</th>
                        <th className="py-2 pr-3">{tr("Koulukoodi")}</th>
                        <th className="py-2 pr-3">{tr("Tila")}</th>
                        <th className="py-2 pr-3">{tr("Laskutus aloitus")}</th>
                        <th className="py-2 pr-3">{tr("Vanhentuminen")}</th>
                        <th className="py-2 pr-3">{tr("Opettajat")}</th>
                        <th className="py-2 pr-3">{tr("Opiskelijat")}</th>
                        <th className="py-2 pr-3">{tr("Koulun admin")}</th>
                        <th className="py-2">{tr("Toiminnot")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((s) => (
                        <tr key={s.id} className="border-b border-black/5 align-top">
                          <td className="py-2 pr-3 font-medium">{s.name}</td>
                          <td className="py-2 pr-3">
                            <CopyCode code={s.code} />
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={
                                s.is_active
                                  ? "rounded-full bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-800"
                                  : "rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-semibold text-red-800"
                              }
                            >
                              {s.is_active ? tr("Aktiivinen") : tr("Vanhentuneet")}
                            </span>
                          </td>
                          <td className="py-2 pr-3 opacity-70">
                            {s.billing_start_date
                              ? new Date(s.billing_start_date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2 pr-3 opacity-70">
                            {s.billing_expiry_date
                              ? new Date(s.billing_expiry_date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2 pr-3">{s.teacherCount}</td>
                          <td className="py-2 pr-3">{s.studentCount}</td>
                          <td className="py-2 pr-3">{s.adminNames.join(", ") || "—"}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1.5">
                              {!s.is_active && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full"
                                  onClick={() => void onRenew(s)}
                                >
                                  {tr("Uusi")}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => void onEdit(s)}
                              >
                                {tr("Muokkaa")}
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-full" asChild>
                                <Link
                                  to="/superadmin/schools/$schoolId"
                                  params={{ schoolId: s.id }}
                                >
                                  {tr("Näytä")} <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => void onGenerate(s)}
                              >
                                {tr("Luo koodi")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </StickyNote>
            </>
          )}

          {tab === "billing" && (
            <StickyNote seed="sa-billing" className="space-y-3">
              <h2 className="text-2xl font-bold">{tr("Laskutus")}</h2>
              {schools.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 py-2 text-sm"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="opacity-70">
                    {s.billing_start_date
                      ? new Date(s.billing_start_date).toLocaleDateString()
                      : "—"}{" "}
                    →{" "}
                    {s.billing_expiry_date
                      ? new Date(s.billing_expiry_date).toLocaleDateString()
                      : "—"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => void onRenew(s)}
                  >
                    {tr("Uusi")}
                  </Button>
                </div>
              ))}
              {expired.length > 0 && (
                <p className="text-xs opacity-70">
                  {expired.length} × {tr("Vanhentuneet")}
                </p>
              )}
            </StickyNote>
          )}

          {tab === "users" && (
            <StickyNote seed="sa-users" className="space-y-2">
              <h2 className="text-2xl font-bold">{tr("Käyttäjät")}</h2>
              <p className="opacity-80">
                {tr("Opettajat")}: {totalTeachers} · {tr("Opiskelijat")}: {totalStudents}
              </p>
              <p className="text-sm opacity-70">
                {tr("Avaa koulu nähdäksesi ja muokataksesi sen käyttäjiä.")}
              </p>
              <ul className="space-y-1 text-sm">
                {schools.map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/superadmin/schools/$schoolId"
                      params={{ schoolId: s.id }}
                      className="font-semibold text-[color:var(--purple)] underline"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </StickyNote>
          )}

          {tab === "admins" && <SuperAdminsTab />}

          {tab === "emails" && (
            <>
              <EmailTemplatesTab />
              <EmailAnalyticsTab />
            </>
          )}


          {/* @lovable-new */}
          {tab === "materials" && <TeachingMaterialsTab />}

          {tab === "reports" && (
            <StickyNote seed="sa-reports" className="space-y-2">
              <h2 className="text-2xl font-bold">{tr("Raportit")}</h2>
              <p className="opacity-80">
                {tr("Koulut")}: {schools.length} · {tr("Opettajat")}: {totalTeachers} ·{" "}
                {tr("Opiskelijat")}: {totalStudents}
              </p>
              <p className="text-sm opacity-70">
                {tr("Avaa koulu nähdäksesi tarkemmat käyttötiedot.")}
              </p>
            </StickyNote>
          )}

          {tab === "settings" && (
            <StickyNote seed="sa-settings">
              <h2 className="text-2xl font-bold">{tr("Asetukset")}</h2>
              <p className="mt-2 text-sm opacity-70">
                {tr("Ylläpitäjätilit luodaan vain ylläpidon kautta.")}
              </p>
            </StickyNote>
          )}
        </main>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { useSuperAdminGuard } from "@/lib/superadmin-guard";
import {
  listFreeTrialsForSuperAdmin,
  listFreeTrialTimelineForSuperAdmin,
  extendFreeTrialForSuperAdmin,
  type FreeTrialAdminRow,
} from "@/lib/free-trial.functions";
import {
  endFreeTrialForSuperAdmin,
  extendFreeTrialRetentionForSuperAdmin,
  migrateFreeTrialToPaidSchool,
  permanentlyDeleteFreeTrialForSuperAdmin,
} from "@/lib/free-trial-admin.functions";

export const Route = createFileRoute("/superadmin/free-trials")({
  component: FreeTrialsDashboard,
});

type RoleView = "school_admin" | "teacher";
type StatusView = "active" | "expired" | "converted";

const labels = {
  en: {
    title: "Free Trials",
    subtitle: "Monitor trial activity, engagement and conversion opportunities.",
    principals: "Principal / School Admin",
    teachers: "Teachers",
    active: "Active",
    expired: "Expired",
    converted: "Converted",
    newWeek: "New this week",
    engaged: "Sales alert (60+)",
    expiring: "Expiring in 3 days",
    meetings: "High-intent leads",
    school: "School",
    contact: "Contact",
    location: "Location",
    end: "Trial ends",
    activity: "Activity",
    use: "Usage",
    source: "Source",
    actions: "Actions",
    days: "days",
    logins: "logins",
    classes: "classes",
    students: "students",
    referrals: "referrals",
    timeline: "Activity timeline",
    noRows: "No matching free trials.",
    noRowsHint: "Trial accounts matching this role and status will appear here.",
    salesOwner: "Sales owner",
    fiOwner: "Finnish Sales",
    svOwner: "Swedish Sales",
    enOwner: "International Sales",
    extend: "Extend trial",
    retention: "Extend retention",
    paid: "Convert to paid",
    migrate: "Migrate data",
    stop: "End trial",
    delete: "Delete",
    back: "Back to Super Admin",
    refresh: "Refresh",
  },
  fi: {
    title: "Maksuttomat kokeilut",
    subtitle: "Seuraa kokeilujen käyttöä, aktiivisuutta ja myyntimahdollisuuksia.",
    principals: "Rehtori / koulun ylläpitäjä",
    teachers: "Opettajat",
    active: "Aktiiviset",
    expired: "Päättyneet",
    converted: "Muunnettu maksulliseksi",
    newWeek: "Uudet tällä viikolla",
    engaged: "Myyntihälytys (60+)",
    expiring: "Päättyy 3 päivässä",
    meetings: "Vahva ostoaie",
    school: "Koulu",
    contact: "Yhteyshenkilö",
    location: "Sijainti",
    end: "Kokeilu päättyy",
    activity: "Aktiivisuus",
    use: "Käyttö",
    source: "Lähde",
    actions: "Toiminnot",
    days: "päivää",
    logins: "kirjautumista",
    classes: "luokkaa",
    students: "opiskelijaa",
    referrals: "suosittelua",
    timeline: "Tapahtumahistoria",
    noRows: "Ei vastaavia kokeiluja.",
    noRowsHint: "Tätä roolia ja tilaa vastaavat kokeilut näkyvät tässä.",
    salesOwner: "Myyntivastaava",
    fiOwner: "Suomen myynti",
    svOwner: "Ruotsin myynti",
    enOwner: "Kansainvälinen myynti",
    extend: "Jatka kokeilua",
    retention: "Jatka säilytystä",
    paid: "Muunna maksulliseksi",
    migrate: "Siirrä tiedot",
    stop: "Päätä kokeilu",
    delete: "Poista",
    back: "Takaisin ylläpitoon",
    refresh: "Päivitä",
  },
  sv: {
    title: "Gratis provperioder",
    subtitle: "Följ användning, engagemang och försäljningsmöjligheter.",
    principals: "Rektor / skoladministratör",
    teachers: "Lärare",
    active: "Aktiva",
    expired: "Avslutade",
    converted: "Konverterade",
    newWeek: "Nya denna vecka",
    engaged: "Säljlarm (60+)",
    expiring: "Slutar inom 3 dagar",
    meetings: "Stark köpavsikt",
    school: "Skola",
    contact: "Kontakt",
    location: "Plats",
    end: "Provperiod slutar",
    activity: "Aktivitet",
    use: "Användning",
    source: "Källa",
    actions: "Åtgärder",
    days: "dagar",
    logins: "inloggningar",
    classes: "klasser",
    students: "elever",
    referrals: "rekommendationer",
    timeline: "Aktivitetslinje",
    noRows: "Inga matchande provperioder.",
    noRowsHint: "Provperioder med vald roll och status visas här.",
    salesOwner: "Säljansvarig",
    fiOwner: "Finsk försäljning",
    svOwner: "Svensk försäljning",
    enOwner: "Internationell försäljning",
    extend: "Förläng provperiod",
    retention: "Förläng lagring",
    paid: "Konvertera till betald",
    migrate: "Flytta data",
    stop: "Avsluta provperiod",
    delete: "Radera",
    back: "Tillbaka till admin",
    refresh: "Uppdatera",
  },
} as const;

function FreeTrialsDashboard() {
  const ready = useSuperAdminGuard();
  const { language } = useLanguage();
  const text = labels[language];
  const list = useServerFn(listFreeTrialsForSuperAdmin);
  const timeline = useServerFn(listFreeTrialTimelineForSuperAdmin);
  const extend = useServerFn(extendFreeTrialForSuperAdmin);
  const endTrial = useServerFn(endFreeTrialForSuperAdmin);
  const extendRetention = useServerFn(extendFreeTrialRetentionForSuperAdmin);
  const migrate = useServerFn(migrateFreeTrialToPaidSchool);
  const deleteTrial = useServerFn(permanentlyDeleteFreeTrialForSuperAdmin);
  const [rows, setRows] = useState<FreeTrialAdminRow[]>([]);
  const [roleView, setRoleView] = useState<RoleView>("school_admin");
  const [statusView, setStatusView] = useState<StatusView>("active");
  const [openTrial, setOpenTrial] = useState<FreeTrialAdminRow | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await list());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [list]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => r.role === roleView)
        .filter((r) =>
          statusView === "active"
            ? r.status === "active"
            : statusView === "converted"
              ? r.status === "converted"
              : r.status === "expired" || r.status === "ended",
        )
        .sort((a, b) => {
          const priorityA =
            (a.engagementScore >= 60 ? 1000 : 0) + Math.max(0, 100 - a.daysLeft);
          const priorityB =
            (b.engagementScore >= 60 ? 1000 : 0) + Math.max(0, 100 - b.daysLeft);
          return priorityB - priorityA;
        }),
    [rows, roleView, statusView],
  );

  const weekAgo = Date.now() - 7 * 86400000;
  const summary = {
    active: rows.filter((r) => r.status === "active").length,
    newWeek: rows.filter((r) => new Date(r.registeredAt).getTime() >= weekAgo).length,
    engaged: rows.filter((r) => r.status === "active" && r.engagementScore >= 60).length,
    expiring: rows.filter((r) => r.status === "active" && r.daysLeft <= 3).length,
    highIntent: rows.filter((r) => r.status === "active" && r.engagementScore >= 80).length,
  };

  if (!ready) return null;

  async function open(row: FreeTrialAdminRow) {
    setOpenTrial(row);
    try {
      setEvents(await timeline({ data: { trialId: row.id } }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
      if (openTrial) await open(openTrial);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function ownerFor(row: FreeTrialAdminRow) {
    return row.language === "fi"
      ? text.fiOwner
      : row.language === "sv"
        ? text.svOwner
        : text.enOwner;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-8 text-[#2B2342]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-[#E5E7EB] bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#2B2342]">{text.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-[#5E5870]">{text.subtitle}</p>
              <Link
                to="/superadmin/dashboard"
                search={{ tab: "schools" }}
                className="mt-3 inline-block text-sm font-semibold text-[color:var(--purple-dark)] underline underline-offset-4 hover:text-[color:var(--purple)]"
              >
                {text.back}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void load()}
                className="rounded-full border-[#D7D3E2] bg-white text-[#2B2342] hover:bg-[#F5F2FB]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {text.refresh}
              </Button>
              <div className="rounded-full border border-[#E5E7EB] bg-white px-2 py-1">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label={text.active} value={summary.active} tone="purple" />
          <Metric label={text.newWeek} value={summary.newWeek} tone="mint" />
          <Metric label={text.engaged} value={summary.engaged} tone="yellow" />
          <Metric label={text.expiring} value={summary.expiring} tone="coral" />
          <Metric label={text.meetings} value={summary.highIntent} tone="purpleSoft" />
        </div>

        <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trial role">
              <Toggle
                active={roleView === "school_admin"}
                onClick={() => setRoleView("school_admin")}
              >
                {text.principals}
              </Toggle>
              <Toggle active={roleView === "teacher"} onClick={() => setRoleView("teacher")}>
                {text.teachers}
              </Toggle>
            </div>
            <span className="hidden h-8 w-px bg-[#E5E7EB] sm:block" />
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trial status">
              <Toggle active={statusView === "active"} onClick={() => setStatusView("active")}>
                {text.active}
              </Toggle>
              <Toggle active={statusView === "expired"} onClick={() => setStatusView("expired")}>
                {text.expired}
              </Toggle>
              <Toggle
                active={statusView === "converted"}
                onClick={() => setStatusView("converted")}
              >
                {text.converted}
              </Toggle>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-2 w-14 rounded-full bg-[color:var(--yellow)]" />
              <p className="text-lg font-bold text-[#2B2342]">{text.noRows}</p>
              <p className="mt-1 text-sm text-[#6B647A]">{text.noRowsHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm text-[#2B2342]">
                <thead className="bg-[#F7F5FB]">
                  <tr className="border-b border-[#E5E7EB]">
                    <Th>{text.school}</Th>
                    <Th>{text.contact}</Th>
                    <Th>{text.location}</Th>
                    <Th>{text.end}</Th>
                    <Th>{text.activity}</Th>
                    <Th>{text.use}</Th>
                    <Th>{text.source}</Th>
                    <Th>{text.actions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#ECEAF1] align-top last:border-b-0 hover:bg-[#FBFAFD]"
                    >
                      <Td>
                        <button
                          className="font-bold text-[color:var(--purple-dark)] underline decoration-[#C9BDEA] underline-offset-4 hover:text-[color:var(--purple)]"
                          onClick={() => void open(row)}
                        >
                          {row.schoolName}
                        </button>
                        <div className="mt-1 text-xs text-[#6B647A]">{ownerFor(row)}</div>
                      </Td>
                      <Td>
                        <div className="font-semibold">{row.contactName}</div>
                        <a
                          className="text-xs text-[color:var(--purple-dark)] underline underline-offset-2"
                          href={`mailto:${row.email}`}
                        >
                          {row.email}
                        </a>
                      </Td>
                      <Td>
                        {row.city}, {row.country}
                        <div className="mt-1 text-xs font-semibold uppercase text-[#6B647A]">
                          {row.language}
                        </div>
                      </Td>
                      <Td>
                        {new Date(row.trialEndsAt).toLocaleDateString()}
                        <div
                          className={
                            row.daysLeft <= 3 && row.status === "active"
                              ? "mt-1 text-xs font-bold text-[#B42318]"
                              : "mt-1 text-xs text-[#6B647A]"
                          }
                        >
                          {row.daysLeft} {text.days}
                        </div>
                      </Td>
                      <Td>
                        <Score value={row.engagementScore} category={row.engagementCategory} />
                        <div className="mt-1 text-xs text-[#6B647A]">
                          {row.loginCount} {text.logins}
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-1 text-[#4E475D]">
                          <div>{row.classCount} {text.classes}</div>
                          <div>{row.studentCount} {text.students}</div>
                          <div>{row.successfulReferrals} {text.referrals}</div>
                        </div>
                      </Td>
                      <Td>
                        <div className="font-semibold">{row.utmSource ?? "—"}</div>
                        <div className="mt-1 text-xs text-[#6B647A]">{row.utmCampaign ?? ""}</div>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void open(row)}
                          className="rounded-full border-[color:var(--purple)] bg-white font-semibold text-[color:var(--purple-dark)] hover:bg-[#F5F2FB]"
                        >
                          {text.timeline}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {openTrial && (
          <section className="space-y-5 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2342]">{openTrial.schoolName}</h2>
                <p className="mt-1 text-sm text-[#6B647A]">
                  {openTrial.contactName} · {openTrial.email} · {ownerFor(openTrial)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setOpenTrial(null)}
                className="h-9 w-9 rounded-full border-[#D7D3E2] bg-white p-0 text-[#2B2342]"
                aria-label="Close"
              >
                ×
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => {
                  const raw = window.prompt("Days to extend", "30");
                  const days = Number(raw);
                  if (Number.isInteger(days) && days > 0)
                    void action(() => extend({ data: { trialId: openTrial.id, days } }));
                }}
                className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple-dark)]"
              >
                {text.extend}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                className="rounded-full border-[#D7D3E2] bg-white text-[#2B2342] hover:bg-[#F5F2FB]"
                onClick={() => {
                  const raw = window.prompt("Retention days to add", "30");
                  const days = Number(raw);
                  if (Number.isInteger(days) && days > 0)
                    void action(() =>
                      extendRetention({ data: { trialId: openTrial.id, days } }),
                    );
                }}
              >
                {text.retention}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                asChild
                className="rounded-full border-[#D7D3E2] bg-white text-[#2B2342] hover:bg-[#F5F2FB]"
              >
                <Link to="/superadmin/dashboard" search={{ tab: "schools" }}>
                  {text.paid}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                className="rounded-full border-[#D7D3E2] bg-white text-[#2B2342] hover:bg-[#F5F2FB]"
                onClick={() => {
                  const paidSchoolId = window.prompt(
                    "After creating the paid school in Schools, paste its School ID here",
                  );
                  if (paidSchoolId)
                    void action(() => migrate({ data: { trialId: openTrial.id, paidSchoolId } }));
                }}
              >
                {text.migrate}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                className="rounded-full border-[#F0B2AE] bg-white text-[#9C2F2A] hover:bg-[#FFF3F2]"
                onClick={() => {
                  if (window.confirm(`${text.stop}: ${openTrial.schoolName}?`))
                    void action(() => endTrial({ data: { trialId: openTrial.id } }));
                }}
              >
                {text.stop}
              </Button>
              <Button
                disabled={busy}
                variant="destructive"
                className="rounded-full"
                onClick={() => {
                  const typed = window.prompt(
                    `Type ${openTrial.schoolName} to confirm permanent deletion`,
                  );
                  if (typed === openTrial.schoolName)
                    void action(() =>
                      deleteTrial({
                        data: { trialId: openTrial.id, confirmSchoolName: typed },
                      }),
                    );
                }}
              >
                {text.delete}
              </Button>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-bold text-[#2B2342]">{text.timeline}</h3>
              <div className="max-h-80 space-y-2 overflow-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[#2B2342]"
                  >
                    <div className="flex justify-between gap-4">
                      <strong>{event.event_name}</strong>
                      <span className="text-xs text-[#6B647A]">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    {event.event_properties && Object.keys(event.event_properties).length > 0 && (
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-[#6B647A]">
                        {JSON.stringify(event.event_properties)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "purple" | "mint" | "yellow" | "coral" | "purpleSoft";
}) {
  const toneClass = {
    purple: "border-t-[color:var(--purple)]",
    mint: "border-t-[color:var(--mint)]",
    yellow: "border-t-[color:var(--yellow)]",
    coral: "border-t-[color:var(--coral)]",
    purpleSoft: "border-t-[color:var(--purple-dark)]",
  }[tone];

  return (
    <div
      className={`rounded-3xl border border-[#E5E7EB] border-t-4 ${toneClass} bg-white p-5 shadow-sm`}
    >
      <div className="text-3xl font-bold text-[#2B2342]">{value}</div>
      <div className="mt-1 text-xs font-bold text-[#5E5870]">{label}</div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full bg-[color:var(--purple)] px-4 py-2 text-sm font-bold text-white shadow-sm"
          : "rounded-full border border-[#D7D3E2] bg-white px-4 py-2 text-sm font-bold text-[#4E3A78] hover:bg-[#F5F2FB]"
      }
    >
      {children}
    </button>
  );
}

function Score({ value, category }: { value: number; category: string }) {
  const tone =
    value >= 70
      ? "border-[#B7E4C7] bg-[#EAF8EF] text-[#166534]"
      : value >= 35
        ? "border-[#F0D98A] bg-[#FFF8D9] text-[#6B5100]"
        : "border-[#F1B8B5] bg-[#FFF0EF] text-[#9C2F2A]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      {value}/100 · {category}
    </span>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#5E5870]">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4">{children}</td>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { useSuperAdminGuard } from "@/lib/superadmin-guard";
import { listFreeTrialsForSuperAdmin, listFreeTrialTimelineForSuperAdmin, extendFreeTrialForSuperAdmin, type FreeTrialAdminRow } from "@/lib/free-trial.functions";
import { endFreeTrialForSuperAdmin, extendFreeTrialRetentionForSuperAdmin, migrateFreeTrialToPaidSchool, permanentlyDeleteFreeTrialForSuperAdmin } from "@/lib/free-trial-admin.functions";

export const Route = createFileRoute("/superadmin/free-trials")({ component: FreeTrialsDashboard });

type RoleView = "school_admin" | "teacher";
type StatusView = "active" | "expired" | "converted";

const labels = {
  en: { title: "Free Trials", principals: "Principal / School Admin", teachers: "Teachers", active: "Active", expired: "Expired", converted: "Converted", newWeek: "New this week", engaged: "Sales alert (60+)", expiring: "Expiring in 3 days", meetings: "High-intent leads", school: "School", contact: "Contact", location: "Location", end: "Trial ends", activity: "Activity", use: "Usage", source: "Source", actions: "Actions", days: "days", logins: "logins", classes: "classes", students: "students", referrals: "referrals", timeline: "Activity timeline", noRows: "No matching free trials.", salesOwner: "Sales owner", fiOwner: "Finnish Sales", svOwner: "Swedish Sales", enOwner: "International Sales", extend: "Extend trial", retention: "Extend retention", paid: "Convert to paid", stop: "End trial", delete: "Delete", back: "Back to Super Admin", refresh: "Refresh" },
  fi: { title: "Maksuttomat kokeilut", principals: "Rehtori / koulun ylläpitäjä", teachers: "Opettajat", active: "Aktiiviset", expired: "Päättyneet", converted: "Muunnettu maksulliseksi", newWeek: "Uudet tällä viikolla", engaged: "Myyntihälytys (60+)", expiring: "Päättyy 3 päivässä", meetings: "Vahva ostoaie", school: "Koulu", contact: "Yhteyshenkilö", location: "Sijainti", end: "Kokeilu päättyy", activity: "Aktiivisuus", use: "Käyttö", source: "Lähde", actions: "Toiminnot", days: "päivää", logins: "kirjautumista", classes: "luokkaa", students: "opiskelijaa", referrals: "suosittelua", timeline: "Tapahtumahistoria", noRows: "Ei vastaavia kokeiluja.", salesOwner: "Myyntivastaava", fiOwner: "Suomen myynti", svOwner: "Ruotsin myynti", enOwner: "Kansainvälinen myynti", extend: "Jatka kokeilua", retention: "Jatka säilytystä", paid: "Muunna maksulliseksi", stop: "Päätä kokeilu", delete: "Poista", back: "Takaisin ylläpitoon", refresh: "Päivitä" },
  sv: { title: "Gratis provperioder", principals: "Rektor / skoladministratör", teachers: "Lärare", active: "Aktiva", expired: "Avslutade", converted: "Konverterade", newWeek: "Nya denna vecka", engaged: "Säljlarm (60+)", expiring: "Slutar inom 3 dagar", meetings: "Stark köpavsikt", school: "Skola", contact: "Kontakt", location: "Plats", end: "Provperiod slutar", activity: "Aktivitet", use: "Användning", source: "Källa", actions: "Åtgärder", days: "dagar", logins: "inloggningar", classes: "klasser", students: "elever", referrals: "rekommendationer", timeline: "Aktivitetslinje", noRows: "Inga matchande provperioder.", salesOwner: "Säljansvarig", fiOwner: "Finsk försäljning", svOwner: "Svensk försäljning", enOwner: "Internationell försäljning", extend: "Förläng provperiod", retention: "Förläng lagring", paid: "Konvertera till betald", stop: "Avsluta provperiod", delete: "Radera", back: "Tillbaka till admin", refresh: "Uppdatera" },
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

  const load = useCallback(async () => { try { setRows(await list()); } catch (e) { toast.error((e as Error).message); } }, [list]);
  useEffect(() => { if (ready) void load(); }, [ready, load]);

  const filtered = useMemo(() => rows
    .filter((r) => r.role === roleView)
    .filter((r) => statusView === "active" ? r.status === "active" : statusView === "converted" ? r.status === "converted" : r.status === "expired" || r.status === "ended")
    .sort((a, b) => {
      const priorityA = (a.engagementScore >= 60 ? 1000 : 0) + Math.max(0, 100 - a.daysLeft);
      const priorityB = (b.engagementScore >= 60 ? 1000 : 0) + Math.max(0, 100 - b.daysLeft);
      return priorityB - priorityA;
    }), [rows, roleView, statusView]);

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
    try { setEvents(await timeline({ data: { trialId: row.id } })); } catch (e) { toast.error((e as Error).message); }
  }

  async function action(fn: () => Promise<unknown>) {
    setBusy(true); try { await fn(); await load(); if (openTrial) await open(openTrial); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  function ownerFor(row: FreeTrialAdminRow) { return row.language === "fi" ? text.fiOwner : row.language === "sv" ? text.svOwner : text.enOwner; }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-4xl font-bold">{text.title}</h1><Link to="/superadmin/dashboard" search={{ tab: "schools" }} className="mt-1 inline-block text-sm underline opacity-70">{text.back}</Link></div>
          <div className="flex items-center gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />{text.refresh}</Button><LanguageSwitcher /></div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label={text.active} value={summary.active}/><Metric label={text.newWeek} value={summary.newWeek}/><Metric label={text.engaged} value={summary.engaged}/><Metric label={text.expiring} value={summary.expiring}/><Metric label={text.meetings} value={summary.highIntent}/>
        </div>

        <div className="flex flex-wrap gap-2">
          <Toggle active={roleView === "school_admin"} onClick={() => setRoleView("school_admin")}>{text.principals}</Toggle>
          <Toggle active={roleView === "teacher"} onClick={() => setRoleView("teacher")}>{text.teachers}</Toggle>
          <span className="mx-1 w-px bg-black/10" />
          <Toggle active={statusView === "active"} onClick={() => setStatusView("active")}>{text.active}</Toggle>
          <Toggle active={statusView === "expired"} onClick={() => setStatusView("expired")}>{text.expired}</Toggle>
          <Toggle active={statusView === "converted"} onClick={() => setStatusView("converted")}>{text.converted}</Toggle>
        </div>

        <StickyNote seed="free-trials-table" className="overflow-x-auto">
          {filtered.length === 0 ? <p className="opacity-65">{text.noRows}</p> : <table className="w-full min-w-[1050px] text-left text-sm">
            <thead><tr className="border-b border-black/10"><Th>{text.school}</Th><Th>{text.contact}</Th><Th>{text.location}</Th><Th>{text.end}</Th><Th>{text.activity}</Th><Th>{text.use}</Th><Th>{text.source}</Th><Th>{text.actions}</Th></tr></thead>
            <tbody>{filtered.map((row) => <tr key={row.id} className="border-b border-black/5 align-top">
              <Td><button className="font-bold underline" onClick={() => void open(row)}>{row.schoolName}</button><div className="mt-1 text-xs opacity-60">{ownerFor(row)}</div></Td>
              <Td><div>{row.contactName}</div><a className="text-xs underline" href={`mailto:${row.email}`}>{row.email}</a></Td>
              <Td>{row.city}, {row.country}<div className="text-xs uppercase opacity-60">{row.language}</div></Td>
              <Td>{new Date(row.trialEndsAt).toLocaleDateString()}<div className={row.daysLeft <= 3 && row.status === "active" ? "font-bold text-red-700" : "text-xs opacity-60"}>{row.daysLeft} {text.days}</div></Td>
              <Td><Score value={row.engagementScore} category={row.engagementCategory}/><div className="text-xs opacity-60">{row.loginCount} {text.logins}</div></Td>
              <Td>{row.classCount} {text.classes}<br/>{row.studentCount} {text.students}<br/>{row.successfulReferrals} {text.referrals}</Td>
              <Td>{row.utmSource ?? "—"}<div className="text-xs opacity-60">{row.utmCampaign ?? ""}</div></Td>
              <Td><Button size="sm" variant="outline" onClick={() => void open(row)}>{text.timeline}</Button></Td>
            </tr>)}</tbody>
          </table>}
        </StickyNote>

        {openTrial && <StickyNote seed={`free-trial-${openTrial.id}`} className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{openTrial.schoolName}</h2><p className="text-sm opacity-70">{openTrial.contactName} · {openTrial.email} · {ownerFor(openTrial)}</p></div><Button variant="outline" onClick={() => setOpenTrial(null)}>×</Button></div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => { const raw = window.prompt("Days to extend", "30"); const days = Number(raw); if (Number.isInteger(days) && days > 0) void action(() => extend({ data: { trialId: openTrial.id, days } })); }}>{text.extend}</Button>
            <Button disabled={busy} variant="outline" onClick={() => { const raw = window.prompt("Retention days to add", "30"); const days = Number(raw); if (Number.isInteger(days) && days > 0) void action(() => extendRetention({ data: { trialId: openTrial.id, days } })); }}>{text.retention}</Button>
            <Button disabled={busy} variant="outline" asChild><Link to="/superadmin/dashboard" search={{ tab: "schools" }}>{text.paid}<ExternalLink className="ml-2 h-4 w-4"/></Link></Button>
            <Button disabled={busy} variant="outline" onClick={() => { const paidSchoolId = window.prompt("After creating the paid school in Schools, paste its School ID here"); if (paidSchoolId) void action(() => migrate({ data: { trialId: openTrial.id, paidSchoolId } })); }}>Migrate data</Button>
            <Button disabled={busy} variant="outline" onClick={() => { if (window.confirm(`${text.stop}: ${openTrial.schoolName}?`)) void action(() => endTrial({ data: { trialId: openTrial.id } })); }}>{text.stop}</Button>
            <Button disabled={busy} variant="destructive" onClick={() => { const typed = window.prompt(`Type ${openTrial.schoolName} to confirm permanent deletion`); if (typed === openTrial.schoolName) void action(() => deleteTrial({ data: { trialId: openTrial.id, confirmSchoolName: typed } })); }}>{text.delete}</Button>
          </div>
          <div><h3 className="mb-2 text-lg font-bold">{text.timeline}</h3><div className="max-h-80 space-y-2 overflow-auto">{events.map((event) => <div key={event.id} className="rounded-2xl bg-black/5 px-4 py-3"><div className="flex justify-between gap-4"><strong>{event.event_name}</strong><span className="text-xs opacity-60">{new Date(event.created_at).toLocaleString()}</span></div>{event.event_properties && Object.keys(event.event_properties).length > 0 && <pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs opacity-60">{JSON.stringify(event.event_properties)}</pre>}</div>)}</div></div>
        </StickyNote>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl bg-white/85 p-4 shadow-sm"><div className="text-3xl font-bold">{value}</div><div className="text-xs font-semibold opacity-60">{label}</div></div>; }
function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-[color:var(--purple)] text-white" : "bg-white/80"}`}>{children}</button>; }
function Score({ value, category }: { value: number; category: string }) { return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${value >= 70 ? "bg-green-100 text-green-800" : value >= 35 ? "bg-yellow-100 text-yellow-900" : "bg-red-100 text-red-800"}`}>{value}/100 · {category}</span>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="p-2">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="p-2">{children}</td>; }

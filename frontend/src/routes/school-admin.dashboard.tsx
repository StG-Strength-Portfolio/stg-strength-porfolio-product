import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileSettings } from "@/components/ProfileSettings";
import { supabase } from "@/integrations/supabase/client";
import { useRoleGuard } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";
import { WORLDS } from "@/lib/screens";
import {
  computeStudentStats,
  formatLastActive,
  studentStatus,
  STATUS_LABEL,
  STATUS_TONE,
  TOTAL_REQUIRED,
  worldCompletion,
} from "@/lib/teacher-data";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { getStrengthName } from "@/lib/strengths-i18n";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { StudentDetailReport } from "@/components/students/StudentDetailReport";

import { useLanguage } from "@/lib/i18n";
import {
  getSchoolAdminData,
  createTeacherCode,
  revokeTeacherCode,
  promoteToSchoolAdmin,
  getStudentPortfolio,
  type SchoolAdminData,
  type SchoolAdminClass,
} from "@/lib/schooladmin.functions";
import {
  createDemoTeacherCode,
  getDemoSchoolAdminData,
  onDemoStateChange,
  promoteDemoTeacher,
  revokeDemoTeacherCode,
} from "@/lib/demo-store";
import { getDemoStudentPortfolio } from "@/lib/demo-community";
import { ReportTrends, RangeSelector } from "@/components/reports/ReportTrends";
import type { RangeDays, ReportEvent } from "@/lib/report-series";

export const Route = createFileRoute("/school-admin/dashboard")({
  head: () => ({
    meta: [
      { title: "School admin dashboard — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "School-wide overview of students, teachers, registration codes and strengths progress in Vahvuusseikkailu.",
      },
      { property: "og:title", content: "School admin dashboard — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Manage teachers, students and teacher codes for your school.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolAdminDashboard,
});

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString() : "—";
}

function SchoolAdminDashboard() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const guard = useRoleGuard(["school_admin"]);
  const [tab, setTab] = useState("overview");
  const [days, setDays] = useState<RangeDays>(30);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [showPortfolio, setShowPortfolio] = useState(false);

  const [data, setData] = useState<SchoolAdminData | null>(null);

  const fetchData = useServerFn(getSchoolAdminData);
  const genCode = useServerFn(createTeacherCode);
  const revoke = useServerFn(revokeTeacherCode);
  const promote = useServerFn(promoteToSchoolAdmin);

  const load = useCallback(async () => {
    try {
      if (guard.preview) {
        setData(getDemoSchoolAdminData(language));
        return;
      }
      setData(await fetchData());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchData, guard.preview, language]);

  useEffect(() => {
    if (!guard.ready) return;
    void load();
    if (guard.preview) return onDemoStateChange(() => void load());
  }, [guard.preview, guard.ready, load]);

  const derived = useMemo(() => {
    const students = data?.students ?? [];
    const rows = students.map((s) => {
      const filled = new Set(s.filledKeys);
      const stats = computeStudentStats(filled, s.currentScreen ?? 1);
      return {
        ...s,
        screensFilled: stats.screensFilled,
        pct: Math.round((stats.screensFilled / TOTAL_REQUIRED) * 100),
        worlds: worldCompletion(filled, s.currentScreen ?? 1),
      };
    });
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const activeThisMonth = rows.filter(
      (r) => r.lastActive && new Date(r.lastActive).getTime() > monthAgo,
    ).length;
    const avgCompletion = rows.length
      ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length)
      : 0;
    const modules = WORLDS.map((w, i) => {
      let done = 0;
      let total = 0;
      for (const r of rows) {
        const x = r.worlds[i];
        done += x.done;
        total += x.total;
      }
      return { id: w.id, label: w.title, pct: total ? Math.round((done / total) * 100) : 0 };
    });
    return { rows, activeThisMonth, avgCompletion, modules };
  }, [data]);

  if (!guard.ready) return null;

  const tabs = [
    { id: "overview", label: tr("Yhteenveto") },
    { id: "classes", label: tr("Luokat") },
    { id: "students", label: tr("Opiskelijat") },
    { id: "teachers", label: tr("Opettajat") },
    { id: "codes", label: tr("Opettajakoodit") },
    { id: "reports", label: tr("Raportit") },
    { id: "settings", label: tr("Asetukset") },
  ];

  async function onGenerate() {
    try {
      if (guard.preview) {
        const code = createDemoTeacherCode();
        toast.success(`${tr("Koodi luotu!")} ${code}`);
        await load();
        return;
      }
      const res = await genCode({});
      toast.success(`${tr("Koodi luotu!")} ${res.code}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <DashboardShell
      title={tr("Koulun hallintapaneeli")}
      tabs={tabs}
      active={tab}
      onSelect={(id) => {
        setTab(id);
        setOpenClass(null);
        setOpenStudent(null);
      }}
      schoolName={data?.school?.name ?? guard.schoolName}
      links={[{ to: "/school-admin/give-strength", label: tr("Anna vahvuus opettajalle") }]}
      sections={[
        {
          label: tr("Opeta"),
          links: [{ to: "/school-admin/teach/materials", label: tr("Opetusmateriaalit") }],
        },
      ]}
    >
      {tab === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={tr("Opiskelijoiden määrä")} value={String(derived.rows.length)} />
            <MetricCard label={tr("Opettajien määrä")} value={String(data?.teachers.length ?? 0)} />
            <MetricCard
              label={tr("Aktiiviset tässä kuussa")}
              value={String(derived.activeThisMonth)}
            />
            <MetricCard
              label={tr("Keskimääräinen valmistuminen")}
              value={`${derived.avgCompletion} %`}
            />
          </div>
          <SchoolTopStrengths data={data} lang={lang} />
        </>
      )}

      {tab === "classes" && !openClass && (
        <div className="grid gap-3 md:grid-cols-2">
          {(data?.classes.length ?? 0) === 0 && <p className="opacity-70">{tr("Ei luokkia.")}</p>}
          {(data?.classes ?? []).map((c) => {
            const inClass = derived.rows.filter((r) => r.classId === c.id);
            const avg = inClass.length
              ? Math.round(inClass.reduce((a, r) => a + r.pct, 0) / inClass.length)
              : 0;
            return (
              <StickyNote key={c.id} seed={`sa-cls-${c.id}`} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setOpenClass(c.id)}
                  className="text-left text-xl font-bold underline-offset-2 hover:underline"
                >
                  {c.name}
                </button>
                <div className="text-sm opacity-80">
                  {tr("Opettaja")}: {c.teacherName ?? "—"}
                </div>
                <div className="text-sm">
                  {tr("Opiskelijoita")}: {inClass.length} · {tr("Valmistuminen %")}: {avg} %
                </div>
              </StickyNote>
            );
          })}
        </div>
      )}

      {tab === "classes" && openClass && !openStudent && (
        <SchoolAdminClassReport
          cls={data?.classes.find((c) => c.id === openClass) ?? null}
          rows={derived.rows.filter((r) => r.classId === openClass)}
          events={(data?.events ?? []).filter((e) => e.classId === openClass)}
          lang={lang}
          onBack={() => setOpenClass(null)}
          onOpenStudent={(id) => {
            setOpenStudent(id);
            setShowPortfolio(false);
          }}
        />
      )}

      {openStudent && showPortfolio && (tab === "classes" || tab === "students") && (
        <SchoolAdminPortfolio
          userId={openStudent}
          preview={guard.preview}
          crumbs={
            tab === "classes"
              ? [tr("Luokat"), data?.classes.find((c) => c.id === openClass)?.name ?? ""]
              : [tr("Opiskelijat")]
          }
          onBack={() => setShowPortfolio(false)}
        />
      )}

      {openStudent &&
        !showPortfolio &&
        (tab === "classes" || tab === "students") &&
        (() => {
          const s = derived.rows.find((r) => r.id === openStudent);
          if (!s) return null;
          return (
            <StudentDetailReport
              name={s.name}
              className={s.className}
              email={s.email}
              lastActive={s.lastActive}
              currentScreen={s.currentScreen}
              screensFilled={s.screensFilled}
              filledKeys={s.filledKeys}
              strengthIds={s.strengthIds}
              header={
                <Breadcrumbs
                  items={[
                    tab === "classes"
                      ? { label: tr("Luokat"), onClick: () => setOpenStudent(null) }
                      : { label: tr("Opiskelijat"), onClick: () => setOpenStudent(null) },
                    ...(tab === "classes"
                      ? [
                          {
                            label: data?.classes.find((c) => c.id === openClass)?.name ?? "",
                            onClick: () => setOpenStudent(null),
                          },
                        ]
                      : []),
                    { label: s.name ?? tr("Opiskelija") },
                  ]}
                />
              }
              onBack={() => setOpenStudent(null)}
              portfolioAction={
                <Button
                  className="rounded-full bg-[color:var(--purple)] text-white hover:bg-[color:var(--purple)]/90"
                  onClick={() => setShowPortfolio(true)}
                >
                  {tr("Avaa portfolio")}
                </Button>
              }
            />
          );
        })()}

      {tab === "students" && !openStudent && (
        <StickyNote seed="sa-students" className="overflow-x-auto">
          {derived.rows.length === 0 ? (
            <p className="opacity-70">{tr("Ei opiskelijoita.")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-2 pr-3">{tr("Nimi")}</th>
                  <th className="py-2 pr-3">{tr("Sähköposti")}</th>
                  <th className="py-2 pr-3">{tr("Luokka")}</th>
                  <th className="py-2 pr-3">{tr("Viimeksi aktiivinen")}</th>
                  <th className="py-2 pr-3">{tr("Valmistuminen %")}</th>
                  <th className="py-2">{tr("Tila")}</th>
                </tr>
              </thead>
              <tbody>
                {derived.rows.map((s) => (
                  <tr key={s.id} className="border-b border-black/5">
                    <td className="py-2 pr-3 font-medium">
                      <button
                        type="button"
                        className="underline-offset-2 hover:underline"
                        onClick={() => setOpenStudent(s.id)}
                      >
                        {s.name ?? "—"}
                      </button>
                    </td>
                    <td className="py-2 pr-3 opacity-80">{s.email ?? "—"}</td>
                    <td className="py-2 pr-3">{s.className ?? "—"}</td>
                    <td className="py-2 pr-3 opacity-70">
                      {formatLastActive(s.lastActive ? new Date(s.lastActive) : null, tr)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{s.pct} %</td>
                    <td className="py-2">
                      <StatusPill
                        status={studentStatus({
                          pct: s.pct,
                          currentScreen: s.currentScreen,
                          lastActive: s.lastActive,
                        })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </StickyNote>
      )}

      {tab === "teachers" && (
        <StickyNote seed="sa-teachers" className="overflow-x-auto">
          {(data?.teachers.length ?? 0) === 0 ? (
            <p className="opacity-70">{tr("Ei opettajia.")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-2 pr-3">{tr("Nimi")}</th>
                  <th className="py-2 pr-3">{tr("Sähköposti")}</th>
                  <th className="py-2 pr-3">{tr("Luokkia")}</th>
                  <th className="py-2 pr-3">{tr("Opiskelijoita")}</th>
                  <th className="py-2 pr-3">{tr("Viimeksi aktiivinen")}</th>
                  <th className="py-2">{tr("Toiminnot")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.teachers ?? []).map((t) => (
                  <TeacherRow
                    key={t.id}
                    teacher={t}
                    onPromote={async () => {
                      try {
                        if (guard.preview) {
                          promoteDemoTeacher(t.id);
                        } else {
                          await promote({ data: { userId: t.id } });
                        }
                        toast.success(tr("Sinut on nimitetty koulun adminiksi!"));
                        await load();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </StickyNote>
      )}

      {tab === "codes" && (
        <>
          <StickyNote seed="sa-codes-new">
            <Button
              onClick={() => void onGenerate()}
              className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {tr("Luo opettajakoodi")}
            </Button>
          </StickyNote>
          <StickyNote seed="sa-codes" className="overflow-x-auto">
            {(data?.codes.length ?? 0) === 0 ? (
              <p className="opacity-70">{tr("Ei vielä koodeja.")}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="py-2 pr-3">{tr("Koodi")}</th>
                    <th className="py-2 pr-3">{tr("Tila")}</th>
                    <th className="py-2 pr-3">{tr("Käyttäjä")}</th>
                    <th className="py-2 pr-3">{tr("Luotu")}</th>
                    <th className="py-2">{tr("Toiminnot")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.codes ?? []).map((c) => (
                    <tr key={c.id} className="border-b border-black/5">
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-2">
                          <code className="font-mono">{c.code}</code>
                          <button
                            type="button"
                            aria-label={tr("Kopioi")}
                            title={tr("Kopioi")}
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
                        {c.is_revoked
                          ? tr("Poista")
                          : c.is_used
                            ? tr("Käytetty")
                            : tr("Käyttämätön")}
                      </td>
                      <td className="py-2 pr-3">{c.used_by ?? "—"}</td>
                      <td className="py-2 pr-3 opacity-70">{fmtDate(c.created_at)}</td>
                      <td className="py-2">
                        {!c.is_revoked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={async () => {
                              if (guard.preview) {
                                revokeDemoTeacherCode(c.id);
                              } else {
                                await revoke({ data: { id: c.id } });
                              }
                              await load();
                            }}
                          >
                            {tr("Poista")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </StickyNote>
        </>
      )}

      {tab === "reports" && (
        <>
          <StickyNote seed="sa-report-eng" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold">{tr("Raportit")}</h2>
              <RangeSelector value={days} onChange={setDays} />
            </div>
            <p className="opacity-80">
              {tr("Opiskelijat")}: {derived.rows.length} · {tr("Opettajat")}:{" "}
              {data?.teachers.length ?? 0} · {tr("Keskimääräinen valmistuminen")}:{" "}
              {derived.avgCompletion} %
            </p>
          </StickyNote>
          <ReportTrends
            events={data?.events ?? []}
            days={days}
            studentCount={derived.rows.length}
            totalRequired={TOTAL_REQUIRED}
            classes={data?.classes ?? []}
            seedPrefix="sa"
          />
          <StickyNote seed="sa-report-strength" className="space-y-2">
            <h3 className="text-xl font-bold">{tr("Suosituimmat vahvuudet")}</h3>
            {(data?.strengthCounts.length ?? 0) === 0 ? (
              <p className="opacity-70">{tr("Ei annettuja vahvuuksia.")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(data?.strengthCounts ?? []).slice(0, 10).map((s) => (
                  <li key={s.strengthId}>
                    {getStrengthName(Number(s.strengthId), lang)} — {s.count}
                  </li>
                ))}
              </ul>
            )}
          </StickyNote>
          <StickyNote seed="sa-report-risk" className="space-y-2">
            <h3 className="text-xl font-bold">{tr("Riskissä olevat opiskelijat")}</h3>
            <ul className="space-y-1 text-sm">
              {derived.rows
                .filter(
                  (r) =>
                    !r.lastActive ||
                    Date.now() - new Date(r.lastActive).getTime() > 14 * 24 * 3600 * 1000,
                )
                .map((r) => (
                  <li key={r.id}>
                    {r.name ?? "—"} — {tr("Ei aktiivinen 14 päivään")}
                  </li>
                ))}
            </ul>
          </StickyNote>
        </>
      )}

      {tab === "settings" && (
        <ProfileSettings
          schoolName={data?.school?.name ?? guard.schoolName}
          displayName={guard.displayName}
          email={guard.email}
        />
      )}
    </DashboardShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
      <div className="text-[0.7rem] uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-3xl font-bold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

function TeacherRow({
  teacher,
  onPromote,
}: {
  teacher: SchoolAdminData["teachers"][number];
  onPromote: () => Promise<void>;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b border-black/5">
        <td className="py-2 pr-3 font-medium">{teacher.name ?? "—"}</td>
        <td className="py-2 pr-3 opacity-80">{teacher.email ?? "—"}</td>
        <td className="py-2 pr-3">{teacher.classCount}</td>
        <td className="py-2 pr-3">{teacher.studentCount}</td>
        <td className="py-2 pr-3 opacity-70">{fmtDate(teacher.lastActive)}</td>
        <td className="py-2">
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen((v) => !v)}
            >
              {tr("Näytä luokat")}
            </Button>
            {teacher.role !== "school_admin" && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => void onPromote()}
              >
                {tr("Nimeä adminiksi")}
              </Button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-black/5 bg-black/5">
          <td colSpan={6} className="px-3 py-2 text-xs">
            {teacher.classNames.length ? teacher.classNames.join(", ") : tr("Ei luokkia.")}
          </td>
        </tr>
      )}
    </>
  );
}

function tally(students: { strengthIds: number[] }[]) {
  const total = new Map<number, number>();
  const byStudent = new Map<number, Set<number>>();
  students.forEach((s, idx) => {
    for (const id of s.strengthIds) {
      total.set(id, (total.get(id) ?? 0) + 1);
      const set = byStudent.get(id) ?? new Set<number>();
      set.add(idx);
      byStudent.set(id, set);
    }
  });
  return Array.from(total, ([id, count]) => ({
    id,
    count,
    students: byStudent.get(id)?.size ?? 0,
  })).sort((a, b) => b.count - a.count || a.id - b.id);
}

function SchoolTopStrengths({
  data,
  lang,
}: {
  data: SchoolAdminData | null;
  lang: "fi" | "sv" | "en";
}) {
  const tr = useTr();
  const students = data?.students ?? [];
  const schoolTop = tally(students).slice(0, 5);

  return (
    <>
      <StickyNote seed="sa-top-strengths" className="space-y-3">
        <h2 className="text-2xl font-bold">{tr("Koulun suosituimmat vahvuudet")}</h2>
        {schoolTop.length === 0 ? (
          <p className="text-sm opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
        ) : (
          <TopStrengthCards
            items={schoolTop.map((s) => ({
              id: s.id,
              count: s.count,
              caption: `${s.students} ${tr("oppilasta")}`,
            }))}
            lang={lang}
          />
        )}
      </StickyNote>

      <StickyNote seed="sa-class-strengths" className="space-y-4">
        <h2 className="text-2xl font-bold">{tr("Luokkakohtaiset vahvuudet")}</h2>
        {(data?.classes ?? []).length === 0 ? (
          <p className="text-sm opacity-70">{tr("Ei luokkia.")}</p>
        ) : (
          (data?.classes ?? []).map((c) => {
            const inClass = students.filter((s) => s.classId === c.id);
            const top = tally(inClass);
            return (
              <div key={c.id} className="space-y-2 rounded-3xl border border-black/10 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold">
                    {c.name}
                    {c.teacherName ? ` — ${c.teacherName}` : ""}
                  </h3>
                  <span className="text-xs opacity-70">
                    {tr("Löydettyjä vahvuuksia")}: {top.length} / 26
                  </span>
                </div>
                {top.length === 0 ? (
                  <p className="text-xs opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
                ) : (
                  <TopStrengthCards
                    items={top.slice(0, 5).map((s) => ({ id: s.id, count: s.count }))}
                    lang={lang}
                    size="sm"
                  />
                )}
              </div>
            );
          })
        )}
      </StickyNote>
    </>
  );
}

export function StatusPill({ status }: { status: ReturnType<typeof studentStatus> }) {
  const tr = useTr();
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>
      {tr(STATUS_LABEL[status])}
    </span>
  );
}

function Breadcrumbs({ items }: { items: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm opacity-80">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-50">/</span>}
          {it.onClick ? (
            <button
              type="button"
              onClick={it.onClick}
              className="underline-offset-2 hover:underline"
            >
              {it.label}
            </button>
          ) : (
            <span className="font-semibold">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function SchoolAdminPortfolio({
  userId,
  crumbs,
  onBack,
  preview,
}: {
  userId: string;
  crumbs: string[];
  onBack: () => void;
  preview: boolean;
}) {
  const tr = useTr();
  const fetchPortfolio = useServerFn(getStudentPortfolio);
  const [state, setState] = useState<{
    name: string | null;
    currentScreen: number | null;
    responses: Map<string, unknown>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = preview
          ? getDemoStudentPortfolio(userId)
          : ((await fetchPortfolio({ data: { userId } })) as {
              name: string | null;
              currentScreen: number | null;
              responses: { field_key: string; value: unknown }[];
            });
        if (cancelled) return;
        const m = new Map<string, unknown>();
        for (const r of res.responses) m.set(r.field_key, r.value);
        setState({ name: res.name, currentScreen: res.currentScreen, responses: m });
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPortfolio, preview, userId]);

  if (!state) return <p className="opacity-70">{tr("Ladataan…")}</p>;

  return (
    <PortfolioView
      name={state.name}
      currentScreen={state.currentScreen}
      responses={state.responses}
      header={
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              ...crumbs.map((c) => ({
                label: c,
                onClick: onBack,
              })),
              { label: `${state.name ?? tr("Opiskelija")} — ${tr("Portfolio")}` },
            ]}
          />
          <Button variant="outline" className="rounded-full" onClick={onBack}>
            {tr("Takaisin")}
          </Button>
        </div>
      }
    />
  );
}

interface ClassRow {
  id: string;
  name: string | null;
  email: string | null;
  className: string | null;
  classId: string | null;
  strengthIds: number[];
  currentScreen: number;
  lastActive: string | null;
  filledKeys: string[];
  screensFilled: number;
  pct: number;
  worlds: Array<{ id: string; done: number; total: number }>;
}

type ClassSort = "progress" | "name" | "active";

function SchoolAdminClassReport({
  cls,
  rows,
  events,
  lang,
  onBack,
  onOpenStudent,
}: {
  cls: SchoolAdminClass | null;
  rows: ClassRow[];
  events: ReportEvent[];
  lang: "fi" | "sv" | "en";
  onBack: () => void;
  onOpenStudent: (id: string) => void;
}) {
  const tr = useTr();
  const [days, setDays] = useState<RangeDays>(30);
  const [sort, setSort] = useState<ClassSort>("progress");

  const top = useMemo(() => tally(rows).slice(0, 5), [rows]);
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "name") copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    else if (sort === "active")
      copy.sort(
        (a, b) => new Date(b.lastActive ?? 0).getTime() - new Date(a.lastActive ?? 0).getTime(),
      );
    else copy.sort((a, b) => b.pct - a.pct);
    return copy;
  }, [rows, sort]);

  return (
    <>
      <StickyNote seed={`sa-cls-hdr-${cls?.id ?? "x"}`} className="space-y-3">
        <Breadcrumbs
          items={[{ label: tr("Luokat"), onClick: onBack }, { label: cls?.name ?? "" }]}
        />
        <h2 className="text-2xl font-bold">{cls?.name ?? "—"}</h2>
        <p className="text-sm opacity-80">
          {tr("Opettaja")}: {cls?.teacherName ?? "—"} · {tr("Kieli")}:{" "}
          {(cls?.language ?? "fi").toUpperCase()} · {tr("Opiskelijoita")}: {rows.length} ·{" "}
          {tr("Keskimääräinen valmistuminen")}: {avg} %
        </p>
        {cls?.joinCode && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              void navigator.clipboard.writeText(cls.joinCode ?? "");
              toast.success(tr("Kopioitu!"));
            }}
          >
            <Copy className="mr-1 h-3 w-3" />
            {tr("Liittymiskoodi")}: {cls.joinCode}
          </Button>
        )}
      </StickyNote>

      <StickyNote seed={`sa-cls-top5-${cls?.id ?? "x"}`} className="space-y-3">
        <h3 className="text-xl font-bold">{tr("Luokan Top 5 vahvuudet")}</h3>
        {top.length === 0 ? (
          <p className="opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
        ) : (
          <TopStrengthCards
            items={top.map((s) => ({
              id: s.id,
              count: s.count,
              caption: `${s.students} ${tr("oppilasta")}`,
            }))}
            lang={lang}
          />
        )}
      </StickyNote>

      <StickyNote seed={`sa-cls-range-${cls?.id ?? "x"}`} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold">{tr("Raportit")}</h3>
          <RangeSelector value={days} onChange={setDays} />
        </div>
      </StickyNote>

      <ReportTrends
        events={events}
        days={days}
        studentCount={rows.length}
        totalRequired={TOTAL_REQUIRED}
        seedPrefix={`sa-cls-${cls?.id ?? "x"}`}
      />

      <StickyNote seed={`sa-cls-students-${cls?.id ?? "x"}`} className="space-y-3 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold">{tr("Opiskelijat")}</h3>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ClassSort)}
            aria-label={tr("Järjestä")}
            className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-slate-900"
          >
            <option value="progress">{tr("Valmistuminen %")}</option>
            <option value="name">{tr("Nimi")}</option>
            <option value="active">{tr("Viimeksi aktiivinen")}</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="py-2 pr-3">{tr("Nimi")}</th>
              <th className="py-2 pr-3">{tr("Viimeksi aktiivinen")}</th>
              <th className="py-2 pr-3">{tr("Nykyinen näyttö")}</th>
              <th className="py-2 pr-3">{tr("Valmistuminen %")}</th>
              <th className="py-2">{tr("Tila")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-b border-black/5 hover:bg-black/5">
                <td className="py-2 pr-3 font-medium">
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => onOpenStudent(s.id)}
                  >
                    {s.name ?? "—"}
                  </button>
                </td>
                <td className="py-2 pr-3 opacity-70">
                  {formatLastActive(s.lastActive ? new Date(s.lastActive) : null, tr)}
                </td>
                <td className="py-2 pr-3 tabular-nums">{s.currentScreen}</td>
                <td className="py-2 pr-3 tabular-nums">{s.pct} %</td>
                <td className="py-2">
                  <StatusPill
                    status={studentStatus({
                      pct: s.pct,
                      currentScreen: s.currentScreen,
                      lastActive: s.lastActive,
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StickyNote>
    </>
  );
}

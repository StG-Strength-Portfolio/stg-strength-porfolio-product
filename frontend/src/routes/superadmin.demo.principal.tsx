import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { StudentDetailReport } from "@/components/students/StudentDetailReport";
import { ReportTrends, RangeSelector } from "@/components/reports/ReportTrends";
import { useSuperAdminGuard } from "@/lib/superadmin-guard";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  DEMO_SCHOOL_NAME,
  createDemoTeacherCode,
  getDemoSchoolAdminData,
  onDemoStateChange,
  promoteDemoTeacher,
  revokeDemoTeacherCode,
} from "@/lib/demo-store";
import {
  computeStudentStats,
  formatLastActive,
  studentStatus,
  STATUS_LABEL,
  STATUS_TONE,
  TOTAL_REQUIRED,
} from "@/lib/teacher-data";
import { getStrengthName } from "@/lib/strengths-i18n";
import type { RangeDays } from "@/lib/report-series";

export const Route = createFileRoute("/superadmin/demo/principal")({
  component: PrincipalDemoDashboard,
});

function PrincipalDemoDashboard() {
  const ready = useSuperAdminGuard();
  const tr = useTr();
  const { language } = useLanguage();
  const [tab, setTab] = useState("overview");
  const [version, setVersion] = useState(0);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [days, setDays] = useState<RangeDays>(30);

  useEffect(() => onDemoStateChange(() => setVersion((v) => v + 1)), []);
  const data = useMemo(() => getDemoSchoolAdminData(language), [language, version]);
  const rows = useMemo(
    () =>
      data.students.map((student) => {
        const stats = computeStudentStats(new Set(student.filledKeys), student.currentScreen);
        return {
          ...student,
          screensFilled: stats.screensFilled,
          pct: Math.round((stats.screensFilled / TOTAL_REQUIRED) * 100),
        };
      }),
    [data],
  );
  const avgCompletion = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.pct, 0) / rows.length)
    : 0;
  const activeThisMonth = rows.filter(
    (row) => row.lastActive && Date.now() - new Date(row.lastActive).getTime() < 30 * 86400000,
  ).length;

  if (!ready) return null;

  const tabs = [
    { id: "overview", label: tr("Yhteenveto") },
    { id: "classes", label: tr("Luokat") },
    { id: "students", label: tr("Opiskelijat") },
    { id: "teachers", label: tr("Opettajat") },
    { id: "codes", label: tr("Opettajakoodit") },
    { id: "reports", label: tr("Raportit") },
    { id: "settings", label: tr("Asetukset") },
  ];

  const selectedStudent = rows.find((student) => student.id === openStudent) ?? null;
  const selectedClass = data.classes.find((klass) => klass.id === openClass) ?? null;
  const classStudents = rows.filter((student) => student.classId === openClass);
  const topStrengths = [...data.strengthCounts]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => ({ id: Number(item.strengthId), count: item.count }));

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
      schoolName={DEMO_SCHOOL_NAME}
      persistLanguage={false}
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
            <Metric label={tr("Opiskelijoiden määrä")} value={String(rows.length)} />
            <Metric label={tr("Opettajien määrä")} value={String(data.teachers.length)} />
            <Metric label={tr("Aktiiviset tässä kuussa")} value={String(activeThisMonth)} />
            <Metric label={tr("Keskimääräinen valmistuminen")} value={`${avgCompletion} %`} />
          </div>
          <StickyNote seed="demo-principal-top" className="space-y-3">
            <h2 className="text-2xl font-bold">{tr("Koulun suosituimmat vahvuudet")}</h2>
            <TopStrengthCards items={topStrengths} lang={language} />
          </StickyNote>
        </>
      )}

      {tab === "classes" && !openClass && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.classes.map((klass) => {
            const inClass = rows.filter((student) => student.classId === klass.id);
            const avg = inClass.length
              ? Math.round(inClass.reduce((sum, student) => sum + student.pct, 0) / inClass.length)
              : 0;
            return (
              <StickyNote key={klass.id} seed={`demo-principal-class-${klass.id}`} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setOpenClass(klass.id)}
                  className="text-left text-xl font-bold hover:underline"
                >
                  {klass.name}
                </button>
                <p className="text-sm opacity-80">{tr("Opettaja")}: {klass.teacherName}</p>
                <p className="text-sm">
                  {tr("Opiskelijoita")}: {inClass.length} · {tr("Valmistuminen %")}: {avg} %
                </p>
              </StickyNote>
            );
          })}
        </div>
      )}

      {tab === "classes" && openClass && !selectedStudent && (
        <StickyNote seed={`demo-class-detail-${openClass}`} className="space-y-4 overflow-x-auto">
          <Button variant="outline" className="rounded-full" onClick={() => setOpenClass(null)}>
            {tr("Takaisin luokkiin")}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{selectedClass?.name ?? ""}</h2>
              <p className="text-sm opacity-70">{tr("Opettaja")}: {selectedClass?.teacherName ?? "—"}</p>
            </div>
            {selectedClass?.joinCode && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  void navigator.clipboard.writeText(selectedClass.joinCode ?? "");
                  toast.success(tr("Kopioitu!"));
                }}
              >
                <Copy className="mr-1 h-4 w-4" /> {selectedClass.joinCode}
              </Button>
            )}
          </div>
          <StudentTable students={classStudents} onOpen={setOpenStudent} />
        </StickyNote>
      )}

      {(tab === "students" || (tab === "classes" && openClass)) && selectedStudent && (
        <StudentDetailReport
          name={selectedStudent.name}
          className={selectedStudent.className}
          email={selectedStudent.email}
          lastActive={selectedStudent.lastActive}
          currentScreen={selectedStudent.currentScreen}
          screensFilled={selectedStudent.screensFilled}
          filledKeys={selectedStudent.filledKeys}
          strengthIds={selectedStudent.strengthIds}
          onBack={() => setOpenStudent(null)}
        />
      )}

      {tab === "students" && !selectedStudent && (
        <StickyNote seed="demo-principal-students" className="overflow-x-auto">
          <StudentTable students={rows} onOpen={setOpenStudent} showClass />
        </StickyNote>
      )}

      {tab === "teachers" && (
        <StickyNote seed="demo-principal-teachers" className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10">
                <th className="py-2 pr-3">{tr("Nimi")}</th>
                <th className="py-2 pr-3">{tr("Sähköposti")}</th>
                <th className="py-2 pr-3">{tr("Luokkia")}</th>
                <th className="py-2 pr-3">{tr("Opiskelijoita")}</th>
                <th className="py-2">{tr("Toiminnot")}</th>
              </tr>
            </thead>
            <tbody>
              {data.teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-black/5">
                  <td className="py-2 pr-3 font-semibold">{teacher.name}</td>
                  <td className="py-2 pr-3 opacity-70">{teacher.email}</td>
                  <td className="py-2 pr-3">{teacher.classCount}</td>
                  <td className="py-2 pr-3">{teacher.studentCount}</td>
                  <td className="py-2">
                    {teacher.role !== "school_admin" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          promoteDemoTeacher(teacher.id);
                          toast.success(tr("Sinut on nimitetty koulun adminiksi!"));
                        }}
                      >
                        {tr("Nimeä adminiksi")}
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold opacity-70">School admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </StickyNote>
      )}

      {tab === "codes" && (
        <>
          <StickyNote seed="demo-principal-code-create">
            <Button
              className="rounded-full bg-[color:var(--purple)] font-bold text-white"
              onClick={() => {
                const code = createDemoTeacherCode();
                toast.success(`${tr("Koodi luotu!")} ${code}`);
              }}
            >
              {tr("Luo opettajakoodi")}
            </Button>
          </StickyNote>
          <StickyNote seed="demo-principal-codes" className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-2 pr-3">{tr("Koodi")}</th>
                  <th className="py-2 pr-3">{tr("Tila")}</th>
                  <th className="py-2 pr-3">{tr("Luotu")}</th>
                  <th className="py-2">{tr("Toiminnot")}</th>
                </tr>
              </thead>
              <tbody>
                {data.codes.map((code) => (
                  <tr key={code.id} className="border-b border-black/5">
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        className="font-mono hover:underline"
                        onClick={() => {
                          void navigator.clipboard.writeText(code.code);
                          toast.success(tr("Kopioitu!"));
                        }}
                      >
                        {code.code}
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      {code.is_revoked ? tr("Poista") : code.is_used ? tr("Käytetty") : tr("Käyttämätön")}
                    </td>
                    <td className="py-2 pr-3 opacity-70">{new Date(code.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      {!code.is_revoked && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => revokeDemoTeacherCode(code.id)}
                        >
                          {tr("Poista")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StickyNote>
        </>
      )}

      {tab === "reports" && (
        <>
          <StickyNote seed="demo-principal-reports" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold">{tr("Raportit")}</h2>
              <RangeSelector value={days} onChange={setDays} />
            </div>
            <p className="opacity-80">
              {tr("Opiskelijat")}: {rows.length} · {tr("Opettajat")}: {data.teachers.length} · {tr("Keskimääräinen valmistuminen")}: {avgCompletion} %
            </p>
          </StickyNote>
          <ReportTrends
            events={data.events}
            days={days}
            studentCount={rows.length}
            totalRequired={TOTAL_REQUIRED}
            classes={data.classes}
            seedPrefix="demo-principal"
          />
          <StickyNote seed="demo-principal-risk" className="space-y-2">
            <h3 className="text-xl font-bold">{tr("Riskissä olevat opiskelijat")}</h3>
            <ul className="space-y-1 text-sm">
              {rows
                .filter(
                  (student) =>
                    !student.lastActive ||
                    Date.now() - new Date(student.lastActive).getTime() > 14 * 86400000,
                )
                .slice(0, 12)
                .map((student) => (
                  <li key={student.id}>{student.name} — {tr("Ei aktiivinen 14 päivään")}</li>
                ))}
            </ul>
          </StickyNote>
        </>
      )}

      {tab === "settings" && (
        <StickyNote seed="demo-principal-settings" className="space-y-2">
          <h2 className="text-2xl font-bold">{tr("Asetukset")}</h2>
          <p className="font-semibold">{DEMO_SCHOOL_NAME}</p>
          <p className="text-sm opacity-70">
            {language === "en"
              ? "Demo settings are session-only. Changes never affect a real school."
              : language === "sv"
                ? "Demoinställningar gäller bara den här sessionen och påverkar aldrig en riktig skola."
                : "Demoasetukset ovat vain tämän istunnon ajan eivätkä vaikuta oikeaan kouluun."}
          </p>
        </StickyNote>
      )}
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
      <div className="text-[0.7rem] uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-3xl font-bold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

function StudentTable({
  students,
  onOpen,
  showClass = false,
}: {
  students: Array<{
    id: string;
    name: string | null;
    className: string | null;
    lastActive: string | null;
    currentScreen: number;
    pct: number;
  }>;
  onOpen: (id: string) => void;
  showClass?: boolean;
}) {
  const tr = useTr();
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-black/10">
          <th className="py-2 pr-3">{tr("Nimi")}</th>
          {showClass && <th className="py-2 pr-3">{tr("Luokka")}</th>}
          <th className="py-2 pr-3">{tr("Viimeksi aktiivinen")}</th>
          <th className="py-2 pr-3">{tr("Valmistuminen %")}</th>
          <th className="py-2">{tr("Tila")}</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => {
          const status = studentStatus({
            pct: student.pct,
            currentScreen: student.currentScreen,
            lastActive: student.lastActive,
          });
          return (
            <tr key={student.id} className="border-b border-black/5">
              <td className="py-2 pr-3 font-medium">
                <button type="button" className="hover:underline" onClick={() => onOpen(student.id)}>
                  {student.name ?? "—"}
                </button>
              </td>
              {showClass && <td className="py-2 pr-3">{student.className ?? "—"}</td>}
              <td className="py-2 pr-3 opacity-70">
                {formatLastActive(student.lastActive ? new Date(student.lastActive) : null, tr)}
              </td>
              <td className="py-2 pr-3">{student.pct} %</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>
                  {tr(STATUS_LABEL[status])}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

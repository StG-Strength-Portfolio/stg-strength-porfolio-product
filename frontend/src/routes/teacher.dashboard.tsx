import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileSettings } from "@/components/ProfileSettings";
import { supabase } from "@/integrations/supabase/client";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage, useTr, LANGUAGES, LANGUAGE_LABEL, type Language } from "@/lib/i18n";
import { WORLDS } from "@/lib/screens";
import {
  formatLastActive,
  studentStatus,
  STATUS_LABEL,
  STATUS_TONE,
  TOTAL_REQUIRED,
  worldCompletion,
} from "@/lib/teacher-data";
import {
  useTeacherData,
  type TeacherStudent,
  type TeacherClass,
} from "@/lib/teacher-dashboard-data";
import { ALL_STRENGTHS } from "@/lib/strength-jar-data";
import { getStrengthName } from "@/lib/strengths-i18n";
import { cn } from "@/lib/utils";
import { WorldIcon } from "@/components/icons/AppIcons";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { StudentDetailReport } from "@/components/students/StudentDetailReport";

import { ReportTrends, RangeSelector } from "@/components/reports/ReportTrends";
import type { RangeDays, ReportEvent } from "@/lib/report-series";

export const Route = createFileRoute("/teacher/dashboard")({
  head: () => ({
    meta: [
      { title: "Teacher dashboard — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "Follow your classes, review student progress and gift strength candies in Vahvuusseikkailu.",
      },
      { property: "og:title", content: "Teacher dashboard — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Classes, student progress and strength assignment for teachers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherDashboardPage,
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  let s = "LK-";
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s + "-" + Math.floor(10 + Math.random() * 90);
}

function pctOf(s: TeacherStudent): number {
  return Math.round((s.screensFilled / TOTAL_REQUIRED) * 100);
}

function TeacherDashboardPage() {
  const tr = useTr();
  const guard = useRoleGuard(["teacher"]);
  const [tab, setTab] = useState("classes");
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const { classes, deletedClasses, students, assigned, events, refresh } = useTeacherData();

  if (!guard.ready) return null;

  const tabs = [
    { id: "classes", label: tr("Luokat") },
    { id: "students", label: tr("Opiskelijat") },
    { id: "strengths", label: tr("Vahvuuksien antaminen") },
    { id: "reports", label: tr("Raportit") },
  ];

  function openStudentView(id: string) {
    setOpenStudent(id);
    setTab("students");
  }

  const selectedStudent = students.find((s) => s.studentId === openStudent) ?? null;

  return (
    <DashboardShell
      title={tr("Opettajan hallintapaneeli")}
      tabs={tabs}
      active={tab}
      onSelect={(id) => {
        setTab(id);
        setOpenStudent(null);
      }}
      schoolName={guard.schoolName}
      /* @lovable-new */
      links={[
        { to: "/teacher/sprint", label: tr("Vahvuussprintti") },
        { to: "/teacher/profile", label: tr("Profiili") },
      ]}
      sections={[
        {
          label: tr("Opeta"),
          links: [
            { to: "/teacher/teach/portfolio", label: tr("Vahvuusportfolio") },
            { to: "/teacher/teach/materials", label: tr("Opetusmateriaalit") },
          ],
        },
      ]}
    >
      {/* @lovable-new 2026-08-07 — class-code generator is always visible on the Classes tab */}
      {tab === "classes" && !openClass && <CreateClass onCreated={refresh} />}

      {tab === "classes" && !openClass && (
        <TopStrengths students={students} classes={classes} assigned={assigned} />
      )}

      {tab === "classes" && !openClass && (
        <div className="grid gap-3 md:grid-cols-2">
          {classes.length === 0 && <p className="opacity-70">{tr("Ei luokkia.")}</p>}
          {classes.map((c) => {
            const inClass = students.filter((s) => s.classId === c.id);
            const avg = inClass.length
              ? Math.round(inClass.reduce((a, s) => a + pctOf(s), 0) / inClass.length)
              : 0;
            return (
              <StickyNote key={c.id} seed={`cls-${c.id}`} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setOpenClass(c.id)}
                  className="text-left text-xl font-bold underline-offset-2 hover:underline"
                >
                  {c.name}
                </button>
                {/* @lovable-new 2026-08-07 — join code always visible + copy action */}
                <div className="flex flex-wrap items-center gap-2 text-sm opacity-80">
                  <span>{tr("Luokan koodi")}:</span>
                  <code className="rounded-lg bg-[color:var(--yellow)]/60 px-2 py-0.5 font-mono text-base font-bold tracking-wider text-[color:var(--ink)]">
                    {c.join_code}
                  </code>
                  <CopyCodeButton code={c.join_code} />
                  <span>
                    · {tr("Kieli")}: {LANGUAGE_LABEL[c.language] ?? c.language}
                  </span>
                </div>
                <div className="text-sm">
                  {tr("Opiskelijoita")}: {inClass.length} · {tr("Valmistuminen %")}: {avg} % ·{" "}
                  {tr("Luotu")}: {new Date(c.created_at).toLocaleDateString()}
                </div>

                <div className="pt-1">
                  <DeleteClassButton
                    klass={c}
                    studentCount={inClass.length}
                    teacherId={guard.userId}
                    onDone={refresh}
                  />
                </div>
              </StickyNote>
            );
          })}
          {deletedClasses.length > 0 && (
            <div className="md:col-span-2">
              <DeletedClasses classes={deletedClasses} onDone={refresh} />
            </div>
          )}
        </div>
      )}

      {tab === "classes" && openClass && (
        <StickyNote seed={`cls-detail-${openClass}`} className="space-y-3 overflow-x-auto">
          <Button variant="outline" className="rounded-full" onClick={() => setOpenClass(null)}>
            {tr("Takaisin luokkiin")}
          </Button>
          <h2 className="text-2xl font-bold">
            {classes.find((c) => c.id === openClass)?.name ?? ""}
          </h2>
          <StudentTable
            students={students.filter((s) => s.classId === openClass)}
            onOpen={openStudentView}
          />
        </StickyNote>
      )}

      {tab === "students" && !selectedStudent && (
        <StickyNote seed="teacher-students" className="overflow-x-auto">
          <StudentTable students={students} onOpen={openStudentView} showClass />
        </StickyNote>
      )}

      {tab === "students" && selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          gifts={assigned}
          onBack={() => setOpenStudent(null)}
        />
      )}

      {tab === "strengths" && (
        <AssignStrengths
          classes={classes}
          students={students}
          assigned={assigned}
          teacherId={guard.userId}
          onDone={refresh}
        />
      )}

      {tab === "reports" && (
        <TeacherReports students={students} classes={classes} events={events} assigned={assigned} />
      )}

      {tab === "settings" && (
        <ProfileSettings
          schoolName={guard.schoolName}
          displayName={guard.displayName}
          email={guard.email}
        />
      )}
    </DashboardShell>
  );
}

function StudentTable({
  students,
  onOpen,
  showClass = false,
}: {
  students: TeacherStudent[];
  onOpen: (id: string) => void;
  showClass?: boolean;
}) {
  const tr = useTr();
  if (students.length === 0) return <p className="opacity-70">{tr("Ei opiskelijoita.")}</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-black/10">
          <th className="py-2 pr-3">{tr("Nimi")}</th>
          {showClass && <th className="py-2 pr-3">{tr("Luokka")}</th>}
          <th className="py-2 pr-3">{tr("Viimeksi aktiivinen")}</th>
          <th className="py-2 pr-3">{tr("Nykyinen ruutu")}</th>
          <th className="py-2 pr-3">{tr("Valmistuminen %")}</th>
          <th className="py-2">{tr("Tila")}</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s) => {
          const pct = pctOf(s);
          return (
            <tr key={`${s.classId}-${s.studentId}`} className="border-b border-black/5">
              <td className="py-2 pr-3 font-medium">
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => onOpen(s.studentId)}
                >
                  {s.displayName?.trim() || s.studentId.slice(0, 8)}
                </button>
              </td>
              {showClass && <td className="py-2 pr-3">{s.className}</td>}
              <td className="py-2 pr-3 opacity-70">{formatLastActive(s.lastActive, tr)}</td>
              <td className="py-2 pr-3 tabular-nums">{s.currentScreen}</td>
              <td className="py-2 pr-3 tabular-nums">{pct} %</td>
              <td className="py-2">
                {(() => {
                  const status = studentStatus({
                    pct,
                    currentScreen: s.currentScreen,
                    lastActive: s.lastActive,
                  });
                  return (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_TONE[status],
                      )}
                    >
                      {tr(STATUS_LABEL[status])}
                    </span>
                  );
                })()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function StudentDetail({
  student,
  gifts,
  onBack,
}: {
  student: TeacherStudent;
  gifts: {
    id: string;
    student_id: string;
    strength_id: string;
    message: string | null;
    created_at: string;
  }[];
  onBack: () => void;
}) {
  const tr = useTr();
  const mine = gifts.filter((g) => g.student_id === student.studentId);

  return (
    <StudentDetailReport
      name={student.displayName?.trim() || student.studentId.slice(0, 8)}
      className={student.className}
      lastActive={student.lastActive}
      currentScreen={student.currentScreen}
      screensFilled={student.screensFilled}
      filledKeys={student.filledKeys}
      strengthIds={student.strengthIds}
      gifts={mine}
      onBack={onBack}
      portfolioAction={
        <Link
          to="/opettaja/oppilas/$userId"
          params={{ userId: student.studentId }}
          className="inline-flex items-center gap-1 rounded-full bg-[color:var(--purple)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--purple)]/90"
        >
          {tr("Avaa portfolio")} <ExternalLink className="h-3 w-3" />
        </Link>
      }
    />
  );
}

function AssignStrengths({
  classes,
  students,
  assigned,
  teacherId,
  onDone,
}: {
  classes: TeacherClass[];
  students: TeacherStudent[];
  assigned: {
    id: string;
    student_id: string;
    strength_id: string;
    message: string | null;
    created_at: string;
  }[];
  teacherId: string | null;
  onDone: () => Promise<void>;
}) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [strengthIds, setStrengthIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const unique = useMemo(() => {
    const map = new Map<string, TeacherStudent>();
    for (const s of students) if (!map.has(s.studentId)) map.set(s.studentId, s);
    return Array.from(map.values());
  }, [students]);

  const nameOf = (id: string) =>
    unique.find((s) => s.studentId === id)?.displayName?.trim() || id.slice(0, 8);

  const classNameOf = (id: string) => unique.find((s) => s.studentId === id)?.className ?? "—";

  const inClass = useMemo(
    () => (classId ? unique.filter((s) => s.classId === classId) : []),
    [unique, classId],
  );

  function toggleStrength(id: number) {
    setStrengthIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  async function submit() {
    if (!teacherId || !studentId || strengthIds.length === 0) return;
    const names = strengthIds.map((id) => getStrengthName(id, lang)).join(", ");
    const ok = window.confirm(
      `${tr("Haluatko lahjoittaa vahvuuden")} ${names} ${tr("opiskelijalle")} ${nameOf(studentId)}?`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("teacher_assigned_strengths" as never).insert(
        strengthIds.map((id) => ({
          teacher_id: teacherId,
          student_id: studentId,
          strength_id: String(id),
          message: message.trim() || null,
        })) as never,
      );
      if (error) throw error;
      toast.success(`${strengthIds.length} ${tr("vahvuutta lähetetty!")}`);
      setMessage("");
      setStrengthIds([]);
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StickyNote seed="assign-strength" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="as-class">{tr("Valitse luokka")}</Label>
            <select
              id="as-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStudentId("");
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="as-student">{tr("Valitse opiskelija")}</Label>
            <select
              id="as-student"
              value={studentId}
              disabled={!classId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">{classId ? "—" : tr("Valitse ensin luokka")}</option>
              {inClass.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.displayName?.trim() || s.studentId.slice(0, 8)}
                </option>
              ))}
            </select>
            {classId && inClass.length === 0 && (
              <p className="text-xs opacity-70">{tr("Ei opiskelijoita.")}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{tr("Valitse vahvuus")}</Label>
          <StrengthPickerGrid
            lang={lang}
            selectedIds={strengthIds}
            disabled={busy || !studentId}
            onSelect={toggleStrength}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="as-msg">{tr("Viesti opiskelijalle (vapaaehtoinen)")}</Label>
          <Input
            id="as-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={tr("esim. Osoitit hienoa rohkeutta tänään!")}
          />
        </div>

        <Button
          disabled={busy || !studentId || strengthIds.length === 0}
          onClick={() => void submit()}
          className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
        >
          {tr("Lahjoita vahvuus")}
        </Button>
      </StickyNote>

      <StickyNote seed="assign-history" className="overflow-x-auto">
        <h3 className="mb-2 text-xl font-bold">{tr("Annetut vahvuudet")}</h3>
        {assigned.length === 0 ? (
          <p className="opacity-70">{tr("Ei annettuja vahvuuksia.")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10">
                <th className="py-2 pr-3">{tr("Opiskelija")}</th>
                <th className="py-2 pr-3">{tr("Luokka")}</th>
                <th className="py-2 pr-3">{tr("Vahvuus")}</th>
                <th className="py-2 pr-3">{tr("Viesti")}</th>
                <th className="py-2">{tr("Päivämäärä")}</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((a) => (
                <tr key={a.id} className="border-b border-black/5">
                  <td className="py-2 pr-3">{nameOf(a.student_id)}</td>
                  <td className="py-2 pr-3 opacity-80">{classNameOf(a.student_id)}</td>
                  <td className="py-2 pr-3">{getStrengthName(Number(a.strength_id), lang)}</td>
                  <td className="py-2 pr-3 opacity-80">{a.message ?? "—"}</td>
                  <td className="py-2 opacity-70">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </StickyNote>
    </>
  );
}

/** Counts every collected strength id for a set of students (+ teacher gifts). */
function countStrengths(
  students: TeacherStudent[],
  assigned: { student_id: string; strength_id: string }[],
) {
  const ids = new Set(students.map((s) => s.studentId));
  const counts = new Map<number, { total: number; students: Set<string> }>();
  const add = (id: number, studentId: string) => {
    if (id < 1 || id > 26) return;
    let e = counts.get(id);
    if (!e) {
      e = { total: 0, students: new Set() };
      counts.set(id, e);
    }
    e.total += 1;
    e.students.add(studentId);
  };
  for (const s of students) for (const id of s.strengthIds) add(id, s.studentId);
  for (const g of assigned) {
    if (!ids.has(g.student_id)) continue;
    add(Number(g.strength_id), g.student_id);
  }
  return [...counts.entries()]
    .map(([id, e]) => ({ id, total: e.total, students: e.students.size }))
    .sort((a, b) => b.total - a.total || a.id - b.id);
}

function TopStrengths({
  students,
  classes,
  assigned,
}: {
  students: TeacherStudent[];
  classes: TeacherClass[];
  assigned: { student_id: string; strength_id: string }[];
}) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const top = useMemo(() => countStrengths(students, assigned).slice(0, 5), [students, assigned]);

  const colorOf = (id: number) => ALL_STRENGTHS.find((s) => s.id === id)?.color ?? "var(--purple)";

  return (
    <StickyNote seed="t-top-strengths" className="space-y-4 md:col-span-2">
      <h2 className="text-2xl font-bold">{tr("Ryhmän suosituimmat vahvuudet")}</h2>
      {top.length === 0 ? (
        <p className="opacity-70">{tr("Opiskelijasi eivät ole vielä keränneet vahvuuksia.")}</p>
      ) : (
        <TopStrengthCards
          items={top.map((x) => ({
            id: x.id,
            count: x.total,
            caption: `${x.students} ${tr("opiskelijaa")}`,
          }))}
          lang={lang}
        />
      )}

      {classes.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {classes.map((c) => {
            const inClass = students.filter((s) => s.classId === c.id);
            const list = countStrengths(inClass, assigned);
            return (
              <div key={c.id} className="rounded-2xl bg-white/70 p-3 text-slate-900">
                <div className="font-bold">{c.name}</div>
                {list.length === 0 ? (
                  <p className="text-sm opacity-70">
                    {tr("Opiskelijasi eivät ole vielä keränneet vahvuuksia.")}
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {list.slice(0, 3).map((s, i) => (
                        <span
                          key={s.id}
                          className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm"
                        >
                          <span className="opacity-60">#{i + 1}</span>
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: colorOf(s.id) }}
                            aria-hidden
                          />
                          {getStrengthName(s.id, lang)} ×{s.total}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs opacity-70">
                      {list.length}/26 · {tr("uusia vahvuuksia kerätty")}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StickyNote>
  );
}

function TeacherReports({
  students,
  classes,
  events,
  assigned,
}: {
  students: TeacherStudent[];
  classes: { id: string; name: string }[];
  events: ReportEvent[];
  assigned: { student_id: string; strength_id: string }[];
}) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const [days, setDays] = useState<RangeDays>(30);
  const [classFilter, setClassFilter] = useState<string>("all");

  const shownClasses = useMemo(
    () => (classFilter === "all" ? classes : classes.filter((c) => c.id === classFilter)),
    [classes, classFilter],
  );
  const shownStudents = useMemo(
    () => (classFilter === "all" ? students : students.filter((s) => s.classId === classFilter)),
    [students, classFilter],
  );
  const shownEvents = useMemo(
    () => (classFilter === "all" ? events : events.filter((e) => e.classId === classFilter)),
    [events, classFilter],
  );
  const top = useMemo(
    () => countStrengths(shownStudents, assigned).slice(0, 5),
    [shownStudents, assigned],
  );

  const atRisk = shownStudents.filter(
    (s) => !s.lastActive || Date.now() - s.lastActive.getTime() > 14 * 24 * 3600 * 1000,
  );

  return (
    <>
      <StickyNote seed="t-reports" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">{tr("Raportit")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              aria-label={tr("Luokka")}
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-slate-900"
            >
              <option value="all">{tr("Kaikki luokat")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <RangeSelector value={days} onChange={setDays} />
          </div>
        </div>
        <p className="opacity-80">
          {tr("Opiskelijoita")}: {shownStudents.length} · {tr("Luokkia")}: {shownClasses.length}
        </p>
        <ul className="space-y-1 text-sm">
          {shownClasses.map((c) => {
            const inClass = shownStudents.filter((s) => s.classId === c.id);
            const avg = inClass.length
              ? Math.round(inClass.reduce((a, s) => a + pctOf(s), 0) / inClass.length)
              : 0;
            return (
              <li key={c.id}>
                {c.name} — {avg} %
              </li>
            );
          })}
        </ul>
      </StickyNote>

      <StickyNote seed="t-report-top5" className="space-y-3">
        <h3 className="text-xl font-bold">
          {classFilter === "all"
            ? tr("Ryhmän suosituimmat vahvuudet")
            : tr("Luokan Top 5 vahvuudet")}
        </h3>
        {top.length === 0 ? (
          <p className="opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
        ) : (
          <TopStrengthCards
            items={top.map((x) => ({
              id: x.id,
              count: x.total,
              caption: `${x.students} ${tr("opiskelijaa")}`,
            }))}
            lang={lang}
          />
        )}
      </StickyNote>

      <ReportTrends
        events={shownEvents}
        days={days}
        studentCount={shownStudents.length}
        totalRequired={TOTAL_REQUIRED}
        classes={shownClasses}
        seedPrefix="t"
      />
      <StickyNote seed="t-risk" className="space-y-2">
        <h3 className="text-xl font-bold">{tr("Riskissä olevat opiskelijat")}</h3>
        {atRisk.length === 0 ? (
          <p className="opacity-70">—</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {atRisk.map((s) => (
              <li key={`${s.classId}-${s.studentId}`}>
                {s.displayName ?? s.studentId.slice(0, 8)} — {tr("Ei aktiivinen 14 päivään")}
              </li>
            ))}
          </ul>
        )}
      </StickyNote>
    </>
  );
}

/* @lovable-new 2026-08-07 — shared copy-code action */
function CopyCodeButton({ code }: { code: string }) {
  const tr = useTr();
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(tr("Koodi kopioitu!"));
    } catch {
      toast.error(tr("Kopiointi epäonnistui"));
    }
  }
  return (
    <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={copy}>
      <Copy className="mr-1 h-3.5 w-3.5" /> {tr("Kopioi koodi")}
    </Button>
  );
}

/* @lovable-new 2026-08-07 — always-visible class-code generator with result panel */
function CreateClass({ onCreated }: { onCreated: () => Promise<void> }) {
  const tr = useTr();
  const [name, setName] = useState("");
  const [language, setLanguageChoice] = useState<Language>("fi");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; code: string; language: Language } | null>(
    null,
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session.");
      let lastError: unknown = null;
      // Retry once on a join_code uniqueness collision.
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = randomCode();
        const { error } = await supabase.from("classes" as never).insert({
          name: name.trim(),
          teacher_id: u.user.id,
          join_code: code,
          language,
        } as never);
        if (!error) {
          setCreated({ name: name.trim(), code, language });
          setName("");
          toast.success(tr("Luokka luotu."));
          await onCreated();
          return;
        }
        lastError = error;
        if ((error as { code?: string }).code !== "23505") break;
      }
      throw lastError;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <StickyNote seed="t-create-class" className="space-y-3">
      <h3 className="text-xl font-bold">{tr("Luo luokkakoodi")}</h3>
      <p className="text-sm opacity-70">
        {tr(
          "Anna luokalle nimi ja valitse kieli. Oppilaat liittyvät luodulla koodilla ja saavat luokan kielen käyttöön.",
        )}
      </p>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="cc-name">{tr("Luokan nimi")}</Label>
          <Input
            id="cc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr("esim. 9A — Vahvuusryhmä")}
            maxLength={80}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cc-lang">{tr("Kieli")}</Label>
          <select
            id="cc-lang"
            value={language}
            onChange={(e) => setLanguageChoice(e.target.value as Language)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l]} ({l})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <Button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-full bg-[color:var(--purple)] px-6 py-5 font-bold text-white hover:bg-[color:var(--purple)]/90"
          >
            {busy ? tr("Luodaan…") : tr("Luo luokkakoodi")}
          </Button>
        </div>
      </form>

      {created && (
        <div className="rounded-2xl bg-white/70 p-4">
          <div className="text-xs uppercase tracking-wider opacity-60">
            {tr("Uusi luokkakoodi")}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="rounded-2xl bg-[color:var(--yellow)] px-4 py-2 font-mono text-2xl font-bold tracking-wider text-[color:var(--ink)]">
              {created.code}
            </span>
            <span className="text-sm font-semibold">{created.name}</span>
            <span className="text-sm opacity-70">
              {tr("Kieli")}: {LANGUAGE_LABEL[created.language] ?? created.language}
            </span>
            <CopyCodeButton code={created.code} />
          </div>
          <p className="mt-2 text-xs opacity-60">{tr("Jaa tämä koodi oppilaille.")}</p>
        </div>
      )}
    </StickyNote>
  );
}

function DeleteClassButton({
  klass,
  studentCount,
  teacherId,
  onDone,
}: {
  klass: TeacherClass;
  studentCount: number;
  teacherId: string | null;
  onDone: () => Promise<void>;
}) {
  const tr = useTr();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const ok = window.confirm(
      `${tr("Haluatko varmasti poistaa luokan")} "${klass.name}"? ${tr("Opiskelijat menettävät pääsyn seikkailuun. Voit palauttaa luokan 60 päivän ajan.")} (${tr("Opiskelijoita")}: ${studentCount})`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("classes" as never)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: teacherId,
        } as never)
        .eq("id", klass.id);
      if (error) throw error;
      toast.success(tr("Luokka poistettu."));
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={busy}
      onClick={() => void remove()}
      className="rounded-full bg-red-600 font-bold text-white hover:bg-red-700"
    >
      <Trash2 className="mr-1 h-4 w-4" /> {tr("Poista luokka")}
    </Button>
  );
}

function DeletedClasses({
  classes,
  onDone,
}: {
  classes: TeacherClass[];
  onDone: () => Promise<void>;
}) {
  const tr = useTr();
  const [busy, setBusy] = useState<string | null>(null);

  function daysLeft(deletedAt?: string | null): number {
    if (!deletedAt) return 60;
    const passed = (Date.now() - new Date(deletedAt).getTime()) / 86400000;
    return Math.max(0, Math.ceil(60 - passed));
  }

  async function restore(id: string) {
    setBusy(id);
    try {
      const { error } = await supabase
        .from("classes" as never)
        .update({ is_deleted: false, deleted_at: null, deleted_by: null } as never)
        .eq("id", id);
      if (error) throw error;
      toast.success(tr("Luokka palautettu."));
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <StickyNote seed="deleted-classes" className="space-y-3">
      <h3 className="text-xl font-bold">{tr("Poistetut luokat")}</h3>
      <ul className="space-y-2">
        {classes.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm"
          >
            <span>
              <strong>{c.name}</strong> ·{" "}
              <span className="opacity-70">
                {tr("Poistetaan pysyvästi")}: {daysLeft(c.deleted_at)} {tr("päivän kuluttua")}
              </span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy === c.id}
              onClick={() => void restore(c.id)}
              className="rounded-full"
            >
              <RotateCcw className="mr-1 h-4 w-4" /> {tr("Palauta luokka")}
            </Button>
          </li>
        ))}
      </ul>
    </StickyNote>
  );
}

import { buildLevelCompletion, type LevelCompletion } from "@/lib/report-levels";
import {
  buildReportSeries,
  buildStrengthSeries,
  type ReportEvent,
  type SeriesPoint,
  type StrengthSeries,
} from "@/lib/report-series";
import { computeStudentStats, TOTAL_REQUIRED } from "@/lib/teacher-data";
import type { AssignedStrength, TeacherClass, TeacherStudent } from "@/lib/teacher-dashboard-data";
import type { SchoolAdminData } from "@/lib/schooladmin.functions";

export const MONTHLY_REPORT_DAYS = 30 as const;
const AT_RISK_DAYS = 14;

export interface MonthlyTopStrength {
  id: number;
  count: number;
  studentCount?: number;
}

export interface MonthlyClassCompletion {
  id: string;
  name: string;
  studentCount: number;
  completionPercent: number;
}

export interface MonthlyClassGrowth {
  id: string;
  name: string;
  series: SeriesPoint[];
}

export interface MonthlyReportData {
  role: "teacher" | "school_admin";
  days: typeof MONTHLY_REPORT_DAYS;

  schoolName?: string | null;

  studentCount: number;
  classCount: number;
  teacherCount?: number;

  averageCompletion: number;
  atRiskCount: number;

  topStrengths: MonthlyTopStrength[];
  classCompletion: MonthlyClassCompletion[];

  reportSeries: SeriesPoint[];
  strengthGrowth: StrengthSeries;
  levelCompletion: LevelCompletion[];
  classGrowth: MonthlyClassGrowth[];
}

function completionPercent(screensFilled: number): number {
  return Math.round((screensFilled / TOTAL_REQUIRED) * 100);
}

function isAtRisk(lastActive: Date | string | null | undefined, now: number): boolean {
  if (!lastActive) return true;

  const timestamp =
    lastActive instanceof Date ? lastActive.getTime() : new Date(lastActive).getTime();

  if (Number.isNaN(timestamp)) return true;

  return now - timestamp > AT_RISK_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Mirrors the current Teacher Report strength calculation.
 *
 * Teacher dashboard currently counts:
 * - strengths already present on TeacherStudent.strengthIds
 * - teacher-assigned strengths
 */
function countTeacherStrengths(
  students: TeacherStudent[],
  assigned: AssignedStrength[],
): MonthlyTopStrength[] {
  const studentIds = new Set(students.map((student) => student.studentId));

  const counts = new Map<
    number,
    {
      count: number;
      students: Set<string>;
    }
  >();

  function add(strengthId: number, studentId: string) {
    if (!Number.isInteger(strengthId) || strengthId < 1 || strengthId > 26) {
      return;
    }

    const current = counts.get(strengthId) ?? {
      count: 0,
      students: new Set<string>(),
    };

    current.count += 1;
    current.students.add(studentId);

    counts.set(strengthId, current);
  }

  for (const student of students) {
    for (const strengthId of student.strengthIds) {
      add(strengthId, student.studentId);
    }
  }

  for (const item of assigned) {
    if (!studentIds.has(item.student_id)) continue;

    add(Number(item.strength_id), item.student_id);
  }

  return [...counts.entries()]
    .map(([id, value]) => ({
      id,
      count: value.count,
      studentCount: value.students.size,
    }))
    .sort((a, b) => b.count - a.count || a.id - b.id);
}

export function buildTeacherMonthlyReport(input: {
  students: TeacherStudent[];
  classes: TeacherClass[];
  events: ReportEvent[];
  assigned: AssignedStrength[];
  now?: number;
}): MonthlyReportData {
  const { students, classes, events, assigned, now = Date.now() } = input;

  const classCompletion: MonthlyClassCompletion[] = classes.map((klass) => {
    const studentsInClass = students.filter((student) => student.classId === klass.id);

    const average = studentsInClass.length
      ? Math.round(
          studentsInClass.reduce(
            (sum, student) => sum + completionPercent(student.screensFilled),
            0,
          ) / studentsInClass.length,
        )
      : 0;

    return {
      id: klass.id,
      name: klass.name,
      studentCount: studentsInClass.length,
      completionPercent: average,
    };
  });

  const averageCompletion = students.length
    ? Math.round(
        students.reduce((sum, student) => sum + completionPercent(student.screensFilled), 0) /
          students.length,
      )
    : 0;

  const atRiskCount = students.filter((student) => isAtRisk(student.lastActive, now)).length;

  const reportSeries = buildReportSeries(events, {
    days: MONTHLY_REPORT_DAYS,
    studentCount: students.length,
    totalRequired: TOTAL_REQUIRED,
  });

  const strengthGrowth = buildStrengthSeries(events, {
    days: MONTHLY_REPORT_DAYS,
    limit: 10,
  });

  const levelCompletion = buildLevelCompletion(events, {
    studentCount: students.length,
  });

  /**
   * Keep the same calculation path as ReportTrends.
   *
   * ReportTrends currently passes the total report student count
   * when building each class series, so we intentionally preserve
   * that behaviour here.
   */
  const classGrowth: MonthlyClassGrowth[] = classes.map((klass) => ({
    id: klass.id,
    name: klass.name,
    series: buildReportSeries(events, {
      days: MONTHLY_REPORT_DAYS,
      studentCount: students.length,
      totalRequired: TOTAL_REQUIRED,
      classId: klass.id,
    }),
  }));

  return {
    role: "teacher",
    days: MONTHLY_REPORT_DAYS,

    studentCount: students.length,
    classCount: classes.length,

    averageCompletion,
    atRiskCount,

    topStrengths: countTeacherStrengths(students, assigned).slice(0, 5),

    classCompletion,

    reportSeries,
    strengthGrowth,
    levelCompletion,
    classGrowth,
  };
}

export function buildSchoolAdminMonthlyReport(
  data: SchoolAdminData,
  now = Date.now(),
): MonthlyReportData {
  const studentRows = data.students.map((student) => {
    const stats = computeStudentStats(new Set(student.filledKeys), student.currentScreen ?? 1);

    return {
      student,
      completionPercent: completionPercent(stats.screensFilled),
    };
  });

  const averageCompletion = studentRows.length
    ? Math.round(
        studentRows.reduce((sum, row) => sum + row.completionPercent, 0) / studentRows.length,
      )
    : 0;

  const classCompletion: MonthlyClassCompletion[] = data.classes.map((klass) => {
    const studentsInClass = studentRows.filter((row) => row.student.classId === klass.id);

    const average = studentsInClass.length
      ? Math.round(
          studentsInClass.reduce((sum, row) => sum + row.completionPercent, 0) /
            studentsInClass.length,
        )
      : 0;

    return {
      id: klass.id,
      name: klass.name,
      studentCount: studentsInClass.length,
      completionPercent: average,
    };
  });

  const atRiskCount = data.students.filter((student) => isAtRisk(student.lastActive, now)).length;

  const topStrengths: MonthlyTopStrength[] = data.strengthCounts
    .map((item) => ({
      id: Number(item.strengthId),
      count: item.count,
    }))
    .filter((item) => Number.isInteger(item.id) && item.id >= 1 && item.id <= 26)
    .slice(0, 10);

  const reportSeries = buildReportSeries(data.events, {
    days: MONTHLY_REPORT_DAYS,
    studentCount: data.students.length,
    totalRequired: TOTAL_REQUIRED,
  });

  const strengthGrowth = buildStrengthSeries(data.events, {
    days: MONTHLY_REPORT_DAYS,
    limit: 10,
  });

  const levelCompletion = buildLevelCompletion(data.events, {
    studentCount: data.students.length,
  });

  const classGrowth: MonthlyClassGrowth[] = data.classes.map((klass) => ({
    id: klass.id,
    name: klass.name,
    series: buildReportSeries(data.events, {
      days: MONTHLY_REPORT_DAYS,
      studentCount: data.students.length,
      totalRequired: TOTAL_REQUIRED,
      classId: klass.id,
    }),
  }));

  return {
    role: "school_admin",
    days: MONTHLY_REPORT_DAYS,

    schoolName: data.school?.name ?? null,

    studentCount: data.students.length,
    classCount: data.classes.length,
    teacherCount: data.teachers.length,

    averageCompletion,
    atRiskCount,

    topStrengths,
    classCompletion,

    reportSeries,
    strengthGrowth,
    levelCompletion,
    classGrowth,
  };
}

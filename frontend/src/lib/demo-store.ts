import { ACTIVE_SCREENS, SCREEN_REQUIREMENTS } from "@/lib/screen-registry";
import type { Language } from "@/lib/i18n";
import type { ReportEvent } from "@/lib/report-series";
import type {
  AssignedStrength,
  TeacherClass,
  TeacherStudent,
} from "@/lib/teacher-dashboard-data";
import type {
  SchoolAdminCode,
  SchoolAdminData,
  SchoolAdminStudent,
  SchoolAdminTeacher,
} from "@/lib/schooladmin.functions";

export type DemoRole = "student" | "teacher" | "principal";

const STORAGE_KEY = "strength_portfolio_sales_demo_v1";
const CHANGE_EVENT = "strength-portfolio-demo-changed";

export const DEMO_SCHOOL_ID = "demo-northbridge";
export const DEMO_SCHOOL_NAME = "Northbridge High School";
export const DEMO_TEACHER_ID = "demo-teacher-primary";
export const DEMO_PRINCIPAL_ID = "demo-principal";
export const DEMO_STUDENT_ID = "demo-student-primary";

const TEACHER_NAMES: Record<Language, string> = {
  en: "Emma Johnson",
  fi: "Elina Korhonen",
  sv: "Anna Lindström",
};

const PRINCIPAL_NAMES: Record<Language, string> = {
  en: "Michael Anderson",
  fi: "Mika Lehtinen",
  sv: "Johan Berg",
};

const STUDENT_FIRST_NAMES = [
  "Aino", "Alex", "Amira", "Anton", "Ava", "Benjamin", "Daniel", "Elias", "Ella", "Emil",
  "Emma", "Felix", "Freja", "Hugo", "Ida", "Isak", "Jade", "Leo", "Lina", "Lucas", "Maya",
  "Mila", "Nora", "Noah", "Oliver", "Omar", "Sara", "Sofia", "Theo", "William",
];

const STUDENT_LAST_NAMES = [
  "Andersson", "Berg", "Chen", "Davis", "Eriksson", "Garcia", "Hansen", "Holm", "Ivanov", "Johansson",
  "Kallio", "Khan", "Laine", "Lindberg", "Martin", "Mäkinen", "Nguyen", "Niemi", "Olsen", "Patel",
  "Rivera", "Saarinen", "Smith", "Virtanen", "Walker", "Wilson", "Yang", "Young", "Öberg", "Östman",
];

const CLASS_SPECS = [
  { id: "demo-class-1", name: "1A", count: 22, language: "en" as Language, joinCode: "NB-1A-42" },
  { id: "demo-class-2", name: "1B", count: 24, language: "fi" as Language, joinCode: "NB-1B-57" },
  { id: "demo-class-3", name: "2A", count: 21, language: "sv" as Language, joinCode: "NB-2A-63" },
  { id: "demo-class-4", name: "2B", count: 25, language: "en" as Language, joinCode: "NB-2B-74" },
  { id: "demo-class-5", name: "3A", count: 23, language: "fi" as Language, joinCode: "NB-3A-81" },
];

export interface DemoState {
  version: 1;
  classes: Array<TeacherClass & { teacherId: string }>;
  students: Array<{
    id: string;
    name: string;
    email: string;
    classId: string;
    currentScreen: number;
    screensFilled: number;
    filledKeys: string[];
    strengthIds: number[];
    lastActive: string;
  }>;
  teachers: Array<{
    id: string;
    names: Record<Language, string>;
    email: string;
    role: "teacher" | "school_admin";
    lastActive: string;
  }>;
  principal: { id: string; names: Record<Language, string>; email: string };
  assignedStrengths: AssignedStrength[];
  teacherCodes: SchoolAdminCode[];
  studentResponses: Record<string, unknown>;
  studentCurrentScreen: number;
}

function isoDaysAgo(days: number, hours = 0): string {
  return new Date(Date.now() - (days * 24 + hours) * 3600 * 1000).toISOString();
}

function filledKeysThrough(screen: number): string[] {
  const keys = new Set<string>();
  for (const n of ACTIVE_SCREENS) {
    if (n > screen) break;
    for (const key of SCREEN_REQUIREMENTS[n] ?? []) keys.add(key);
  }
  return [...keys];
}

function studentName(index: number): string {
  const first = STUDENT_FIRST_NAMES[index % STUDENT_FIRST_NAMES.length];
  const last = STUDENT_LAST_NAMES[(index * 7 + Math.floor(index / STUDENT_FIRST_NAMES.length)) % STUDENT_LAST_NAMES.length];
  return `${first} ${last}`;
}

function progressForIndex(index: number): { currentScreen: number; screensFilled: number } {
  // A realistic spread: early users, mid-journey users and near-complete users.
  const bands = [24, 37, 49, 61, 72, 84, 95, 106];
  const currentScreen = bands[(index * 5 + Math.floor(index / 9)) % bands.length];
  const screensFilled = Math.max(8, Math.min(106, currentScreen - (index % 5)));
  return { currentScreen, screensFilled };
}

function strengthsForIndex(index: number): number[] {
  const count = 5 + (index % 7);
  return Array.from({ length: count }, (_, i) => ((index * 3 + i * 5) % 26) + 1);
}

function createInitialState(): DemoState {
  const classes: DemoState["classes"] = CLASS_SPECS.map((c, index) => ({
    id: c.id,
    name: c.name,
    join_code: c.joinCode,
    language: c.language,
    created_at: isoDaysAgo(92 - index * 4),
    is_deleted: false,
    deleted_at: null,
    teacherId: DEMO_TEACHER_ID,
  }));

  const students: DemoState["students"] = [];
  let cursor = 0;
  CLASS_SPECS.forEach((klass, classIndex) => {
    for (let i = 0; i < klass.count; i++, cursor++) {
      const progress = progressForIndex(cursor);
      students.push({
        id: cursor === 0 ? DEMO_STUDENT_ID : `demo-student-${String(cursor + 1).padStart(3, "0")}`,
        name: cursor === 0 ? "Maya Rivera" : studentName(cursor),
        email: `student${String(cursor + 1).padStart(3, "0")}@northbridge.demo`,
        classId: klass.id,
        currentScreen: cursor === 0 ? 106 : progress.currentScreen,
        screensFilled: cursor === 0 ? 106 : progress.screensFilled,
        filledKeys: filledKeysThrough(cursor === 0 ? 106 : progress.screensFilled),
        strengthIds: cursor === 0 ? [6, 7, 13, 16, 23, 24, 6, 13] : strengthsForIndex(cursor),
        lastActive: isoDaysAgo(cursor === 0 ? 0 : (cursor * 7) % 31, cursor % 12),
      });
    }
  });

  const secondaryTeachers: DemoState["teachers"] = [
    {
      id: DEMO_TEACHER_ID,
      names: TEACHER_NAMES,
      email: "emma.johnson@northbridge.demo",
      role: "teacher",
      lastActive: isoDaysAgo(0, 2),
    },
    {
      id: "demo-teacher-2",
      names: { en: "David Miller", fi: "Sanna Niemi", sv: "Erik Johansson" },
      email: "teacher2@northbridge.demo",
      role: "teacher",
      lastActive: isoDaysAgo(1, 4),
    },
    {
      id: "demo-teacher-3",
      names: { en: "Olivia Brown", fi: "Laura Mäkinen", sv: "Sofia Berg" },
      email: "teacher3@northbridge.demo",
      role: "teacher",
      lastActive: isoDaysAgo(2, 5),
    },
    {
      id: "demo-teacher-4",
      names: { en: "James Wilson", fi: "Antti Laine", sv: "Marcus Lindberg" },
      email: "teacher4@northbridge.demo",
      role: "teacher",
      lastActive: isoDaysAgo(4, 2),
    },
    {
      id: "demo-teacher-5",
      names: { en: "Sophia Martinez", fi: "Emilia Saarinen", sv: "Elin Andersson" },
      email: "teacher5@northbridge.demo",
      role: "teacher",
      lastActive: isoDaysAgo(6, 1),
    },
    {
      id: "demo-teacher-6",
      names: { en: "Daniel Lee", fi: "Joonas Kallio", sv: "Oskar Holm" },
      email: "teacher6@northbridge.demo",
      role: "teacher",
      lastActive: isoDaysAgo(9, 3),
    },
  ];

  const assignedStrengths: AssignedStrength[] = [];
  for (let i = 0; i < 28; i++) {
    const student = students[(i * 11) % students.length];
    assignedStrengths.push({
      id: `demo-gift-${i + 1}`,
      student_id: student.id,
      strength_id: String(((i * 7) % 26) + 1),
      message: i % 3 === 0 ? "Great work — you showed this strength clearly." : null,
      created_at: isoDaysAgo((i * 3) % 70, i % 8),
    });
  }

  const teacherCodes: SchoolAdminCode[] = [
    {
      id: "demo-code-1",
      code: "TEACH-K7P4Q",
      code_type: "teacher",
      is_used: false,
      is_revoked: false,
      used_by: null,
      created_at: isoDaysAgo(3),
    },
    {
      id: "demo-code-2",
      code: "TEACH-M9R2L",
      code_type: "teacher",
      is_used: true,
      is_revoked: false,
      used_by: "demo-teacher-4",
      created_at: isoDaysAgo(25),
    },
  ];

  const studentResponses: Record<string, unknown> = {
    screen_6_known_strengths: [6, 7, 13, 23, 24],
    screen_10_mina_olen_1: "6",
    screen_10_mina_olen_2: "7",
    screen_10_mina_olen_3: "13",
    screen_10_mina_olen_4: "23",
    screen_10_mina_olen_5: "24",
    screen_10_mina_olen_6: "16",
    screen_10_mina_olen_7: "25",
    screen_12_karkkikauppa_picks: [5, 6, 12, 22, 23],
    screen_32_strength_1: "6",
    screen_32_strength_2: "13",
  };

  return {
    version: 1,
    classes,
    students,
    teachers: secondaryTeachers,
    principal: {
      id: DEMO_PRINCIPAL_ID,
      names: PRINCIPAL_NAMES,
      email: "principal@northbridge.demo",
    },
    assignedStrengths,
    teacherCodes,
    studentResponses,
    studentCurrentScreen: 106,
  };
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export function getDemoState(): DemoState {
  if (!hasStorage()) return createInitialState();
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed?.version === 1) return parsed;
    } catch {
      // Fall through to a clean deterministic demo state.
    }
  }
  const initial = createInitialState();
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveDemoState(state: DemoState) {
  if (!hasStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetDemoState() {
  if (!hasStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  getDemoState();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onDemoStateChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

export function demoTeacherName(language: Language): string {
  return TEACHER_NAMES[language];
}

export function demoPrincipalName(language: Language): string {
  return PRINCIPAL_NAMES[language];
}

export function demoStudentName(): string {
  return "Maya Rivera";
}

export function getDemoTeacherData(): {
  classes: TeacherClass[];
  deletedClasses: TeacherClass[];
  students: TeacherStudent[];
  assigned: AssignedStrength[];
  events: ReportEvent[];
} {
  const state = getDemoState();
  const classes = state.classes.filter((c) => c.teacherId === DEMO_TEACHER_ID && !c.is_deleted);
  const deletedClasses = state.classes.filter((c) => c.teacherId === DEMO_TEACHER_ID && !!c.is_deleted);
  const classById = new Map(state.classes.map((c) => [c.id, c]));
  const students: TeacherStudent[] = state.students
    .filter((s) => classById.get(s.classId)?.teacherId === DEMO_TEACHER_ID)
    .map((s) => ({
      studentId: s.id,
      displayName: s.name,
      email: s.email,
      currentScreen: s.currentScreen,
      screensFilled: s.screensFilled,
      totalRequiredScreens: 106,
      worldsCompleted: 0,
      lastActive: new Date(s.lastActive),
      classId: s.classId,
      className: classById.get(s.classId)?.name ?? "",
      filledKeys: s.filledKeys,
      strengthIds: s.strengthIds,
    }));

  const events: ReportEvent[] = [];
  for (let day = 0; day < 90; day += 2) {
    const student = students[(day * 7) % Math.max(1, students.length)];
    if (!student) continue;
    events.push({
      userId: student.studentId,
      classId: student.classId,
      at: isoDaysAgo(day, day % 8),
      fieldKey: `demo_progress_${day}`,
      strengths: day % 6 === 0 ? 1 : 0,
      strengthIds: day % 6 === 0 ? [((day / 2) % 26) + 1] : [],
    });
  }
  for (const gift of state.assignedStrengths) {
    const student = students.find((s) => s.studentId === gift.student_id);
    if (!student) continue;
    events.push({
      userId: student.studentId,
      classId: student.classId,
      at: gift.created_at,
      strengths: 1,
      strengthIds: [Number(gift.strength_id)],
    });
  }

  return {
    classes,
    deletedClasses,
    students,
    assigned: state.assignedStrengths,
    events,
  };
}

export function getDemoSchoolAdminData(language: Language): SchoolAdminData {
  const state = getDemoState();
  const classById = new Map(state.classes.filter((c) => !c.is_deleted).map((c) => [c.id, c]));
  const students: SchoolAdminStudent[] = state.students
    .filter((s) => classById.has(s.classId))
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      className: classById.get(s.classId)?.name ?? null,
      classId: s.classId,
      strengthIds: s.strengthIds,
      currentScreen: s.currentScreen,
      lastActive: s.lastActive,
      filledKeys: s.filledKeys,
    }));

  const teachers: SchoolAdminTeacher[] = state.teachers.map((teacher) => {
    const ownClasses = state.classes.filter((c) => c.teacherId === teacher.id && !c.is_deleted);
    const ids = new Set(ownClasses.map((c) => c.id));
    return {
      id: teacher.id,
      name: teacher.names[language],
      email: teacher.email,
      classCount: ownClasses.length,
      studentCount: state.students.filter((s) => ids.has(s.classId)).length,
      lastActive: teacher.lastActive,
      role: teacher.role,
      classNames: ownClasses.map((c) => c.name),
    };
  });

  const strengthCounts = new Map<number, number>();
  for (const s of students) {
    for (const id of s.strengthIds) strengthCounts.set(id, (strengthCounts.get(id) ?? 0) + 1);
  }
  for (const gift of state.assignedStrengths) {
    const id = Number(gift.strength_id);
    strengthCounts.set(id, (strengthCounts.get(id) ?? 0) + 1);
  }

  const events = getDemoTeacherData().events;
  return {
    school: { id: DEMO_SCHOOL_ID, name: DEMO_SCHOOL_NAME },
    students,
    teachers,
    classes: state.classes
      .filter((c) => !c.is_deleted)
      .map((c) => ({
        id: c.id,
        name: c.name,
        teacherName:
          state.teachers.find((t) => t.id === c.teacherId)?.names[language] ?? demoTeacherName(language),
        joinCode: c.join_code,
        language: c.language,
      })),
    codes: state.teacherCodes,
    strengthCounts: [...strengthCounts.entries()].map(([strengthId, count]) => ({
      strengthId: String(strengthId),
      count,
    })),
    events,
  };
}

export function createDemoClass(name: string, language: Language): string {
  const state = getDemoState();
  const id = `demo-class-created-${Date.now()}`;
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  state.classes.unshift({
    id,
    name,
    join_code: `NB-${token}-42`,
    language,
    created_at: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    teacherId: DEMO_TEACHER_ID,
  });
  saveDemoState(state);
  return id;
}

export function deleteDemoClass(id: string) {
  const state = getDemoState();
  const klass = state.classes.find((c) => c.id === id);
  if (!klass) return;
  klass.is_deleted = true;
  klass.deleted_at = new Date().toISOString();
  saveDemoState(state);
}

export function restoreDemoClass(id: string) {
  const state = getDemoState();
  const klass = state.classes.find((c) => c.id === id);
  if (!klass) return;
  klass.is_deleted = false;
  klass.deleted_at = null;
  saveDemoState(state);
}

export function giveDemoStudentStrength(studentId: string, strengthIds: number[], message?: string) {
  const state = getDemoState();
  for (const id of strengthIds) {
    state.assignedStrengths.unshift({
      id: `demo-gift-${Date.now()}-${id}`,
      student_id: studentId,
      strength_id: String(id),
      message: message?.trim() || null,
      created_at: new Date().toISOString(),
    });
    const student = state.students.find((s) => s.id === studentId);
    if (student) student.strengthIds.push(id);
  }
  saveDemoState(state);
}

export function createDemoTeacherCode(): string {
  const state = getDemoState();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  const code = `TEACH-${suffix}`;
  state.teacherCodes.unshift({
    id: `demo-code-${Date.now()}`,
    code,
    code_type: "teacher",
    is_used: false,
    is_revoked: false,
    used_by: null,
    created_at: new Date().toISOString(),
  });
  saveDemoState(state);
  return code;
}

export function revokeDemoTeacherCode(id: string) {
  const state = getDemoState();
  const code = state.teacherCodes.find((c) => c.id === id);
  if (!code) return;
  code.is_revoked = true;
  saveDemoState(state);
}

export function promoteDemoTeacher(id: string) {
  const state = getDemoState();
  const teacher = state.teachers.find((t) => t.id === id);
  if (!teacher) return;
  teacher.role = "school_admin";
  saveDemoState(state);
}

export function getDemoStudentResponse<T = unknown>(fieldKey: string): T | null {
  const value = getDemoState().studentResponses[fieldKey];
  return value === undefined ? null : (value as T);
}

export function setDemoStudentResponse(fieldKey: string, value: unknown) {
  const state = getDemoState();
  state.studentResponses[fieldKey] = value;
  saveDemoState(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("student-response-saved", {
        detail: { fieldKey, filled: demoValueFilled(value) },
      }),
    );
    window.dispatchEvent(new Event("strength-jar:refresh"));
  }
}

export function getDemoStudentProgress() {
  const state = getDemoState();
  const filledKeys = new Set(filledKeysThrough(106));
  for (const [key, value] of Object.entries(state.studentResponses)) {
    if (demoValueFilled(value)) filledKeys.add(key);
  }
  return { filledKeys, currentScreen: state.studentCurrentScreen };
}

export function getDemoStudentJar(): { selected: number[]; collected: number[] } {
  const state = getDemoState();
  const selected = [6, 7, 13, 23, 24];
  const primary = state.students.find((s) => s.id === DEMO_STUDENT_ID);
  const collected = primary?.strengthIds ?? [6, 7, 13, 16, 23, 24];
  return { selected, collected };
}

export function getDemoStudentStrengthEvents(): ReportEvent[] {
  const state = getDemoState();
  const student = state.students.find((s) => s.id === DEMO_STUDENT_ID);
  if (!student) return [];
  const out: ReportEvent[] = [];
  for (let i = 0; i < 18; i++) {
    const id = student.strengthIds[i % student.strengthIds.length];
    out.push({
      userId: DEMO_STUDENT_ID,
      classId: student.classId,
      at: isoDaysAgo(i * 4, i % 6),
      strengths: 1,
      strengthIds: [id],
    });
  }
  return out;
}

function demoValueFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

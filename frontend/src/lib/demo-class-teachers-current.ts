import type { Language } from "@/lib/i18n";
import type {
  AvailableClassroomTeacher,
  ClassroomTeacher,
  ClassroomTeacherManagement,
} from "@/lib/class-teachers.functions";
import { getDemoState } from "@/lib/demo-store";

const STORAGE_KEY = "strength_portfolio_sales_demo_v1";
const CHANGE_EVENT = "strength-portfolio-demo-changed";

type DemoClass = ReturnType<typeof getDemoState>["classes"][number] & { teacher_id?: string };
type DemoState = Omit<ReturnType<typeof getDemoState>, "classes"> & {
  classes: DemoClass[];
  demoClassTeachers?: Record<string, string[]>;
};

function read(): DemoState {
  return getDemoState() as DemoState;
}

function save(state: DemoState) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function ownerId(klass: DemoClass): string {
  return klass.teacher_id ?? klass.teacherId;
}

function teacherName(state: DemoState, id: string, language: Language): string | null {
  return state.teachers.find((teacher) => teacher.id === id)?.names[language] ?? null;
}

function coTeachers(state: DemoState, classId: string): string[] {
  state.demoClassTeachers ??= {};
  return state.demoClassTeachers[classId] ?? (state.demoClassTeachers[classId] = []);
}

export function getDemoClassTeacherManagement(
  classId: string,
  language: Language,
): ClassroomTeacherManagement {
  const state = read();
  const klass = state.classes.find((item) => item.id === classId && !item.is_deleted);
  if (!klass) throw new Error("Demo class not found");

  const owner = ownerId(klass);
  const coIds = coTeachers(state, classId).filter((id) => id !== owner);
  const teachers: ClassroomTeacher[] = [
    { id: owner, name: teacherName(state, owner, language), role: "owner" },
    ...coIds.map((id) => ({
      id,
      name: teacherName(state, id, language),
      role: "co_teacher" as const,
    })),
  ];
  const assigned = new Set(teachers.map((teacher) => teacher.id));
  const available: AvailableClassroomTeacher[] = state.teachers
    .filter((teacher) => teacher.role === "teacher" && !assigned.has(teacher.id))
    .map((teacher) => ({ id: teacher.id, name: teacher.names[language] }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  return { isOwner: true, teachers, available };
}

export function addDemoClassTeacher(classId: string, teacherId: string) {
  const state = read();
  const klass = state.classes.find((item) => item.id === classId && !item.is_deleted);
  const teacher = state.teachers.find((item) => item.id === teacherId && item.role === "teacher");
  if (!klass || !teacher || ownerId(klass) === teacherId) return;
  const ids = coTeachers(state, classId);
  if (!ids.includes(teacherId)) ids.push(teacherId);
  save(state);
}

export function removeDemoClassTeacher(classId: string, teacherId: string) {
  const state = read();
  const klass = state.classes.find((item) => item.id === classId && !item.is_deleted);
  if (!klass || ownerId(klass) === teacherId) return;
  state.demoClassTeachers ??= {};
  state.demoClassTeachers[classId] = coTeachers(state, classId).filter((id) => id !== teacherId);
  save(state);
}

export function transferDemoClassOwnership(classId: string, teacherId: string) {
  const state = read();
  const klass = state.classes.find((item) => item.id === classId && !item.is_deleted);
  if (!klass) return;
  const previousOwner = ownerId(klass);
  if (previousOwner === teacherId) return;
  const nextOwner = state.teachers.find((item) => item.id === teacherId && item.role === "teacher");
  if (!nextOwner) return;

  klass.teacher_id = teacherId;
  const ids = coTeachers(state, classId).filter((id) => id !== teacherId);
  if (!ids.includes(previousOwner)) ids.unshift(previousOwner);
  state.demoClassTeachers![classId] = ids;
  save(state);
}

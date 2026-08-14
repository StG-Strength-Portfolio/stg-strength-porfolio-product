import type { Language } from "@/lib/i18n";
import type { ReceivedStrength, SchoolCommunityRole, SchoolStrengthRecipient } from "@/lib/give-strength.functions";
import type { PeerTopStrengths } from "@/lib/student-strengths.functions";
import type { ReportEvent } from "@/lib/report-series";
import {
  DEMO_PRINCIPAL_ID,
  DEMO_SCHOOL_NAME,
  DEMO_STUDENT_ID,
  DEMO_TEACHER_ID,
  demoPrincipalName,
  demoStudentName,
  demoTeacherName,
  getDemoState,
} from "@/lib/demo-store";

const STORAGE_KEY = "strength_portfolio_sales_demo_v1";
const CHANGE_EVENT = "strength-portfolio-demo-changed";

export type DemoPreviewMode = "student" | "teacher" | "principal";

interface DemoCommunityGift {
  id: string;
  fromUserId: string;
  fromRole: SchoolCommunityRole;
  toUserId: string;
  toRole: SchoolCommunityRole;
  strengthId: number;
  message: string | null;
  createdAt: string;
}

interface DemoProfileOverride {
  name?: string;
  email?: string;
}

type ExtendedDemoState = ReturnType<typeof getDemoState> & {
  communityGifts?: DemoCommunityGift[];
  profileOverrides?: Record<string, DemoProfileOverride>;
};

function state(): ExtendedDemoState {
  return getDemoState() as ExtendedDemoState;
}

function write(next: ExtendedDemoState) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  window.dispatchEvent(new Event("strength-gifts:refresh"));
  window.dispatchEvent(new Event("strength-jar:refresh"));
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function ensureCommunity(next: ExtendedDemoState): DemoCommunityGift[] {
  if (next.communityGifts) return next.communityGifts;
  next.communityGifts = [
    {
      id: "demo-community-1",
      fromUserId: DEMO_TEACHER_ID,
      fromRole: "teacher",
      toUserId: DEMO_STUDENT_ID,
      toRole: "student",
      strengthId: 13,
      message: "You create a welcoming atmosphere for others.",
      createdAt: daysAgo(3),
    },
    {
      id: "demo-community-2",
      fromUserId: DEMO_PRINCIPAL_ID,
      fromRole: "school_admin",
      toUserId: DEMO_STUDENT_ID,
      toRole: "student",
      strengthId: 17,
      message: "You helped the group move forward together.",
      createdAt: daysAgo(8),
    },
    {
      id: "demo-community-3",
      fromUserId: DEMO_STUDENT_ID,
      fromRole: "student",
      toUserId: DEMO_TEACHER_ID,
      toRole: "teacher",
      strengthId: 13,
      message: "Thank you for making it easy to ask for help.",
      createdAt: daysAgo(4),
    },
    {
      id: "demo-community-4",
      fromUserId: DEMO_PRINCIPAL_ID,
      fromRole: "school_admin",
      toUserId: DEMO_TEACHER_ID,
      toRole: "teacher",
      strengthId: 17,
      message: "Thank you for helping our team move forward together.",
      createdAt: daysAgo(11),
    },
    {
      id: "demo-community-5",
      fromUserId: DEMO_TEACHER_ID,
      fromRole: "teacher",
      toUserId: DEMO_PRINCIPAL_ID,
      toRole: "school_admin",
      strengthId: 4,
      message: "You keep the big picture clear for the whole school.",
      createdAt: daysAgo(6),
    },
  ];
  write(next);
  return next.communityGifts;
}

function idForMode(mode: DemoPreviewMode): string {
  return mode === "student"
    ? DEMO_STUDENT_ID
    : mode === "teacher"
      ? DEMO_TEACHER_ID
      : DEMO_PRINCIPAL_ID;
}

function roleForMode(mode: DemoPreviewMode): SchoolCommunityRole {
  return mode === "student" ? "student" : mode === "teacher" ? "teacher" : "school_admin";
}

function personName(next: ExtendedDemoState, id: string, language: Language): string {
  const override = next.profileOverrides?.[id]?.name?.trim();
  if (override) return override;
  if (id === DEMO_PRINCIPAL_ID) return demoPrincipalName(language);
  if (id === DEMO_TEACHER_ID) return demoTeacherName(language);
  if (id === DEMO_STUDENT_ID) return demoStudentName();
  const student = next.students.find((item) => item.id === id);
  if (student) return student.name;
  const teacher = next.teachers.find((item) => item.id === id);
  if (teacher) return teacher.names[language];
  return "—";
}

function personEmail(next: ExtendedDemoState, id: string): string {
  const override = next.profileOverrides?.[id]?.email?.trim();
  if (override) return override;
  if (id === DEMO_PRINCIPAL_ID) return next.principal.email;
  const student = next.students.find((item) => item.id === id);
  if (student) return student.email;
  const teacher = next.teachers.find((item) => item.id === id);
  return teacher?.email ?? "";
}

export function getDemoProfile(mode: DemoPreviewMode, language: Language) {
  const next = state();
  const id = idForMode(mode);
  return {
    id,
    name: personName(next, id, language),
    email: personEmail(next, id),
  };
}

export function updateDemoProfile(
  mode: DemoPreviewMode,
  patch: { name?: string; email?: string },
) {
  const next = state();
  const id = idForMode(mode);
  next.profileOverrides ??= {};
  next.profileOverrides[id] = {
    ...next.profileOverrides[id],
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
  };
  write(next);
}

export function listDemoStrengthRecipients(
  mode: DemoPreviewMode,
  language: Language,
): SchoolStrengthRecipient[] {
  const next = state();
  const actorId = idForMode(mode);
  const people: SchoolStrengthRecipient[] = [
    ...next.students.map((student) => ({
      id: student.id,
      name: personName(next, student.id, language),
      role: "student" as const,
    })),
    ...next.teachers.map((teacher) => ({
      id: teacher.id,
      name: personName(next, teacher.id, language),
      role: teacher.role === "school_admin" ? ("school_admin" as const) : ("teacher" as const),
    })),
    {
      id: DEMO_PRINCIPAL_ID,
      name: personName(next, DEMO_PRINCIPAL_ID, language),
      role: "school_admin" as const,
    },
  ];

  return people
    .filter((person) => person.id !== actorId)
    .filter((person) => mode !== "student" || person.role !== "student")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function giveDemoCommunityStrength(
  mode: DemoPreviewMode,
  recipientId: string,
  strengthIds: number[],
  message: string | null,
  language: Language,
) {
  const next = state();
  const actorId = idForMode(mode);
  const actorRole = roleForMode(mode);
  const recipient = listDemoStrengthRecipients(mode, language).find((item) => item.id === recipientId);
  if (!recipient) throw new Error("Recipient is not available in this demo role");
  const gifts = ensureCommunity(next);
  const cleanIds = [...new Set(strengthIds)].filter((id) => Number.isInteger(id) && id >= 1 && id <= 26).slice(0, 3);
  if (cleanIds.length === 0) throw new Error("No strengths selected");

  const now = new Date().toISOString();
  for (const strengthId of cleanIds) {
    const id = `demo-community-${Date.now()}-${strengthId}-${Math.random().toString(36).slice(2, 6)}`;
    gifts.unshift({
      id,
      fromUserId: actorId,
      fromRole: actorRole,
      toUserId: recipient.id,
      toRole: recipient.role,
      strengthId,
      message: message?.trim() || null,
      createdAt: now,
    });

    if (actorRole === "teacher" && recipient.role === "student") {
      next.assignedStrengths.unshift({
        id,
        student_id: recipient.id,
        strength_id: String(strengthId),
        message: message?.trim() || null,
        created_at: now,
      });
    }
  }
  write(next);
}

export function getDemoReceivedStrengths(userId: string, language: Language): ReceivedStrength[] {
  const next = state();
  return ensureCommunity(next)
    .filter((gift) => gift.toUserId === userId)
    .map((gift) => ({
      id: gift.id,
      strengthId: gift.strengthId,
      message: gift.message,
      createdAt: gift.createdAt,
      fromName: personName(next, gift.fromUserId, language),
      fromRole: gift.fromRole,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDemoStudentReceivedGifts(language: Language) {
  return getDemoReceivedStrengths(DEMO_STUDENT_ID, language).map((gift) => ({
    id: gift.id,
    strength_id: String(gift.strengthId),
    message: gift.message,
    created_at: gift.createdAt,
    teacher_name: gift.fromName,
  }));
}

function topOf(perStudent: Map<string, number[]>) {
  const count = new Map<number, number>();
  const students = new Map<number, Set<string>>();
  for (const [studentId, ids] of perStudent) {
    for (const id of ids) {
      count.set(id, (count.get(id) ?? 0) + 1);
      const set = students.get(id) ?? new Set<string>();
      set.add(studentId);
      students.set(id, set);
    }
  }
  return [...count.entries()]
    .map(([strengthId, value]) => ({
      strengthId,
      count: value,
      students: students.get(strengthId)?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.strengthId - b.strengthId)
    .slice(0, 5);
}

export function getDemoStudentPeerTopStrengths(): PeerTopStrengths {
  const next = state();
  const gifts = ensureCommunity(next);
  const primary = next.students.find((student) => student.id === DEMO_STUDENT_ID);
  const classId = primary?.classId ?? null;
  const className = next.classes.find((klass) => klass.id === classId)?.name ?? null;
  const perStudent = new Map(next.students.map((student) => [student.id, [...student.strengthIds]]));
  const communityIds = new Set(gifts.map((gift) => gift.id));

  for (const gift of gifts) {
    if (gift.toRole !== "student") continue;
    perStudent.set(gift.toUserId, [...(perStudent.get(gift.toUserId) ?? []), gift.strengthId]);
  }
  for (const gift of next.assignedStrengths) {
    if (communityIds.has(gift.id)) continue;
    const strengthId = Number(gift.strength_id);
    if (!Number.isInteger(strengthId)) continue;
    perStudent.set(gift.student_id, [...(perStudent.get(gift.student_id) ?? []), strengthId]);
  }

  const classMap = new Map<string, number[]>();
  for (const student of next.students) {
    if (student.classId === classId) classMap.set(student.id, perStudent.get(student.id) ?? []);
  }

  return {
    className,
    schoolName: DEMO_SCHOOL_NAME,
    classTop: topOf(classMap),
    schoolTop: topOf(perStudent),
  };
}

export function getDemoStudentCommunityEvents(): ReportEvent[] {
  const next = state();
  const student = next.students.find((item) => item.id === DEMO_STUDENT_ID);
  return ensureCommunity(next)
    .filter((gift) => gift.toUserId === DEMO_STUDENT_ID)
    .map((gift) => ({
      userId: DEMO_STUDENT_ID,
      classId: student?.classId ?? null,
      at: gift.createdAt,
      strengths: 1,
      strengthIds: [gift.strengthId],
    }));
}

export function getDemoStudentPortfolio(userId: string) {
  const next = state();
  const student = next.students.find((item) => item.id === userId);
  if (!student) throw new Error("Demo student not found");
  const responses =
    userId === DEMO_STUDENT_ID
      ? Object.entries(next.studentResponses).map(([field_key, value]) => ({ field_key, value }))
      : student.filledKeys.map((field_key) => ({ field_key, value: "Demo response" }));
  return {
    name: personName(next, userId, "en"),
    currentScreen: student.currentScreen,
    responses,
  };
}

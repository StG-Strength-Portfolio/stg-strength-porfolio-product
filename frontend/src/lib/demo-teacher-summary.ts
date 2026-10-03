import type { TeacherStrengthSummaryData } from "@/lib/teacher-strength-summary.functions";
import { DEMO_TEACHER_ID, getDemoState } from "@/lib/demo-store";

interface DemoCommunityGiftRow {
  id: string;
  toUserId: string;
  toRole: "student" | "teacher" | "school_admin";
  strengthId: number;
}

type DemoState = ReturnType<typeof getDemoState> & {
  communityGifts?: DemoCommunityGiftRow[];
};

function add(counts: Map<number, number>, id: number) {
  if (!Number.isInteger(id) || id < 1 || id > 26) return;
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

function top5(counts: Map<number, number>) {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, 5);
}

export function getDemoTeacherStrengthSummary(): TeacherStrengthSummaryData {
  const state = getDemoState() as DemoState;
  const community = state.communityGifts ?? [];

  const schoolCounts = new Map<number, number>();
  for (const student of state.students) {
    for (const id of student.strengthIds) add(schoolCounts, id);
  }
  for (const gift of state.assignedStrengths) {
    add(schoolCounts, Number(gift.strength_id));
  }
  for (const gift of community) {
    if (state.assignedStrengths.some((assigned) => assigned.id === gift.id)) continue;
    add(schoolCounts, gift.strengthId);
  }

  const classes = state.classes
    .filter((klass) => klass.teacherId === DEMO_TEACHER_ID && !klass.is_deleted)
    .map((klass) => {
      const members = state.students.filter((student) => student.classId === klass.id);
      const memberIds = new Set(members.map((student) => student.id));
      const counts = new Map<number, number>();

      for (const student of members) {
        for (const id of student.strengthIds) add(counts, id);
      }
      for (const gift of state.assignedStrengths) {
        if (memberIds.has(gift.student_id)) add(counts, Number(gift.strength_id));
      }
      for (const gift of community) {
        if (gift.toRole !== "student" || !memberIds.has(gift.toUserId)) continue;
        if (state.assignedStrengths.some((assigned) => assigned.id === gift.id)) continue;
        add(counts, gift.strengthId);
      }

      return {
        classId: klass.id,
        className: klass.name,
        strengths: top5(counts),
      };
    });

  return { schoolStrengths: top5(schoolCounts), classes };
}

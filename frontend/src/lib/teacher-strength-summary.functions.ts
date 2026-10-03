import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchStrengthId, strengthIdsFromResponses } from "@/lib/strength-jar-data";

export interface SummaryStrength {
  id: number;
  count: number;
}

export interface ClassStrengthSummary {
  classId: string;
  className: string;
  strengths: SummaryStrength[];
}

export interface TeacherStrengthSummaryData {
  schoolStrengths: SummaryStrength[];
  classes: ClassStrengthSummary[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const QUERY_CHUNK_SIZE = 100;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += QUERY_CHUNK_SIZE) {
    out.push(items.slice(i, i + QUERY_CHUNK_SIZE));
  }
  return out;
}

async function fetchByIds(
  db: any,
  table: string,
  column: string,
  ids: string[],
  select: string,
): Promise<any[]> {
  if (ids.length === 0) return [];

  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const { data, error } = await db.from(table).select(select).in(column, batch);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function requireTeacherSchool(db: any, userId: string): Promise<string> {
  const { data: roles, error: roleError } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (roleError) throw new Error(roleError.message);
  if (!((roles ?? []) as Array<{ role: string }>).some((row) => row.role === "teacher")) {
    throw new Error("Forbidden");
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.school_id) throw new Error("Teacher is not assigned to a school");

  return profile.school_id as string;
}

function storedStrengthId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 26 ? value : null;
  }
  if (typeof value !== "string") return null;

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 26) return numeric;
  return matchStrengthId(value);
}

function addStrength(counts: Map<number, number>, id: number | null) {
  if (!id || id < 1 || id > 26) return;
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

function topFive(counts: Map<number, number>): SummaryStrength[] {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, 5);
}

/**
 * Returns aggregate-only data for the teacher dashboard Summary tab.
 * School totals include all recognised school strength activity. Class totals
 * include student-collected strengths plus teacher-to-student gifts only.
 */
export const getTeacherStrengthSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeacherStrengthSummaryData> => {
    const db = await admin();
    const schoolId = await requireTeacherSchool(db, context.userId);

    const { data: schoolProfiles, error: profilesError } = await db
      .from("profiles")
      .select("id")
      .eq("school_id", schoolId);
    if (profilesError) throw new Error(profilesError.message);

    const schoolProfileIds = ((schoolProfiles ?? []) as Array<{ id: string }>).map((row) => row.id);

    const schoolClassMap = new Map<
      string,
      { id: string; name: string; teacher_id: string; created_at: string }
    >();
    for (const teacherBatch of chunks(schoolProfileIds)) {
      const { data: classes, error: classesError } = await db
        .from("classes")
        .select("id,name,teacher_id,created_at")
        .in("teacher_id", teacherBatch)
        .eq("is_deleted", false);
      if (classesError) throw new Error(classesError.message);
      for (const row of (classes ?? []) as Array<{
        id: string;
        name: string;
        teacher_id: string;
        created_at: string;
      }>) {
        schoolClassMap.set(row.id, row);
      }
    }

    const schoolClasses = [...schoolClassMap.values()];
    const schoolClassIds = schoolClasses.map((row) => row.id);

    const { data: assignments, error: assignmentsError } = await db
      .from("class_teachers")
      .select("class_id")
      .eq("teacher_id", context.userId);
    if (assignmentsError) throw new Error(assignmentsError.message);

    const accessibleClassIds = new Set<string>(
      ((assignments ?? []) as Array<{ class_id: string }>).map((row) => row.class_id),
    );
    for (const row of schoolClasses) {
      if (row.teacher_id === context.userId) accessibleClassIds.add(row.id);
    }

    const visibleClasses = schoolClasses
      .filter((row) => accessibleClassIds.has(row.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const membershipRows = await fetchByIds(
      db,
      "class_members",
      "class_id",
      schoolClassIds,
      "class_id,student_id",
    );

    const studentsByClass = new Map<string, string[]>();
    for (const row of membershipRows as Array<{ class_id: string; student_id: string }>) {
      const list = studentsByClass.get(row.class_id) ?? [];
      list.push(row.student_id);
      studentsByClass.set(row.class_id, list);
    }

    const schoolStudentIds = [
      ...new Set((membershipRows as Array<{ student_id: string }>).map((row) => row.student_id)),
    ];
    const communityIds = [...new Set([...schoolProfileIds, ...schoolStudentIds])];
    const communitySet = new Set(communityIds);

    const responseRows = await fetchByIds(
      db,
      "responses",
      "user_id",
      communityIds,
      "user_id,field_key,value",
    );

    const responsesByUser = new Map<string, Array<{ field_key: string; value: unknown }>>();
    for (const row of responseRows as Array<{
      user_id: string;
      field_key: string;
      value: unknown;
    }>) {
      const list = responsesByUser.get(row.user_id) ?? [];
      list.push({ field_key: row.field_key, value: row.value });
      responsesByUser.set(row.user_id, list);
    }

    const giftRowsById = new Map<string, any>();
    for (const column of ["from_user_id", "to_user_id", "teacher_id", "student_id"] as const) {
      const rows = await fetchByIds(
        db,
        "teacher_assigned_strengths",
        column,
        communityIds,
        "id,strength_id,from_user_id,to_user_id,teacher_id,student_id,from_role,to_role",
      );
      for (const row of rows) giftRowsById.set(row.id as string, row);
    }

    const schoolCounts = new Map<number, number>();
    for (const id of strengthIdsFromResponses(responseRows)) addStrength(schoolCounts, id);

    for (const row of giftRowsById.values()) {
      const linkedToSchool = [row.from_user_id, row.to_user_id, row.teacher_id, row.student_id]
        .filter(Boolean)
        .some((id) => communitySet.has(id as string));
      if (linkedToSchool) addStrength(schoolCounts, storedStrengthId(row.strength_id));
    }

    const classSummaries: ClassStrengthSummary[] = visibleClasses.map((klass) => {
      const studentIds = studentsByClass.get(klass.id) ?? [];
      const studentSet = new Set(studentIds);
      const counts = new Map<number, number>();

      for (const studentId of studentIds) {
        const rows = responsesByUser.get(studentId) ?? [];
        for (const id of strengthIdsFromResponses(rows)) addStrength(counts, id);
      }

      for (const row of giftRowsById.values()) {
        if (row.from_role !== "teacher" || row.to_role !== "student") continue;
        if (!row.student_id || !studentSet.has(row.student_id as string)) continue;
        addStrength(counts, storedStrengthId(row.strength_id));
      }

      return {
        classId: klass.id,
        className: klass.name,
        strengths: topFive(counts),
      };
    });

    return {
      schoolStrengths: topFive(schoolCounts),
      classes: classSummaries,
    };
  });

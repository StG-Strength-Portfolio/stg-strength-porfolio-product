import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchStrengthId, strengthIdsFromResponses } from "@/lib/strength-jar-data";

export interface SchoolTopStrength {
  id: number;
  count: number;
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

/**
 * Returns only aggregate school-level counts. The browser never receives
 * another classroom's students, responses, gift records, or identities.
 */
export const getSchoolTopStrengths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolTopStrength[]> => {
    const db = await admin();
    const schoolId = await requireTeacherSchool(db, context.userId);

    const { data: schoolProfiles, error: profilesError } = await db
      .from("profiles")
      .select("id")
      .eq("school_id", schoolId);
    if (profilesError) throw new Error(profilesError.message);

    const schoolProfileIds = ((schoolProfiles ?? []) as Array<{ id: string }>).map((row) => row.id);
    const activeClassIds: string[] = [];

    for (const teacherBatch of chunks(schoolProfileIds)) {
      const { data: classes, error: classesError } = await db
        .from("classes")
        .select("id")
        .in("teacher_id", teacherBatch)
        .eq("is_deleted", false);
      if (classesError) throw new Error(classesError.message);
      activeClassIds.push(...((classes ?? []) as Array<{ id: string }>).map((row) => row.id));
    }

    const membershipRows = await fetchByIds(
      db,
      "class_members",
      "class_id",
      activeClassIds,
      "student_id",
    );
    const classStudentIds = membershipRows.map((row) => row.student_id as string);
    const communityIds = [...new Set([...schoolProfileIds, ...classStudentIds])];
    const communitySet = new Set(communityIds);

    const responseRows = await fetchByIds(
      db,
      "responses",
      "user_id",
      communityIds,
      "user_id,field_key,value",
    );

    const giftRowsById = new Map<string, any>();
    for (const column of ["from_user_id", "to_user_id", "teacher_id", "student_id"] as const) {
      const rows = await fetchByIds(
        db,
        "teacher_assigned_strengths",
        column,
        communityIds,
        "id,strength_id,from_user_id,to_user_id,teacher_id,student_id",
      );
      for (const row of rows) giftRowsById.set(row.id as string, row);
    }

    const counts = new Map<number, number>();
    const add = (id: number | null) => {
      if (!id || id < 1 || id > 26) return;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    };

    for (const id of strengthIdsFromResponses(responseRows)) add(id);

    for (const row of giftRowsById.values()) {
      const linkedToSchool = [row.from_user_id, row.to_user_id, row.teacher_id, row.student_id]
        .filter(Boolean)
        .some((id) => communitySet.has(id as string));
      if (!linkedToSchool) continue;
      add(storedStrengthId(row.strength_id));
    }

    return [...counts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id - b.id)
      .slice(0, 5);
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { strengthIdsFromResponses } from "@/lib/strength-jar-data";

export interface PeerTopItem {
  strengthId: number;
  count: number;
  students: number;
}

export interface PeerTopStrengths {
  className: string | null;
  schoolName: string | null;
  classTop: PeerTopItem[];
  schoolTop: PeerTopItem[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function topOf(perStudent: Map<string, number[]>): PeerTopItem[] {
  const count = new Map<number, number>();
  const students = new Map<number, Set<string>>();
  for (const [studentId, ids] of perStudent) {
    for (const id of ids) {
      count.set(id, (count.get(id) ?? 0) + 1);
      let set = students.get(id);
      if (!set) {
        set = new Set();
        students.set(id, set);
      }
      set.add(studentId);
    }
  }
  return Array.from(count, ([strengthId, c]) => ({
    strengthId,
    count: c,
    students: students.get(strengthId)?.size ?? 0,
  }))
    .sort((a, b) => b.count - a.count || a.strengthId - b.strengthId)
    .slice(0, 5);
}

/**
 * Aggregated (anonymous) top strengths for the signed-in student's own class
 * and school. Never returns any other student's answers — counts only.
 */
export const getPeerTopStrengths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PeerTopStrengths> => {
    const db = await admin();
    const userId = context.userId;

    const { data: myMemberships } = await db
      .from("class_members")
      .select("class_id")
      .eq("student_id", userId);
    const myClassIds = ((myMemberships ?? []) as any[]).map((m) => m.class_id);
    if (myClassIds.length === 0) {
      return { className: null, schoolName: null, classTop: [], schoolTop: [] };
    }

    const { data: myClasses } = await db
      .from("classes")
      .select("id, name, teacher_id, created_at")
      .in("id", myClassIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    const myClass = ((myClasses ?? []) as any[])[0];
    if (!myClass) {
      return { className: null, schoolName: null, classTop: [], schoolTop: [] };
    }

    const { data: teacherProfile } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", myClass.teacher_id)
      .maybeSingle();
    const schoolId = teacherProfile?.school_id ?? null;

    let schoolName: string | null = null;
    let schoolClassIds: string[] = [myClass.id];
    if (schoolId) {
      const [{ data: school }, { data: schoolTeachers }] = await Promise.all([
        db.from("schools").select("name").eq("id", schoolId).maybeSingle(),
        db.from("profiles").select("id").eq("school_id", schoolId),
      ]);
      schoolName = school?.name ?? null;
      const teacherIds = ((schoolTeachers ?? []) as any[]).map((t) => t.id);
      if (teacherIds.length) {
        const { data: classes } = await db
          .from("classes")
          .select("id")
          .eq("is_deleted", false)
          .in("teacher_id", teacherIds);
        const ids = ((classes ?? []) as any[]).map((c) => c.id);
        if (ids.length) schoolClassIds = ids;
      }
    }

    const { data: members } = await db
      .from("class_members")
      .select("class_id, student_id")
      .in("class_id", Array.from(new Set([...schoolClassIds, myClass.id])));
    const rows = (members ?? []) as any[];
    const classStudents = new Set(
      rows.filter((m) => m.class_id === myClass.id).map((m) => m.student_id as string),
    );
    const schoolStudents = new Set(rows.map((m) => m.student_id as string));
    const allIds = Array.from(schoolStudents);
    if (allIds.length === 0) {
      return { className: myClass.name, schoolName, classTop: [], schoolTop: [] };
    }

    const [{ data: responses }, { data: gifts }] = await Promise.all([
      db.from("responses").select("user_id, field_key, value").in("user_id", allIds),
      db
        .from("teacher_assigned_strengths")
        .select("student_id, strength_id")
        .in("student_id", allIds),
    ]);

    const perStudent = new Map<string, number[]>();
    const push = (studentId: string, ids: number[]) => {
      if (ids.length === 0) return;
      perStudent.set(studentId, (perStudent.get(studentId) ?? []).concat(ids));
    };
    for (const r of (responses ?? []) as any[]) {
      push(r.user_id, strengthIdsFromResponses([{ field_key: r.field_key, value: r.value }]));
    }
    for (const g of (gifts ?? []) as any[]) {
      const id = Number(g.strength_id);
      if (Number.isFinite(id) && id >= 1 && id <= 26) push(g.student_id, [id]);
    }

    const classMap = new Map<string, number[]>();
    for (const [id, ids] of perStudent) if (classStudents.has(id)) classMap.set(id, ids);

    return {
      className: myClass.name ?? null,
      schoolName,
      classTop: topOf(classMap),
      schoolTop: topOf(perStudent),
    };
  });

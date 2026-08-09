import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeStudentStats,
  isFilled,
  TOTAL_REQUIRED,
  type RosterStudent,
} from "@/lib/teacher-data";
import type { Language } from "@/lib/i18n";
import { strengthIdsFromResponses } from "@/lib/strength-jar-data";
import type { ReportEvent } from "@/lib/report-series";

export interface TeacherClass {
  id: string;
  name: string;
  join_code: string;
  language: Language;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface TeacherStudent extends RosterStudent {
  classId: string;
  className: string;
  filledKeys: string[];
  /** Strength ids collected by this student, one entry per occurrence. */
  strengthIds: number[];
}

export interface AssignedStrength {
  id: string;
  student_id: string;
  strength_id: string;
  message: string | null;
  created_at: string;
}

/** Everything the teacher dashboard needs: classes, students, gifted strengths. */
export function useTeacherData() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [deletedClasses, setDeletedClasses] = useState<TeacherClass[]>([]);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [assigned, setAssigned] = useState<AssignedStrength[]>([]);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: cls } = await supabase
        .from("classes" as never)
        .select("id,name,join_code,created_at,language,is_deleted,deleted_at")
        .order("created_at", { ascending: false });
      const allRows = (cls ?? []) as unknown as TeacherClass[];
      const classRows = allRows.filter((c) => !c.is_deleted);
      setClasses(classRows);
      setDeletedClasses(allRows.filter((c) => c.is_deleted));

      const classIds = classRows.map((c) => c.id);
      if (classIds.length === 0) {
        setStudents([]);
        setEvents([]);
      } else {
        const { data: members } = await supabase
          .from("class_members" as never)
          .select("class_id, student_id")
          .in("class_id", classIds as never);
        const memberRows = (members ?? []) as unknown as Array<{
          class_id: string;
          student_id: string;
        }>;
        const ids = Array.from(new Set(memberRows.map((m) => m.student_id)));

        if (ids.length === 0) {
          setStudents([]);
          setEvents([]);
        } else {
          const [{ data: profs }, { data: resps }] = await Promise.all([
            supabase
              .from("profiles" as never)
              .select("id, display_name, current_screen")
              .in("id", ids as never),
            supabase
              .from("responses" as never)
              .select("user_id,field_key,value,updated_at")
              .in("user_id", ids as never),
          ]);

          const profMap = new Map(
            (
              (profs ?? []) as unknown as Array<{
                id: string;
                display_name: string | null;
                current_screen: number | null;
              }>
            ).map((p) => [p.id, p]),
          );

          const classOf = new Map(memberRows.map((m) => [m.student_id, m.class_id]));
          const collected: ReportEvent[] = [];
          const strengthsPer = new Map<string, number[]>();
          const filledPer = new Map<string, Set<string>>();
          const lastPer = new Map<string, Date>();
          for (const r of (resps ?? []) as unknown as Array<{
            user_id: string;
            field_key: string;
            value: unknown;
            updated_at: string;
          }>) {
            if (isFilled(r.value)) {
              let s = filledPer.get(r.user_id);
              if (!s) {
                s = new Set();
                filledPer.set(r.user_id, s);
              }
              s.add(r.field_key);
            }
            const ids = strengthIdsFromResponses([{ field_key: r.field_key, value: r.value }]);
            if (r.updated_at) {
              collected.push({
                userId: r.user_id,
                classId: classOf.get(r.user_id) ?? null,
                at: r.updated_at,
                fieldKey: isFilled(r.value) ? r.field_key : undefined,
                strengths: ids.length,
                strengthIds: ids,
              });
            }
            if (ids.length) {
              const prev = strengthsPer.get(r.user_id) ?? [];
              strengthsPer.set(r.user_id, prev.concat(ids));
            }
            if (r.updated_at) {
              const d = new Date(r.updated_at);
              const cur = lastPer.get(r.user_id);
              if (!cur || d > cur) lastPer.set(r.user_id, d);
            }
          }

          setEvents(collected);
          const classNameById = new Map(classRows.map((c) => [c.id, c.name]));
          setStudents(
            memberRows.map((m) => {
              const filled = filledPer.get(m.student_id) ?? new Set<string>();
              const prof = profMap.get(m.student_id);
              const stats = computeStudentStats(filled, prof?.current_screen ?? 1);

              return {
                studentId: m.student_id,
                displayName: prof?.display_name ?? null,
                email: null,
                currentScreen: prof?.current_screen ?? 1,
                screensFilled: stats.screensFilled,
                totalRequiredScreens: TOTAL_REQUIRED,
                worldsCompleted: stats.worldsCompleted,
                lastActive: lastPer.get(m.student_id) ?? null,
                classId: m.class_id,
                className: classNameById.get(m.class_id) ?? "",
                filledKeys: Array.from(filled),
                strengthIds: strengthsPer.get(m.student_id) ?? [],
              };
            }),
          );
        }
      }

      const { data: gifts } = await supabase
        .from("teacher_assigned_strengths" as never)
        .select("id, student_id, strength_id, message, created_at")
        .eq("teacher_id", u.user.id as never)
        .order("created_at", { ascending: false });
      const giftRows = (gifts ?? []) as unknown as AssignedStrength[];
      setAssigned(giftRows);
      setEvents((prev) => [
        ...prev,
        ...giftRows.map((g) => ({
          userId: g.student_id,
          classId: null,
          at: g.created_at,
          strengths: 1,
        })),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { classes, deletedClasses, students, assigned, events, loading, refresh };
}

/** Strengths a student has received from their teachers (read-only). */
export function useReceivedStrengths() {
  const [items, setItems] = useState<AssignedStrength[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("teacher_assigned_strengths" as never)
        .select("id, student_id, strength_id, message, created_at")
        .eq("student_id", u.user.id as never)
        .order("created_at", { ascending: false });
      if (!cancelled) setItems((data ?? []) as unknown as AssignedStrength[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}

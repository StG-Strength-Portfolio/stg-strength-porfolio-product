/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Language } from "@/lib/i18n";
import { matchStrengthId, strengthIdsFromResponses } from "@/lib/strength-jar-data";
import { computeStudentStats, isFilled, TOTAL_REQUIRED } from "@/lib/teacher-data";
import type { ReportEvent } from "@/lib/report-series";
import type { AssignedStrength, TeacherClass, TeacherStudent } from "@/lib/teacher-dashboard-data";
import type {
  SchoolAdminClass,
  SchoolAdminData,
  SchoolAdminStudent,
  SchoolAdminTeacher,
} from "@/lib/schooladmin.functions";

const QUERY_CHUNK_SIZE = 100;

export interface MonthlyReportRecipient {
  id: string;
  email: string;
  displayName: string | null;
  language: Language;
  schoolId: string;
}

export interface TeacherMonthlyReportSource {
  recipient: MonthlyReportRecipient;
  schoolName: string | null;
  students: TeacherStudent[];
  classes: TeacherClass[];
  assigned: AssignedStrength[];
  events: ReportEvent[];
}

export interface SchoolAdminMonthlyReportSource {
  recipient: MonthlyReportRecipient;
  data: SchoolAdminData;
}

function chunks<T>(items: T[]): T[][] {
  const output: T[][] = [];

  for (let i = 0; i < items.length; i += QUERY_CHUNK_SIZE) {
    output.push(items.slice(i, i + QUERY_CHUNK_SIZE));
  }

  return output;
}

async function fetchByIds(
  table: string,
  column: string,
  ids: string[],
  select: string,
): Promise<any[]> {
  if (ids.length === 0) return [];

  const rows: any[] = [];

  for (const batch of chunks(ids)) {
    const { data, error } = await (supabaseAdmin as any)
      .from(table)
      .select(select)
      .in(column, batch);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

function normalizeLanguage(value: unknown): Language {
  if (value === "fi" || value === "sv" || value === "en") {
    return value;
  }

  return "en";
}

function assignedStrengthId(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw >= 1 && raw <= 26 ? raw : null;
  }

  if (typeof raw !== "string") return null;

  const numeric = Number(raw);

  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 26) {
    return numeric;
  }

  return matchStrengthId(raw);
}

async function loadRecipient(
  userId: string,
  expectedRole: "teacher" | "school_admin",
): Promise<MonthlyReportRecipient> {
  const [{ data: roles, error: roleError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin
        .from("profiles")
        .select("id,display_name,language,school_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (roleError) {
    throw new Error(roleError.message);
  }

  if (profileError) {
    throw new Error(profileError.message);
  }

  const hasRole = (roles ?? []).some((row) => row.role === expectedRole);

  if (!hasRole) {
    throw new Error(`User ${userId} is not a ${expectedRole}`);
  }

  if (!profile?.school_id) {
    throw new Error(`User ${userId} is not assigned to a school`);
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (authError) {
    throw new Error(authError.message);
  }

  const email = authData.user?.email?.trim().toLowerCase();

  if (!email) {
    throw new Error(`User ${userId} does not have an email address`);
  }

  return {
    id: userId,
    email,
    displayName: profile.display_name ?? null,
    language: normalizeLanguage(profile.language),
    schoolId: profile.school_id,
  };
}

/**
 * Server-only equivalent of the data currently used by the
 * Teacher Report dashboard.
 *
 * Unlike useTeacherData(), this does not rely on the currently
 * signed-in browser user. It explicitly resolves the teacher's
 * owned and co-taught classes.
 */
export async function loadTeacherMonthlyReportSource(
  teacherId: string,
): Promise<TeacherMonthlyReportSource> {
  const recipient = await loadRecipient(teacherId, "teacher");

  const { data: school, error: schoolError } = await supabaseAdmin
    .from("schools")
    .select("id,name")
    .eq("id", recipient.schoolId)
    .maybeSingle();

  if (schoolError) {
    throw new Error(schoolError.message);
  }

  const [
    { data: assignments, error: assignmentsError },
    { data: ownedClasses, error: ownedClassesError },
  ] = await Promise.all([
    supabaseAdmin.from("class_teachers").select("class_id").eq("teacher_id", teacherId),
    supabaseAdmin
      .from("classes")
      .select("id,name,join_code,created_at,language,is_deleted,deleted_at,teacher_id")
      .eq("teacher_id", teacherId)
      .eq("is_deleted", false),
  ]);

  if (assignmentsError) {
    throw new Error(assignmentsError.message);
  }

  if (ownedClassesError) {
    throw new Error(ownedClassesError.message);
  }

  const classMap = new Map<string, any>();

  for (const row of ownedClasses ?? []) {
    classMap.set(row.id, row);
  }

  const assignedClassIds = [...new Set((assignments ?? []).map((row) => row.class_id))];

  const assignedClassRows = await fetchByIds(
    "classes",
    "id",
    assignedClassIds,
    "id,name,join_code,created_at,language,is_deleted,deleted_at,teacher_id",
  );

  for (const row of assignedClassRows) {
    if (!row.is_deleted) {
      classMap.set(row.id, row);
    }
  }

  const classes: TeacherClass[] = [...classMap.values()]
    .map((row) => ({
      id: row.id,
      name: row.name,
      join_code: row.join_code ?? "",
      language: normalizeLanguage(row.language),
      created_at: row.created_at,
      teacher_id: row.teacher_id,
      is_deleted: Boolean(row.is_deleted),
      deleted_at: row.deleted_at ?? null,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const classIds = classes.map((klass) => klass.id);

  const memberRows = await fetchByIds("class_members", "class_id", classIds, "class_id,student_id");

  const studentIds = [...new Set(memberRows.map((row) => row.student_id as string))];

  const [profileRows, responseRows] = await Promise.all([
    fetchByIds("profiles", "id", studentIds, "id,display_name,current_screen"),
    fetchByIds("responses", "user_id", studentIds, "user_id,field_key,value,updated_at"),
  ]);

  const profileMap = new Map<
    string,
    {
      id: string;
      display_name: string | null;
      current_screen: number | null;
    }
  >(profileRows.map((profile) => [profile.id, profile]));

  /*
   * Keep this mapping behaviour aligned with useTeacherData().
   * A student can technically appear in more than one class.
   */
  const classOf = new Map<string, string>(memberRows.map((row) => [row.student_id, row.class_id]));

  const classNameById = new Map(classes.map((klass) => [klass.id, klass.name]));

  const strengthsPerStudent = new Map<string, number[]>();

  const filledPerStudent = new Map<string, Set<string>>();

  const lastActivePerStudent = new Map<string, Date>();

  const events: ReportEvent[] = [];

  for (const row of responseRows) {
    if (isFilled(row.value)) {
      let filled = filledPerStudent.get(row.user_id);

      if (!filled) {
        filled = new Set<string>();

        filledPerStudent.set(row.user_id, filled);
      }

      filled.add(row.field_key);
    }

    const strengthIds = strengthIdsFromResponses([
      {
        field_key: row.field_key,
        value: row.value,
      },
    ]);

    if (row.updated_at) {
      events.push({
        userId: row.user_id,
        classId: classOf.get(row.user_id) ?? null,
        at: row.updated_at,
        fieldKey: isFilled(row.value) ? row.field_key : undefined,
        strengths: strengthIds.length,
        strengthIds,
      });

      const updatedAt = new Date(row.updated_at);

      const previous = lastActivePerStudent.get(row.user_id);

      if (!previous || updatedAt > previous) {
        lastActivePerStudent.set(row.user_id, updatedAt);
      }
    }

    if (strengthIds.length > 0) {
      const previous = strengthsPerStudent.get(row.user_id) ?? [];

      strengthsPerStudent.set(row.user_id, previous.concat(strengthIds));
    }
  }

  let students: TeacherStudent[] = memberRows.map((member) => {
    const profile = profileMap.get(member.student_id);

    const filled = filledPerStudent.get(member.student_id) ?? new Set<string>();

    const stats = computeStudentStats(filled, profile?.current_screen ?? 1);

    return {
      studentId: member.student_id,
      displayName: profile?.display_name ?? null,
      email: null,
      currentScreen: profile?.current_screen ?? 1,
      screensFilled: stats.screensFilled,
      totalRequiredScreens: TOTAL_REQUIRED,
      worldsCompleted: stats.worldsCompleted,
      lastActive: lastActivePerStudent.get(member.student_id) ?? null,
      classId: member.class_id,
      className: classNameById.get(member.class_id) ?? "",
      filledKeys: Array.from(filled),
      strengthIds: strengthsPerStudent.get(member.student_id) ?? [],
    };
  });

  const { data: gifts, error: giftsError } = await supabaseAdmin
    .from("teacher_assigned_strengths")
    .select("id,student_id,strength_id,message,created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", {
      ascending: false,
    });

  if (giftsError) {
    throw new Error(giftsError.message);
  }

  const assigned = (gifts ?? []) as AssignedStrength[];

  const giftsPerStudent = new Map<string, number[]>();

  for (const gift of assigned) {
    const strengthId = assignedStrengthId(gift.strength_id);

    if (!strengthId) continue;

    const existing = giftsPerStudent.get(gift.student_id) ?? [];

    existing.push(strengthId);

    giftsPerStudent.set(gift.student_id, existing);

    events.push({
      userId: gift.student_id,
      classId: students.find((student) => student.studentId === gift.student_id)?.classId ?? null,
      at: gift.created_at,
      strengths: 1,
      strengthIds: [strengthId],
    });
  }

  students = students.map((student) => ({
    ...student,
    strengthIds: [...student.strengthIds, ...(giftsPerStudent.get(student.studentId) ?? [])],
  }));

  return {
    recipient,
    schoolName: school?.name ?? null,
    students,
    classes,
    assigned,
    events,
  };
}

async function fetchSchoolClasses(teacherIds: string[]): Promise<any[]> {
  if (teacherIds.length === 0) {
    return [];
  }

  const classes: any[] = [];

  for (const batch of chunks(teacherIds)) {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .select("id,name,teacher_id,join_code,language")
      .eq("is_deleted", false)
      .in("teacher_id", batch);

    if (error) {
      throw new Error(error.message);
    }

    classes.push(...(data ?? []));
  }

  return classes;
}

/**
 * Server-only equivalent of the report data currently used by
 * the School Admin dashboard.
 */
export async function loadSchoolAdminMonthlyReportSource(
  schoolAdminId: string,
): Promise<SchoolAdminMonthlyReportSource> {
  const recipient = await loadRecipient(schoolAdminId, "school_admin");

  const { data: school, error: schoolError } = await supabaseAdmin
    .from("schools")
    .select("id,name")
    .eq("id", recipient.schoolId)
    .maybeSingle();

  if (schoolError) {
    throw new Error(schoolError.message);
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id,display_name,current_screen,updated_at")
    .eq("school_id", recipient.schoolId);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileRows = (profiles ?? []) as Array<{
    id: string;
    display_name: string | null;
    current_screen: number | null;
    updated_at: string | null;
  }>;

  const memberIds = profileRows.map((profile) => profile.id);

  const roleRows = await fetchByIds("user_roles", "user_id", memberIds, "user_id,role");

  const roleOf = new Map<string, string>();

  for (const row of roleRows) {
    roleOf.set(row.user_id, row.role);
  }

  const nameOf = new Map<string, string | null>(
    profileRows.map((profile) => [profile.id, profile.display_name]),
  );

  const teacherIds = memberIds.filter((id) => roleOf.get(id) === "teacher");

  const adminIds = memberIds.filter((id) => roleOf.get(id) === "school_admin");

  const classRows = await fetchSchoolClasses(teacherIds);

  const classIds = classRows.map((klass) => klass.id as string);

  const memberRows = await fetchByIds("class_members", "class_id", classIds, "class_id,student_id");

  const classNameById = new Map<string, string>(classRows.map((klass) => [klass.id, klass.name]));

  const classOfStudent = new Map<string, string>();

  const classIdOfStudent = new Map<string, string>();

  const studentsPerClass = new Map<string, number>();

  for (const member of memberRows) {
    classOfStudent.set(member.student_id, classNameById.get(member.class_id) ?? "");

    classIdOfStudent.set(member.student_id, member.class_id);

    studentsPerClass.set(member.class_id, (studentsPerClass.get(member.class_id) ?? 0) + 1);
  }

  const studentIdSet = new Set<string>(memberIds.filter((id) => roleOf.get(id) === "student"));

  for (const member of memberRows) {
    if ((roleOf.get(member.student_id) ?? "student") === "student") {
      studentIdSet.add(member.student_id);
    }
  }

  const studentIds = Array.from(studentIdSet);

  const communityIdSet = new Set<string>([...memberIds, ...studentIds]);

  const missingIds = studentIds.filter((id) => !nameOf.has(id));

  const extraProfiles = await fetchByIds(
    "profiles",
    "id",
    missingIds,
    "id,display_name,current_screen,updated_at",
  );

  for (const profile of extraProfiles) {
    nameOf.set(profile.id, profile.display_name ?? null);
  }

  const allProfileRows = [...profileRows, ...extraProfiles];

  const profileById = new Map<string, any>(allProfileRows.map((profile) => [profile.id, profile]));

  const responseRows = await fetchByIds(
    "responses",
    "user_id",
    studentIds,
    "user_id,field_key,value,updated_at",
  );

  const filledPerStudent = new Map<string, Set<string>>();

  const lastActivePerStudent = new Map<string, string>();

  for (const response of responseRows) {
    if (isFilled(response.value)) {
      let filled = filledPerStudent.get(response.user_id);

      if (!filled) {
        filled = new Set<string>();

        filledPerStudent.set(response.user_id, filled);
      }

      filled.add(response.field_key);
    }

    if (response.updated_at) {
      const previous = lastActivePerStudent.get(response.user_id);

      if (!previous || response.updated_at > previous) {
        lastActivePerStudent.set(response.user_id, response.updated_at);
      }
    }
  }

  /*
   * Query only assignments connected to this school.
   * The current dashboard ultimately applies the same school
   * membership rule, but this avoids reading the whole table.
   */
  const giftRowsById = new Map<string, any>();

  const communityIds = Array.from(communityIdSet);

  for (const column of ["from_user_id", "to_user_id", "teacher_id", "student_id"] as const) {
    const rows = await fetchByIds(
      "teacher_assigned_strengths",
      column,
      communityIds,
      "id,strength_id,student_id,teacher_id,from_user_id,to_user_id,created_at",
    );

    for (const row of rows) {
      giftRowsById.set(row.id, row);
    }
  }

  const strengthCounts = new Map<string, number>();

  const giftsPerStudent = new Map<string, number[]>();

  for (const gift of giftRowsById.values()) {
    const linkedToSchool = [gift.from_user_id, gift.to_user_id, gift.teacher_id, gift.student_id]
      .filter(Boolean)
      .some((id) => communityIdSet.has(id));

    if (!linkedToSchool) continue;

    const rawStrengthId = String(gift.strength_id);

    strengthCounts.set(rawStrengthId, (strengthCounts.get(rawStrengthId) ?? 0) + 1);

    const strengthId = assignedStrengthId(gift.strength_id);

    const recipientId = gift.to_user_id ?? gift.student_id;

    if (strengthId && recipientId && studentIdSet.has(recipientId)) {
      const existing = giftsPerStudent.get(recipientId) ?? [];

      existing.push(strengthId);

      giftsPerStudent.set(recipientId, existing);
    }
  }

  const events: ReportEvent[] = [];

  for (const response of responseRows) {
    if (!studentIdSet.has(response.user_id) || !response.updated_at) {
      continue;
    }

    const strengthIds = strengthIdsFromResponses([
      {
        field_key: response.field_key,
        value: response.value,
      },
    ]);

    events.push({
      userId: response.user_id,
      classId: classIdOfStudent.get(response.user_id) ?? null,
      at: response.updated_at,
      fieldKey: isFilled(response.value) ? response.field_key : undefined,
      strengths: strengthIds.length,
      strengthIds,
    });
  }

  for (const gift of giftRowsById.values()) {
    const recipientId = gift.to_user_id ?? gift.student_id;

    if (!recipientId || !studentIdSet.has(recipientId) || !gift.created_at) {
      continue;
    }

    const strengthId = assignedStrengthId(gift.strength_id);

    events.push({
      userId: recipientId,
      classId: classIdOfStudent.get(recipientId) ?? null,
      at: gift.created_at,
      strengths: 1,
      strengthIds: strengthId ? [strengthId] : [],
    });
  }

  const responsesPerStudent = new Map<
    string,
    Array<{
      field_key: string;
      value: unknown;
    }>
  >();

  for (const response of responseRows) {
    const existing = responsesPerStudent.get(response.user_id) ?? [];

    existing.push({
      field_key: response.field_key,
      value: response.value,
    });

    responsesPerStudent.set(response.user_id, existing);
  }

  const students: SchoolAdminStudent[] = studentIds.map((id) => ({
    id,
    name: nameOf.get(id) ?? null,
    email: null,
    className: classOfStudent.get(id) ?? null,
    classId: classIdOfStudent.get(id) ?? null,
    strengthIds: [
      ...strengthIdsFromResponses(responsesPerStudent.get(id) ?? []),
      ...(giftsPerStudent.get(id) ?? []),
    ],
    currentScreen: profileById.get(id)?.current_screen ?? 1,
    lastActive: lastActivePerStudent.get(id) ?? profileById.get(id)?.updated_at ?? null,
    filledKeys: Array.from(filledPerStudent.get(id) ?? []),
  }));

  const teachers: SchoolAdminTeacher[] = [...teacherIds, ...adminIds].map((id) => {
    const ownClasses = classRows.filter((klass) => klass.teacher_id === id);

    return {
      id,
      name: nameOf.get(id) ?? null,
      email: null,
      classCount: ownClasses.length,
      studentCount: ownClasses.reduce(
        (sum, klass) => sum + (studentsPerClass.get(klass.id) ?? 0),
        0,
      ),
      lastActive: profileById.get(id)?.updated_at ?? null,
      role: roleOf.get(id) ?? "teacher",
      classNames: ownClasses.map((klass) => klass.name),
    };
  });

  const classes: SchoolAdminClass[] = classRows.map((klass) => ({
    id: klass.id,
    name: klass.name,
    teacherName: nameOf.get(klass.teacher_id) ?? null,
    joinCode: klass.join_code ?? null,
    language: klass.language ?? null,
  }));

  const data: SchoolAdminData = {
    school: school ?? null,
    students,
    teachers,
    classes,

    /*
     * Monthly report calculation does not use school codes,
     * so there is no reason for the scheduled job to load them.
     */
    codes: [],

    strengthCounts: Array.from(strengthCounts, ([strengthId, count]) => ({
      strengthId,
      count,
    })).sort((a, b) => b.count - a.count),

    events,
  };

  return {
    recipient,
    data,
  };
}

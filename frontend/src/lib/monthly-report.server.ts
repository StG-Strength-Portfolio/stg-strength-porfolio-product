import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStrengthName } from "@/lib/strengths-i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */

const HELSINKI_TIME_ZONE = "Europe/Helsinki";
const TOTAL_REQUIRED_SCREENS = 106;

type StaffRole = "teacher" | "school_admin";
type Lang = "fi" | "en" | "sv";

type RuntimeEnv = Record<string, string | undefined>;

export type MonthlyReportRunResult = {
  skipped: boolean;
  reportMonth: string | null;
  sent: number;
  failed: number;
  optedOut: number;
};

function runtimeEnv(): RuntimeEnv {
  const globalEnv = (globalThis as { __env__?: RuntimeEnv }).__env__;
  return {
    ...(typeof process !== "undefined" ? process.env : {}),
    ...(globalEnv ?? {}),
  };
}

function helsinkiParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HELSINKI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
  };
}

/**
 * The Cloudflare trigger can safely run hourly on day 3. This guard makes the
 * actual send happen only at 08:00 Europe/Helsinki, including DST changes.
 */
export function isMonthlyReportWindow(date = new Date()): boolean {
  const local = helsinkiParts(date);
  return local.day === 3 && local.hour === 8;
}

function previousReportMonth(date: Date): {
  key: string;
  start: string;
  end: string;
  display: string;
} {
  const local = helsinkiParts(date);
  const monthIndex = local.month - 2;
  const previous = new Date(Date.UTC(local.year, monthIndex, 1));
  const next = new Date(Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth() + 1, 1));
  const year = previous.getUTCFullYear();
  const month = String(previous.getUTCMonth() + 1).padStart(2, "0");
  return {
    key: `${year}-${month}-01`,
    start: previous.toISOString(),
    end: next.toISOString(),
    display: `${month}/${year}`,
  };
}

function normalizeLang(value: unknown): Lang {
  return value === "sv" ? "sv" : value === "fi" ? "fi" : "en";
}

function formatTopStrengths(counts: Map<number, number>, lang: Lang): string {
  return [...counts.entries()]
    .filter(([id]) => Number.isInteger(id) && id >= 1 && id <= 26)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 5)
    .map(([id, count]) => `${getStrengthName(id, lang)} (${count})`)
    .join(", ");
}

async function sendResendTemplate(args: {
  apiKey: string;
  templateId: string;
  from: string;
  to: string;
  idempotencyKey: string;
  variables: Record<string, string | number>;
}): Promise<string | null> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      template: {
        id: args.templateId,
        variables: args.variables,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Resend HTTP ${response.status}`);
  }
  return payload.id ?? null;
}

/**
 * Send the previous calendar month's aggregate reports. No response text,
 * portfolio content, or student names/emails are included in the Resend payload.
 */
export async function runMonthlyReports(
  now = new Date(),
  options: { force?: boolean } = {},
): Promise<MonthlyReportRunResult> {
  if (!options.force && !isMonthlyReportWindow(now)) {
    return { skipped: true, reportMonth: null, sent: 0, failed: 0, optedOut: 0 };
  }

  const env = runtimeEnv();
  const apiKey = env.RESEND_API_KEY;
  const templateId = env.RESEND_MONTHLY_REPORT_TEMPLATE_ID;
  const from = env.RESEND_MONTHLY_REPORT_FROM || "Strength Portfolio <hello@strengthportfolio.com>";
  if (!apiKey || !templateId) {
    throw new Error("Missing RESEND_API_KEY or RESEND_MONTHLY_REPORT_TEMPLATE_ID");
  }

  const db = supabaseAdmin as any;
  const month = previousReportMonth(now);

  const [{ data: roles, error: rolesError }, { data: schools, error: schoolsError }] =
    await Promise.all([
      db.from("user_roles").select("user_id, role").in("role", ["teacher", "school_admin"]),
      db.from("schools").select("id, name, is_active").eq("is_active", true),
    ]);
  if (rolesError) throw new Error(rolesError.message);
  if (schoolsError) throw new Error(schoolsError.message);

  const activeSchools = new Map<string, string>(
    ((schools ?? []) as Array<{ id: string; name: string }>).map((school) => [school.id, school.name]),
  );
  const roleRows = (roles ?? []) as Array<{ user_id: string; role: StaffRole }>;
  const staffIds = roleRows.map((row) => row.user_id);
  if (!staffIds.length) {
    return { skipped: false, reportMonth: month.key, sent: 0, failed: 0, optedOut: 0 };
  }

  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, school_id, language, monthly_report_opt_out, deleted_at, deactivated_at, locked")
    .in("id", staffIds);
  if (profileError) throw new Error(profileError.message);

  const profileOf = new Map<string, any>(
    ((profiles ?? []) as any[]).map((profile) => [profile.id, profile]),
  );
  const roleOf = new Map<string, StaffRole>(roleRows.map((row) => [row.user_id, row.role]));

  const eligibleIds = staffIds.filter((id) => {
    const profile = profileOf.get(id);
    return (
      profile?.school_id &&
      activeSchools.has(profile.school_id) &&
      !profile.deleted_at &&
      !profile.deactivated_at &&
      !profile.locked
    );
  });

  const { data: authPage, error: authError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw new Error(authError.message);
  const emailOf = new Map<string, string>();
  for (const user of authPage?.users ?? []) {
    if (user.email) emailOf.set(user.id, user.email);
  }

  // Load school/class structure once. School admins receive all active classes
  // in their Customer; teachers receive only classes they own/co-teach.
  const schoolStaffIds = [...new Set((profiles ?? []).map((profile: any) => profile.id))];
  const { data: ownerProfiles } = schoolStaffIds.length
    ? await db.from("profiles").select("id, school_id").in("id", schoolStaffIds)
    : { data: [] };
  const schoolOfOwner = new Map<string, string>(
    ((ownerProfiles ?? []) as Array<{ id: string; school_id: string | null }>)
      .filter((row) => row.school_id)
      .map((row) => [row.id, row.school_id as string]),
  );

  const { data: classes, error: classError } = await db
    .from("classes")
    .select("id, teacher_id")
    .eq("is_deleted", false);
  if (classError) throw new Error(classError.message);
  const classRows = ((classes ?? []) as Array<{ id: string; teacher_id: string }>).filter((cls) =>
    activeSchools.has(schoolOfOwner.get(cls.teacher_id) ?? ""),
  );
  const classIds = classRows.map((cls) => cls.id);
  const { data: assignments, error: assignmentError } = classIds.length
    ? await db.from("class_teachers").select("class_id, teacher_id").in("class_id", classIds)
    : { data: [], error: null };
  if (assignmentError) throw new Error(assignmentError.message);

  const classesForTeacher = new Map<string, Set<string>>();
  for (const cls of classRows) {
    const set = classesForTeacher.get(cls.teacher_id) ?? new Set<string>();
    set.add(cls.id);
    classesForTeacher.set(cls.teacher_id, set);
  }
  for (const row of (assignments ?? []) as Array<{ class_id: string; teacher_id: string }>) {
    const set = classesForTeacher.get(row.teacher_id) ?? new Set<string>();
    set.add(row.class_id);
    classesForTeacher.set(row.teacher_id, set);
  }

  const classesForSchool = new Map<string, Set<string>>();
  for (const cls of classRows) {
    const schoolId = schoolOfOwner.get(cls.teacher_id);
    if (!schoolId) continue;
    const set = classesForSchool.get(schoolId) ?? new Set<string>();
    set.add(cls.id);
    classesForSchool.set(schoolId, set);
  }

  const { data: memberships, error: memberError } = classIds.length
    ? await db.from("class_members").select("class_id, student_id").in("class_id", classIds)
    : { data: [], error: null };
  if (memberError) throw new Error(memberError.message);
  const memberRows = (memberships ?? []) as Array<{ class_id: string; student_id: string }>;

  const allStudentIds = [...new Set(memberRows.map((row) => row.student_id))];
  const [{ data: studentProfiles, error: studentProfileError }, { data: responses, error: responseError }] =
    allStudentIds.length
      ? await Promise.all([
          db.from("profiles").select("id, current_screen").in("id", allStudentIds),
          db
            .from("responses")
            .select("user_id, updated_at")
            .in("user_id", allStudentIds)
            .gte("updated_at", month.start)
            .lt("updated_at", month.end),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
  if (studentProfileError) throw new Error(studentProfileError.message);
  if (responseError) throw new Error(responseError.message);

  const screenOf = new Map<string, number>(
    ((studentProfiles ?? []) as Array<{ id: string; current_screen: number | null }>).map((row) => [
      row.id,
      row.current_screen ?? 1,
    ]),
  );
  const activeStudentIds = new Set<string>(
    ((responses ?? []) as Array<{ user_id: string }>).map((row) => row.user_id),
  );

  const { data: gifts, error: giftError } = allStudentIds.length
    ? await db
        .from("teacher_assigned_strengths")
        .select("student_id, to_user_id, strength_id, created_at")
        .gte("created_at", month.start)
        .lt("created_at", month.end)
    : { data: [], error: null };
  if (giftError) throw new Error(giftError.message);
  const giftRows = (gifts ?? []) as Array<{
    student_id: string | null;
    to_user_id: string | null;
    strength_id: string;
  }>;

  let sent = 0;
  let failed = 0;
  let optedOut = 0;

  for (const recipientId of eligibleIds) {
    const profile = profileOf.get(recipientId);
    const role = roleOf.get(recipientId);
    const email = emailOf.get(recipientId);
    if (!profile || !role || !email) continue;
    if (profile.monthly_report_opt_out) {
      optedOut += 1;
      continue;
    }

    const schoolId = String(profile.school_id);
    const scopeClassIds =
      role === "school_admin"
        ? classesForSchool.get(schoolId) ?? new Set<string>()
        : classesForTeacher.get(recipientId) ?? new Set<string>();
    const scopeStudents = new Set(
      memberRows
        .filter((row) => scopeClassIds.has(row.class_id))
        .map((row) => row.student_id),
    );

    let completionSum = 0;
    let activeStudents = 0;
    for (const studentId of scopeStudents) {
      completionSum += Math.min(100, ((screenOf.get(studentId) ?? 1) / TOTAL_REQUIRED_SCREENS) * 100);
      if (activeStudentIds.has(studentId)) activeStudents += 1;
    }
    const completionPercent = scopeStudents.size
      ? Math.round(completionSum / scopeStudents.size)
      : 0;

    const strengthCounts = new Map<number, number>();
    for (const gift of giftRows) {
      const targetId = gift.to_user_id ?? gift.student_id;
      if (!targetId || !scopeStudents.has(targetId)) continue;
      const strengthId = Number(gift.strength_id);
      if (!Number.isInteger(strengthId) || strengthId < 1 || strengthId > 26) continue;
      strengthCounts.set(strengthId, (strengthCounts.get(strengthId) ?? 0) + 1);
    }

    const lang = normalizeLang(profile.language);
    const variables: Record<string, string | number> = {
      ROLE: role,
      MONTH: month.display,
      SCHOOL: activeSchools.get(schoolId) ?? "",
      CLASS_COUNT: scopeClassIds.size,
      STUDENT_COUNT: scopeStudents.size,
      ACTIVE_STUDENTS: activeStudents,
      COMPLETION_PERCENT: completionPercent,
      TOP_STRENGTHS: formatTopStrengths(strengthCounts, lang),
      LANGUAGE: lang,
    };

    const { data: existing } = await db
      .from("monthly_report_deliveries")
      .select("id, status")
      .eq("recipient_id", recipientId)
      .eq("report_month", month.key)
      .maybeSingle();
    if (existing?.status === "sent") continue;

    const { data: ledger, error: ledgerError } = await db
      .from("monthly_report_deliveries")
      .upsert(
        {
          recipient_id: recipientId,
          school_id: schoolId,
          report_month: month.key,
          role,
          status: "pending",
          attempt_count: existing ? undefined : 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "recipient_id,report_month" },
      )
      .select("id, attempt_count")
      .single();
    if (ledgerError) {
      failed += 1;
      continue;
    }

    try {
      const providerId = await sendResendTemplate({
        apiKey,
        templateId,
        from,
        to: email,
        idempotencyKey: `monthly-report/${recipientId}/${month.key}`,
        variables,
      });
      await db
        .from("monthly_report_deliveries")
        .update({
          status: "sent",
          provider_message_id: providerId,
          attempt_count: Number(ledger.attempt_count ?? 0) + 1,
          last_error: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ledger.id);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Resend error";
      await db
        .from("monthly_report_deliveries")
        .update({
          status: "failed",
          attempt_count: Number(ledger.attempt_count ?? 0) + 1,
          last_error: message.slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ledger.id);
      failed += 1;
    }
  }

  return { skipped: false, reportMonth: month.key, sent, failed, optedOut };
}

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { domainBrandName, portfolioOriginForLanguage } from "@/lib/domain-language";
import type { Language } from "@/lib/i18n";
import {
  buildSchoolAdminMonthlyReport,
  buildTeacherMonthlyReport,
  type MonthlyReportData,
} from "@/lib/monthly-report-data";
import { getStrengthName } from "@/lib/strengths-i18n";

export type MonthlyReportRole = "teacher" | "school_admin";

export type MonthlyReportSendMode = "test" | "scheduled";

export interface MonthlyReportSendResult {
  ok: boolean;
  sent: boolean;
  skipped?: "already_sent";
  error?: string;
}

type MonthlyReportRecipient = {
  id: string;
  email: string;
  displayName: string | null;
  language: Language;
  schoolId: string;
};

const TEACHER_TEMPLATE_BY_LANGUAGE: Record<Language, string> = {
  fi: "monthly-report-teacher-finnish",
  en: "monthly-report-teacher-english",
  sv: "monthly-report-teacher-swedish",
};

const SCHOOL_ADMIN_TEMPLATE_BY_LANGUAGE: Record<Language, string> = {
  fi: "monthly-report-school-admin-finnish",
  en: "monthly-report-school-admin-english",
  sv: "monthly-report-school-admin-swedish",
};

const TEACHER_SUBJECT_BY_LANGUAGE: Record<Language, string> = {
  fi: "Kuukausiraporttisi",
  en: "Your monthly report",
  sv: "Din månadsrapport",
};

const SCHOOL_ADMIN_SUBJECT_BY_LANGUAGE: Record<Language, string> = {
  fi: "Koulun kuukausiraportti",
  en: "School monthly report",
  sv: "Skolans månadsrapport",
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  return supabaseAdmin;
}

function getResendApiKey(): string | undefined {
  const cfEnv = (
    globalThis as {
      __env__?: Record<string, string | undefined>;
    }
  ).__env__;

  return cfEnv?.RESEND_API_KEY || process.env.RESEND_API_KEY;
}

function templateFor(role: MonthlyReportRole, language: Language): string {
  return role === "teacher"
    ? TEACHER_TEMPLATE_BY_LANGUAGE[language]
    : SCHOOL_ADMIN_TEMPLATE_BY_LANGUAGE[language];
}

function subjectFor(role: MonthlyReportRole, language: Language): string {
  return role === "teacher"
    ? TEACHER_SUBJECT_BY_LANGUAGE[language]
    : SCHOOL_ADMIN_SUBJECT_BY_LANGUAGE[language];
}

function logKeyFor(role: MonthlyReportRole, mode: MonthlyReportSendMode): string {
  const base = role === "teacher" ? "monthly_teacher_report" : "monthly_school_admin_report";

  return mode === "test" ? `${base}_test` : base;
}

function reportUrlFor(role: MonthlyReportRole, language: Language): string {
  const origin = portfolioOriginForLanguage(language);

  return role === "teacher" ? `${origin}/teacher/dashboard` : `${origin}/school-admin/dashboard`;
}

function senderBrandFor(language: Language): string {
  const origin = portfolioOriginForLanguage(language);

  return domainBrandName(new URL(origin).hostname) ?? "Strength Portfolio";
}

function buildTemplateVariables(
  report: MonthlyReportData,
  recipient: MonthlyReportRecipient,
  schoolName: string | null,
  reportUrl: string,
): Record<string, string> {
  const variables: Record<string, string> = {
    RECIPIENT_NAME: recipient.displayName ?? "",
    SCHOOL_NAME: schoolName ?? "",
    PERIOD_DAYS: String(report.days),

    STUDENT_COUNT: String(report.studentCount),
    CLASS_COUNT: String(report.classCount),
    TEACHER_COUNT: String(report.teacherCount ?? 0),

    AVERAGE_COMPLETION: `${report.averageCompletion}%`,
    AT_RISK_COUNT: String(report.atRiskCount),

    CLASS_SUMMARY:
      report.classCompletion.length > 0
        ? report.classCompletion
            .map((item) => `${item.name} — ${item.completionPercent}%`)
            .join(" • ")
        : "—",

    REPORT_URL: reportUrl,
  };

  for (let index = 0; index < 5; index += 1) {
    const item = report.topStrengths[index];

    const position = index + 1;

    variables[`TOP_${position}_NAME`] = item ? getStrengthName(item.id, recipient.language) : "";

    variables[`TOP_${position}_COUNT`] = item ? String(item.count) : "";

    variables[`TOP_${position}_STUDENTS`] =
      item?.studentCount !== undefined ? String(item.studentCount) : "";
  }

  return variables;
}

function currentMonthStartIso(): string {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function alreadySentThisMonth(recipientId: string, templateKey: string): Promise<boolean> {
  const db = await admin();

  const { data, error } = await db
    .from("email_log")
    .select("id")
    .eq("template_key", templateKey)
    .eq("recipient_id", recipientId)
    .eq("status", "sent")
    .gte("created_at", currentMonthStartIso())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[monthly-report] duplicate check failed", error.message);

    return false;
  }

  return Boolean(data);
}

async function writeEmailLog(input: {
  templateKey: string;
  recipient: MonthlyReportRecipient;
  subject: string;
  status: "sent" | "error";
  errorMessage?: string | null;
}): Promise<void> {
  const db = await admin();

  try {
    await db.from("email_log").insert({
      template_key: input.templateKey,
      recipient_email: input.recipient.email,
      recipient_id: input.recipient.id,
      language: input.recipient.language,
      subject: input.subject,
      status: input.status,
      error_message: input.errorMessage ?? null,
    });
  } catch (error) {
    console.warn("[monthly-report] email log failed", error);
  }
}

/**
 * Core monthly-report sender.
 *
 * This is intentionally a plain server-side function so it can
 * later be reused by the Cloudflare monthly scheduler.
 */
export async function sendMonthlyReportForUser(input: {
  userId: string;
  role: MonthlyReportRole;
  mode: MonthlyReportSendMode;
}): Promise<MonthlyReportSendResult> {
  const { userId, role, mode } = input;

  const { loadTeacherMonthlyReportSource, loadSchoolAdminMonthlyReportSource } =
    await import("@/lib/monthly-report-source.server");

  let recipient: MonthlyReportRecipient;
  let report: MonthlyReportData;
  let schoolName: string | null;

  if (role === "teacher") {
    const source = await loadTeacherMonthlyReportSource(userId);

    recipient = source.recipient;
    schoolName = source.schoolName;

    report = buildTeacherMonthlyReport({
      students: source.students,
      classes: source.classes,
      events: source.events,
      assigned: source.assigned,
    });
  } else {
    const source = await loadSchoolAdminMonthlyReportSource(userId);

    recipient = source.recipient;

    report = buildSchoolAdminMonthlyReport(source.data);

    schoolName = report.schoolName ?? null;
  }

  const templateKey = logKeyFor(role, mode);

  /*
   * Test sends intentionally bypass the monthly duplicate guard.
   * They also use a separate email_log key, so testing cannot
   * accidentally prevent the real month-end email.
   */
  if (mode === "scheduled" && (await alreadySentThisMonth(recipient.id, templateKey))) {
    return {
      ok: true,
      sent: false,
      skipped: "already_sent",
    };
  }

  const resendApiKey = getResendApiKey();

  if (!resendApiKey) {
    console.error("[monthly-report] Missing RESEND_API_KEY");

    return {
      ok: false,
      sent: false,
      error: "Missing RESEND_API_KEY",
    };
  }

  const language = recipient.language;

  const templateId = templateFor(role, language);

  const subject = subjectFor(role, language);

  const reportUrl = reportUrlFor(role, language);

  const brandName = senderBrandFor(language);

  const variables = buildTemplateVariables(report, recipient, schoolName, reportUrl);

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${brandName} <noreply@strengthportfolio.com>`,
      to: [recipient.email],
      template: {
        id: templateId,
        variables,
      },
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();

    console.error("[monthly-report] Resend failed", resendResponse.status, errorText);

    await writeEmailLog({
      templateKey,
      recipient,
      subject,
      status: "error",
      errorMessage: `Resend ${resendResponse.status}`,
    });

    return {
      ok: false,
      sent: false,
      error: `Resend ${resendResponse.status}`,
    };
  }

  await writeEmailLog({
    templateKey,
    recipient,
    subject,
    status: "sent",
  });

  return {
    ok: true,
    sent: true,
  };
}

/**
 * Manual test sender for the currently signed-in Teacher
 * or School Admin.
 *
 * This is ONLY for testing before the monthly scheduler is enabled.
 */
export const sendMyMonthlyReportTest = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();

    const { data: roleRows, error: roleError } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (roleError) {
      throw new Error(roleError.message);
    }

    const roles = new Set((roleRows ?? []).map((row) => row.role as string));

    let role: MonthlyReportRole | null = null;

    if (roles.has("school_admin")) {
      role = "school_admin";
    } else if (roles.has("teacher")) {
      role = "teacher";
    }

    if (!role) {
      throw new Error("Monthly reports are only available for Teachers and School Admins");
    }

    return sendMonthlyReportForUser({
      userId: context.userId,
      role,
      mode: "test",
    });
  });

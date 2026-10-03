import { domainBrandName, portfolioOriginForLanguage } from "@/lib/domain-language";
import type { Language } from "@/lib/i18n";
import {
  buildSchoolAdminMonthlyReport,
  buildTeacherMonthlyReport,
  type MonthlyReportData,
} from "@/lib/monthly-report-data";
import { getStrengthName } from "@/lib/strengths-i18n";

export type MonthlyReportRole = "teacher" | "school_admin";

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

export const MONTHLY_REPORT_INTERVAL_DAYS = 30;

const MONTHLY_REPORT_INTERVAL_MS = MONTHLY_REPORT_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

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

export function monthlyReportTemplateKeyForRole(role: MonthlyReportRole): string {
  return role === "teacher" ? "monthly_teacher_report" : "monthly_school_admin_report";
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

async function sentWithinLast30Days(recipientId: string, templateKey: string): Promise<boolean> {
  const db = await admin();

  const cutoff = new Date(Date.now() - MONTHLY_REPORT_INTERVAL_MS).toISOString();

  const { data, error } = await db
    .from("email_log")
    .select("id")
    .eq("template_key", templateKey)
    .eq("recipient_id", recipientId)
    .eq("status", "sent")
    .gte("created_at", cutoff)
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
    const { error } = await db.from("email_log").insert({
      template_key: input.templateKey,
      recipient_email: input.recipient.email,
      recipient_id: input.recipient.id,
      language: input.recipient.language,
      subject: input.subject,
      status: input.status,
      error_message: input.errorMessage ?? null,
    });

    if (error) {
      console.warn("[monthly-report] email log failed", error.message);
    }
  } catch (error) {
    console.warn("[monthly-report] email log failed", error);
  }
}

/**
 * Production monthly-report sender.
 *
 * A recipient can receive the same scheduled report
 * at most once every 30 days.
 */
export async function sendMonthlyReportForUser(input: {
  userId: string;
  role: MonthlyReportRole;
}): Promise<MonthlyReportSendResult> {
  const { userId, role } = input;

  const templateKey = monthlyReportTemplateKeyForRole(role);

  /*
   * Check first so scheduler runs can cheaply skip users
   * who already received this report within the last 30 days.
   */
  if (await sentWithinLast30Days(userId, templateKey)) {
    return {
      ok: true,
      sent: false,
      skipped: "already_sent",
    };
  }

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

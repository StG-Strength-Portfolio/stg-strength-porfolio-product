import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  MONTHLY_REPORT_INTERVAL_DAYS,
  monthlyReportTemplateKeyForRole,
  sendMonthlyReportForUser,
  type MonthlyReportRole,
} from "@/lib/monthly-report.functions";

const PAGE_SIZE = 500;
const USER_QUERY_CHUNK_SIZE = 100;
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 100;

const REPORT_INTERVAL_MS =
  MONTHLY_REPORT_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

const ERROR_RETRY_INTERVAL_MS =
  6 * 60 * 60 * 1000;

type StaffRecipient = {
  userId: string;
  role: MonthlyReportRole;
};

type ProfileRow = {
  id: string;
  school_id: string | null;
};

type EmailLogRow = {
  recipient_id: string | null;
  template_key: string;
  status: string;
  created_at: string;
};

export interface MonthlyReportSchedulerResult {
  status: "disabled" | "not_started" | "ok";
  eligible: number;
  due: number;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
}

function runtimeValue(
  name: string,
): string | undefined {
  const cfEnv = (
    globalThis as {
      __env__?: Record<
        string,
        string | undefined
      >;
    }
  ).__env__;

  return (
    cfEnv?.[name] ||
    process.env[name]
  );
}

function configuredStartTime(): number | null {
  const raw = runtimeValue(
    "MONTHLY_REPORT_START_AT",
  );

  if (!raw) return null;

  const parsed = Date.parse(raw);

  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid MONTHLY_REPORT_START_AT: ${raw}`,
    );
  }

  return parsed;
}

function configuredBatchSize(): number {
  const raw = runtimeValue(
    "MONTHLY_REPORT_BATCH_SIZE",
  );

  if (!raw) return DEFAULT_BATCH_SIZE;

  const parsed = Number(raw);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(
    parsed,
    MAX_BATCH_SIZE,
  );
}

function chunks<T>(
  items: T[],
  size: number,
): T[][] {
  const result: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    result.push(
      items.slice(index, index + size),
    );
  }

  return result;
}

async function loadStaffRecipients(): Promise<
  StaffRecipient[]
> {
  const result: StaffRecipient[] = [];

  let from = 0;

  while (true) {
    const { data, error } =
      await supabaseAdmin
        .from("user_roles")
        .select("user_id,role")
        .in("role", [
          "teacher",
          "school_admin",
        ])
        .order("user_id")
        .range(
          from,
          from + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? [])
      .filter(
        (row) =>
          row.role === "teacher" ||
          row.role === "school_admin",
      )
      .map((row) => ({
        userId: row.user_id,
        role:
          row.role as MonthlyReportRole,
      }));

    result.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return result;
}

async function loadProfiles(
  userIds: string[],
): Promise<ProfileRow[]> {
  const result: ProfileRow[] = [];

  for (const batch of chunks(
    userIds,
    USER_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } =
      await supabaseAdmin
        .from("profiles")
        .select("id,school_id")
        .in("id", batch);

    if (error) {
      throw new Error(error.message);
    }

    result.push(
      ...((data ?? []) as ProfileRow[]),
    );
  }

  return result;
}

async function loadActiveSchoolIds(): Promise<
  Set<string>
> {
  const result = new Set<string>();

  let from = 0;

  while (true) {
    const { data, error } =
      await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("is_active", true)
        .order("id")
        .range(
          from,
          from + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];

    for (const row of page) {
      result.add(row.id);
    }

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return result;
}

async function loadRecentEmailLogs(
  cutoffIso: string,
): Promise<EmailLogRow[]> {
  const result: EmailLogRow[] = [];

  let from = 0;

  while (true) {
    const { data, error } =
      await supabaseAdmin
        .from("email_log")
        .select(
          "recipient_id,template_key,status,created_at",
        )
        .in("template_key", [
          "monthly_teacher_report",
          "monthly_school_admin_report",
        ])
        .gte("created_at", cutoffIso)
        .order("created_at", {
          ascending: false,
        })
        .range(
          from,
          from + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(error.message);
    }

    const page =
      (data ?? []) as EmailLogRow[];

    result.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return result;
}

function deliveryKey(
  userId: string,
  role: MonthlyReportRole,
): string {
  return `${userId}:${monthlyReportTemplateKeyForRole(
    role,
  )}`;
}

export async function runMonthlyReportScheduler(
  nowMs = Date.now(),
): Promise<MonthlyReportSchedulerResult> {
  const startAt =
    configuredStartTime();

  if (startAt === null) {
    console.warn(
      "[monthly-report-scheduler] MONTHLY_REPORT_START_AT is not configured",
    );

    return {
      status: "disabled",
      eligible: 0,
      due: 0,
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  if (nowMs < startAt) {
    return {
      status: "not_started",
      eligible: 0,
      due: 0,
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const reportCutoffIso = new Date(
    nowMs - REPORT_INTERVAL_MS,
  ).toISOString();

  const [
    staff,
    activeSchoolIds,
    emailLogs,
  ] = await Promise.all([
    loadStaffRecipients(),
    loadActiveSchoolIds(),
    loadRecentEmailLogs(
      reportCutoffIso,
    ),
  ]);

  const profiles = await loadProfiles(
    staff.map(
      (recipient) =>
        recipient.userId,
    ),
  );

  const profileById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const successfulDeliveryKeys =
    new Set<string>();

  const recentErrorKeys =
    new Set<string>();

  for (const log of emailLogs) {
    if (!log.recipient_id) continue;

    const key = `${log.recipient_id}:${log.template_key}`;

    if (log.status === "sent") {
      successfulDeliveryKeys.add(key);
      continue;
    }

    if (
      log.status === "error" &&
      Date.parse(log.created_at) >=
        nowMs -
          ERROR_RETRY_INTERVAL_MS
    ) {
      recentErrorKeys.add(key);
    }
  }

  const eligible = staff.filter(
    (recipient) => {
      const profile =
        profileById.get(
          recipient.userId,
        );

      return Boolean(
        profile?.school_id &&
          activeSchoolIds.has(
            profile.school_id,
          ),
      );
    },
  );

  const due = eligible.filter(
    (recipient) => {
      const key = deliveryKey(
        recipient.userId,
        recipient.role,
      );

      return (
        !successfulDeliveryKeys.has(
          key,
        ) &&
        !recentErrorKeys.has(key)
      );
    },
  );

  const batch = due.slice(
    0,
    configuredBatchSize(),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of batch) {
    try {
      const result =
        await sendMonthlyReportForUser(
          {
            userId:
              recipient.userId,
            role: recipient.role,
          },
        );

      if (result.sent) {
        sent += 1;
      } else if (
        result.skipped ===
        "already_sent"
      ) {
        skipped += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;

      console.error(
        "[monthly-report-scheduler] recipient failed",
        recipient.userId,
        recipient.role,
        error,
      );
    }
  }

  const result: MonthlyReportSchedulerResult =
    {
      status: "ok",
      eligible: eligible.length,
      due: due.length,
      attempted: batch.length,
      sent,
      skipped,
      failed,
    };

  console.log(
    "[monthly-report-scheduler]",
    JSON.stringify(result),
  );

  return result;
}
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EmailTemplateRow = {
  id: string;
  template_key: string;
  name_fi: string;
  name_en: string;
  name_sv: string;
  subject_fi: string;
  subject_en: string;
  subject_sv: string;
  body_fi: string;
  body_en: string;
  body_sv: string;
  description_fi: string | null;
  description_en: string | null;
  description_sv: string | null;
  updated_at: string;
};

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailTemplateRow[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data, error } = await db
      .from("email_templates")
      .select("*")
      .order("template_key", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as EmailTemplateRow[];
  });

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      subject_fi: string;
      subject_en: string;
      subject_sv: string;
      body_fi: string;
      body_en: string;
      body_sv: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { id, ...fields } = data;
    const { error } = await db
      .from("email_templates")
      .update({ ...fields, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type EmailLogRow = {
  id: string;
  template_key: string;
  recipient_email: string;
  language: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  created_at: string;
};

export type EmailAnalytics = {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  bounced: number;
  openRate: number;
  bounceRate: number;
  byTemplate: { template_key: string; count: number }[];
};

/** Sent log + delivery analytics for the super admin email dashboard. */
export const getEmailLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) => input ?? {})
  .handler(
    async ({ data, context }): Promise<{ rows: EmailLogRow[]; analytics: EmailAnalytics }> => {
      await assertSuperAdmin(context.supabase, context.userId);
      const db = await admin();
      const days = data.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      const { data: rows, error } = await db
        .from("email_log")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);

      const list = (rows ?? []) as EmailLogRow[];
      const sent = list.filter((r) => r.status === "sent").length;
      const failed = list.filter((r) => r.status === "failed").length;
      const opened = list.filter((r) => r.opened_at).length;
      const bounced = list.filter((r) => r.bounced_at || r.status === "bounced").length;
      const byKey = new Map<string, number>();
      for (const r of list) byKey.set(r.template_key, (byKey.get(r.template_key) ?? 0) + 1);

      return {
        rows: list,
        analytics: {
          total: list.length,
          sent,
          failed,
          opened,
          bounced,
          openRate: list.length ? Math.round((opened / list.length) * 100) : 0,
          bounceRate: list.length ? Math.round((bounced / list.length) * 100) : 0,
          byTemplate: Array.from(byKey, ([template_key, count]) => ({ template_key, count })).sort(
            (a, b) => b.count - a.count,
          ),
        },
      };
    },
  );

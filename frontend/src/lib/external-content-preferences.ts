import { supabase } from "@/integrations/supabase/client";

export type PrivacyRegion = "eu_eea" | "us";
export type ExternalContentDecision = "allowed" | "rejected" | "undecided";

export const EXTERNAL_CONTENT_CONSENT_VERSION = 1;

export async function loadExternalContentDecision(
  userId: string,
  schoolId: string,
): Promise<ExternalContentDecision> {
  const { data, error } = await supabase
    .from("external_content_preferences" as never)
    .select("external_content_allowed, consent_version")
    .eq("user_id", userId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "undecided";

  const row = data as {
    external_content_allowed: boolean;
    consent_version: number;
  };

  if (row.consent_version !== EXTERNAL_CONTENT_CONSENT_VERSION) return "undecided";
  return row.external_content_allowed ? "allowed" : "rejected";
}

export async function saveExternalContentDecision(
  userId: string,
  schoolId: string,
  allowed: boolean,
): Promise<ExternalContentDecision> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("external_content_preferences" as never)
    .upsert(
      {
        user_id: userId,
        school_id: schoolId,
        external_content_allowed: allowed,
        consent_version: EXTERNAL_CONTENT_CONSENT_VERSION,
        decided_at: now,
        updated_at: now,
      } as never,
      { onConflict: "user_id,school_id" },
    );

  if (error) throw error;
  return allowed ? "allowed" : "rejected";
}

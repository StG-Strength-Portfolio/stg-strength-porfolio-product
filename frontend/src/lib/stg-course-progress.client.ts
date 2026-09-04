import { supabase } from "@/integrations/supabase/client";

const FIELD_KEY = "teacher_course_1_progress_v1";

export type StoredCourseProgress = Record<string, unknown>;

export async function loadTeacherCourseProgress(): Promise<StoredCourseProgress | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data, error } = await supabase
    .from("responses")
    .select("value")
    .eq("user_id", auth.user.id)
    .eq("field_key", FIELD_KEY)
    .maybeSingle();

  if (error || !data?.value) return null;

  try {
    const parsed = JSON.parse(data.value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredCourseProgress)
      : null;
  } catch {
    return null;
  }
}

export async function saveTeacherCourseProgress(progress: StoredCourseProgress): Promise<boolean> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return false;

  const value = JSON.stringify(progress);
  if (value.length > 40_000) throw new Error("course_progress_too_large");

  const { error } = await supabase.from("responses").upsert(
    {
      user_id: auth.user.id,
      field_key: FIELD_KEY,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,field_key" },
  );

  return !error;
}

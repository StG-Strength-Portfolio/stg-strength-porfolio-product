import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "teacher" | "admin" | "school_admin" | "super_admin";

export async function getCurrentRole(): Promise<AppRole | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("user_roles" as never)
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error || !data) return "student";
  return (data as { role: AppRole }).role;
}

export async function getStudentClassMembership(): Promise<{ classId: string } | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("class_members" as never)
    .select("class_id")
    .eq("student_id", userData.user.id)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { classId: (data as { class_id: string }).class_id };
}

export async function getCurrentScreen(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 1;
  const { data } = await supabase
    .from("profiles" as never)
    .select("current_screen")
    .eq("id", userData.user.id)
    .maybeSingle();
  return (data as { current_screen?: number } | null)?.current_screen ?? 1;
}
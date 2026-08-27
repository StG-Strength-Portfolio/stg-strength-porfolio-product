import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolUserAction =
  | "deactivate"
  | "reactivate"
  | "delete"
  | "restore"
  | "demote_to_teacher";

export const manageSchoolUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      userId: string;
      action: SchoolUserAction;
      replacementTeacherId?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "school_admin_manage_user" as never,
      {
        p_user_id: data.userId,
        p_action: data.action,
        p_replacement_teacher_id: data.replacementTeacherId ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; action?: string };
  });

export const moveStudentToClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { studentId: string; targetClassId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "move_student_to_class" as never,
      {
        p_student_id: data.studentId,
        p_target_class_id: data.targetClassId,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; class_id?: string; already_member?: boolean };
  });

export const deleteStudentResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { studentId: string; fieldKey: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "delete_student_response" as never,
      {
        p_student_id: data.studentId,
        p_field_key: data.fieldKey,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; error?: string };
  });

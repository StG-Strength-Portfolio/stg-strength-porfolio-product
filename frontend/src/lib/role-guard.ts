import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth-helpers";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import {
  DEMO_PRINCIPAL_ID,
  DEMO_SCHOOL_ID,
  DEMO_SCHOOL_NAME,
  DEMO_TEACHER_ID,
  demoPrincipalName,
  demoTeacherName,
} from "@/lib/demo-store";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/i18n";

export interface RoleGuardState {
  ready: boolean;
  role: AppRole | null;
  userId: string | null;
  schoolId: string | null;
  schoolName: string | null;
  displayName: string | null;
  email: string | null;
  preview: boolean;
}

/** Reads the current user's role (defaults to student). */
export async function roleOfCurrentUser(): Promise<AppRole | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("user_roles" as never)
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  return ((data as { role?: AppRole } | null)?.role ?? "student") as AppRole;
}

/** Where a signed-in user belongs, by role. */
export function homeForRole(role: AppRole | null): string {
  switch (role) {
    case "super_admin":
      return "/superadmin/dashboard";
    case "school_admin":
      return "/school-admin/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "admin":
      return "/opettaja";
    default:
      return "/seikkailu";
  }
}

function demoLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const raw = window.localStorage.getItem("student_language");
  return isLanguage(raw) ? raw : DEFAULT_LANGUAGE;
}

/**
 * Client-side gate for role-scoped dashboards. Superadmins may enter the
 * teacher or principal demo UI only when the explicit session preview mode
 * matches. The principal dashboard itself is client-only, while principal
 * subpages may still reuse the real product routes with fictional identities.
 */
export function useRoleGuard(allowed: AppRole[]): RoleGuardState {
  const navigate = useNavigate();
  const [state, setState] = useState<RoleGuardState>({
    ready: false,
    role: null,
    userId: null,
    schoolId: null,
    schoolName: null,
    displayName: null,
    email: null,
    preview: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        navigate({ to: "/auth/login", replace: true });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const role = ((roleRow as { role?: AppRole } | null)?.role ?? "student") as AppRole;

      if (role === "super_admin") {
        const preview = getSuperAdminPreview();
        const wantsTeacher = preview.mode === "teacher" && allowed.includes("teacher");
        const wantsPrincipal = preview.mode === "principal" && allowed.includes("school_admin");
        const language = demoLanguage();

        if (wantsPrincipal) {
          if (window.location.pathname === "/school-admin/dashboard") {
            window.location.href = "/superadmin/demo/principal";
            return;
          }
          if (cancelled) return;
          setState({
            ready: true,
            role: "school_admin",
            userId: DEMO_PRINCIPAL_ID,
            schoolId: DEMO_SCHOOL_ID,
            schoolName: DEMO_SCHOOL_NAME,
            displayName: demoPrincipalName(language),
            email: "principal@northbridge.demo",
            preview: true,
          });
          return;
        }

        if (wantsTeacher) {
          if (cancelled) return;
          setState({
            ready: true,
            role: "teacher",
            userId: DEMO_TEACHER_ID,
            schoolId: DEMO_SCHOOL_ID,
            schoolName: DEMO_SCHOOL_NAME,
            displayName: demoTeacherName(language),
            email: "emma.johnson@northbridge.demo",
            preview: true,
          });
          return;
        }
      }

      if (!allowed.includes(role)) {
        window.location.href = homeForRole(role);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles" as never)
        .select("display_name, school_id")
        .eq("id", user.id)
        .maybeSingle();
      const p = profile as { display_name?: string | null; school_id?: string | null } | null;

      let schoolName: string | null = null;
      if (p?.school_id) {
        const { data: school } = await supabase
          .from("schools" as never)
          .select("name")
          .eq("id", p.school_id)
          .maybeSingle();
        schoolName = (school as { name?: string } | null)?.name ?? null;
      }

      if (cancelled) return;
      setState({
        ready: true,
        role,
        userId: user.id,
        schoolId: p?.school_id ?? null,
        schoolName,
        displayName: p?.display_name ?? null,
        email: user.email ?? null,
        preview: false,
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return state;
}

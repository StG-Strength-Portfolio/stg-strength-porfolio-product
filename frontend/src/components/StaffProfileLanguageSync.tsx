import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, type Language } from "@/lib/i18n";
import { rememberDomainLanguagePreference } from "@/lib/domain-language";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";

/**
 * Teacher/School Admin language is personal profile data. This keeps an old
 * browser-only language preference from overriding profiles.language after
 * login. Student routes are intentionally excluded because their language is
 * still controlled by the existing classroom-language system.
 */
export function StaffProfileLanguageSync() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { language, setLanguage } = useLanguage();
  const isStaffArea = pathname.startsWith("/teacher") || pathname.startsWith("/school-admin");

  useEffect(() => {
    if (!isStaffArea || getSuperAdminPreview().mode) return;

    let cancelled = false;
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) return;

      const { data: roleRow } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const role = (roleRow as { role?: string } | null)?.role;
      if (role !== "teacher" && role !== "school_admin") return;

      const { data: profile } = await supabase
        .from("profiles" as never)
        .select("language")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const raw = (profile as { language?: string | null } | null)?.language;
      const savedLanguage: Language = raw === "sv" ? "sv" : raw === "en" ? "en" : "fi";
      rememberDomainLanguagePreference(savedLanguage);
      if (savedLanguage !== language) setLanguage(savedLanguage);
    })();

    return () => {
      cancelled = true;
    };
  }, [isStaffArea, language, pathname, setLanguage]);

  return null;
}

import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { CornerBlobs } from "@/components/CornerBlobs";
import { ClassRemovedNotice } from "@/components/ClassRemovedNotice";
import { getCurrentRole, getStudentClassMembership } from "@/lib/auth-helpers";
import { homeForRole } from "@/lib/role-guard";
import { NavGateProvider } from "@/lib/screen-completion";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useT, isLanguage, languageFromDisplayName } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/seikkailu")({
  component: SeikkailuLayout,
});

function SeikkailuLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const t = useT();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    (async () => {
      const role = await getCurrentRole();
      if (role && role !== "student") {
        window.location.href = homeForRole(role);
        return;
      }
      const m = await getStudentClassMembership();
      if (!m) {
        navigate({ to: "/liity-yhteisoon", replace: true });
        return;
      }
      // Class language governs everything student-facing. Fetch it once
      // here, apply it, and only then render — avoids flashing Finnish.
      try {
        const { data: removed } = await supabase.rpc("my_classes_deleted" as never);
        if (removed === true) {
          setBlocked(true);
          setReady(true);
          return;
        }
      } catch (err) {
        console.warn("[class-access] check failed:", err);
      }
      try {
        const { data: u } = await supabase.auth.getUser();
        let preferredLang: unknown = null;
        if (u.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles" as never)
            .select("language, display_name")
            .eq("id", u.user.id)
            .maybeSingle();
          let p = profileData as { language?: string; display_name?: string | null } | null;
          if (profileError) {
            const { data: nameOnly } = await supabase
              .from("profiles" as never)
              .select("display_name")
              .eq("id", u.user.id)
              .maybeSingle();
            p = nameOnly as { display_name?: string | null } | null;
          }
          preferredLang = languageFromDisplayName(p?.display_name) ?? p?.language ?? null;
        }
        if (!isLanguage(preferredLang)) {
          const { data: classLang } = await supabase.rpc("get_my_class_language" as never);
          preferredLang = classLang;
        }
        if (isLanguage(preferredLang)) setLanguage(preferredLang);
      } catch (err) {
        console.warn("[i18n] class language resolve failed:", err);
      }
      setReady(true);
    })();
  }, [navigate, setLanguage]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (blocked) return <ClassRemovedNotice />;

  return (
    <NavGateProvider>
      <SidebarProvider>
        <div className="relative flex min-h-screen w-full bg-background text-foreground">
          <CornerBlobs />
          <AppSidebar />
          <div className="relative z-10 flex min-h-screen flex-1 flex-col">
            <TopBar />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
          <Toaster />
        </div>
      </SidebarProvider>
    </NavGateProvider>
  );
}

import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { CornerBlobs } from "@/components/CornerBlobs";
import { ClassRemovedNotice } from "@/components/ClassRemovedNotice";
import { getCurrentRole } from "@/lib/auth-helpers";
import { homeForRole } from "@/lib/role-guard";
import { ProgressionProvider } from "@/lib/progression";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useT, isLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentLayout,
});

function StudentLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const t = useT();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    (async () => {
      const role = await getCurrentRole();
      if (role && role !== "student") {
        window.location.href = homeForRole(role);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData.user?.id ?? null);

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
        const { data: lang } = await supabase.rpc("get_my_class_language" as never);
        if (isLanguage(lang)) setLanguage(lang);
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
    <ProgressionProvider userId={userId} role="student">
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
    </ProgressionProvider>
  );
}

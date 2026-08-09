import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { CornerBlobs } from "@/components/CornerBlobs";
import { ClassRemovedNotice } from "@/components/ClassRemovedNotice";
import { getCurrentRole, getStudentClassMembership } from "@/lib/auth-helpers";
import type { AppRole } from "@/lib/auth-helpers";
import { homeForRole } from "@/lib/role-guard";
import { NavGateProvider } from "@/lib/screen-completion";
// @lovable-new 2026-08-08 — progression context (locking + super admin bypass)
import { ProgressionProvider, setStudentViewMode } from "@/lib/progression";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useT, useTr, isLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/seikkailu")({
  component: SeikkailuLayout,
});

function SeikkailuLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const t = useT();
  const tr = useTr();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserId(u.user?.id ?? null);
      const r = await getCurrentRole();
      setRole(r);

      // @lovable-new 2026-08-08 — super admins may open the student view for
      // QA. Their DB role stays `super_admin`; only the rendered UI changes.
      if (r === "super_admin") {
        setStudentViewMode(true);
        setReady(true);
        return;
      }

      if (r && r !== "student") {
        window.location.href = homeForRole(r);
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
        const { data: lang } = await supabase.rpc("get_my_class_language" as never);
        if (isLanguage(lang)) setLanguage(lang);
      } catch (err) {
        console.warn("[i18n] class language resolve failed:", err);
      }
      setReady(true);
    })();
  }, [navigate, setLanguage]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-foreground">{t("common.loading")}</div>;
  }

  if (blocked) return <ClassRemovedNotice />;

  return (
    <ProgressionProvider userId={userId} role={role}>
      <NavGateProvider>
        <SidebarProvider>
          <div className="relative flex min-h-screen w-full bg-background text-foreground">
            <CornerBlobs />
            <AppSidebar />
            <div className="relative z-10 flex min-h-screen flex-1 flex-col">
              {/* @lovable-new 2026-08-08 — super admin student-view banner */}
              {role === "super_admin" && (
                <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-[color:var(--purple)]">
                  <span>{tr("Oppilasnäkymä (pääkäyttäjä) — lukot ohitettu")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentViewMode(false);
                      window.location.href = "/superadmin/dashboard";
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[color:var(--purple)] shadow"
                  >
                    {tr("Poistu oppilasnäkymästä")}
                  </button>
                </div>
              )}
              <TopBar />
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
            <Toaster />
          </div>
        </SidebarProvider>
      </NavGateProvider>
    </ProgressionProvider>
  );
}

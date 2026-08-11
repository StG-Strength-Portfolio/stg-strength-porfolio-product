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
import { ProgressionProvider, setStudentViewMode } from "@/lib/progression";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useT, isLanguage, languageFromDisplayName } from "@/lib/i18n";
import {
  clearSuperAdminPreview,
  getSuperAdminPreview,
  setSuperAdminPreview,
} from "@/lib/superadmin-preview";
import { DEMO_STUDENT_ID, resetDemoState } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

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
  const { language, setLanguage } = useLanguage();
  const isDemo = role === "super_admin" && getSuperAdminPreview().mode === "student";

  const demoText =
    language === "en"
      ? "Demo mode — fictional data"
      : language === "sv"
        ? "Demoläge — fiktiva data"
        : "Demotila — kuvitteellista dataa";
  const resetLabel =
    language === "en" ? "Reset demo" : language === "sv" ? "Återställ demo" : "Nollaa demo";
  const exitLabel =
    language === "en" ? "Exit demo" : language === "sv" ? "Avsluta demo" : "Poistu demosta";
  const roleLabels = {
    student: language === "en" ? "Student" : language === "sv" ? "Elev" : "Opiskelija",
    teacher: language === "en" ? "Teacher" : language === "sv" ? "Lärare" : "Opettaja",
    principal: language === "en" ? "Principal" : language === "sv" ? "Rektor" : "Rehtori",
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const r = await getCurrentRole();
      setRole(r);

      if (r === "super_admin") {
        setStudentViewMode(true);
        setUserId(getSuperAdminPreview().mode === "student" ? DEMO_STUDENT_ID : u.user?.id ?? null);
        setReady(true);
        return;
      }

      setUserId(u.user?.id ?? null);
      if (r && r !== "student") {
        window.location.href = homeForRole(r);
        return;
      }
      const m = await getStudentClassMembership();
      if (!m) {
        navigate({ to: "/liity-yhteisoon", replace: true });
        return;
      }
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
        const { data: u2 } = await supabase.auth.getUser();
        let preferredLang: unknown = null;
        if (u2.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles" as never)
            .select("language, display_name")
            .eq("id", u2.user.id)
            .maybeSingle();
          let p = profileData as { language?: string; display_name?: string | null } | null;
          if (profileError) {
            const { data: nameOnly } = await supabase
              .from("profiles" as never)
              .select("display_name")
              .eq("id", u2.user.id)
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

  function switchDemoRole(mode: "student" | "teacher" | "principal") {
    setSuperAdminPreview(mode);
    setStudentViewMode(mode === "student");
    window.location.href =
      mode === "student"
        ? "/seikkailu"
        : mode === "teacher"
          ? "/teacher/dashboard"
          : "/school-admin/dashboard";
  }

  return (
    <ProgressionProvider userId={userId} role={role}>
      <NavGateProvider>
        <SidebarProvider>
          <div className="relative flex min-h-screen w-full bg-background text-foreground">
            <CornerBlobs />
            <AppSidebar />
            <div className="relative z-10 flex min-h-screen flex-1 flex-col">
              {isDemo && (
                <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-[color:var(--purple)]">
                  <span>{demoText}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["student", "teacher", "principal"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => switchDemoRole(mode)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold shadow-sm",
                          mode === "student"
                            ? "bg-[color:var(--purple)] text-white"
                            : "bg-white text-[color:var(--purple)]",
                        )}
                      >
                        {roleLabels[mode]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        resetDemoState();
                        window.location.reload();
                      }}
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[color:var(--purple)] shadow-sm"
                    >
                      {resetLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentViewMode(false);
                        clearSuperAdminPreview();
                        window.location.href = "/superadmin/dashboard";
                      }}
                      className="rounded-full border border-[color:var(--purple)] bg-transparent px-3 py-1 text-xs font-bold text-[color:var(--purple)]"
                    >
                      {exitLabel}
                    </button>
                  </div>
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

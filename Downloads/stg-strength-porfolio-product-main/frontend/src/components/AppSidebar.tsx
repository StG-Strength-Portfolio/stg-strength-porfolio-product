import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  MapIcon,
  LockIcon,
  CandyIcon,
  UserIcon,
  WorldIcon,
  PlayIcon, // @lovable-new
  StarIcon, // @lovable-new
} from "@/components/icons/AppIcons";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { WORLDS } from "@/lib/screens";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { supabase } from "@/integrations/supabase/client";
import { useT, useTr } from "@/lib/i18n";
// @lovable-new 2026-08-08 — shared progression rules (level locking)
import { useProgression } from "@/lib/progression";

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const progression = useProgression();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const t = useT();
  const tr = useTr();
  const hint = t("nav.finishFirst");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles" as never)
        .select("school_id")
        .eq("id", uid)
        .maybeSingle();
      const schoolId = (profile as { school_id?: string | null } | null)?.school_id;
      if (!schoolId) return;
      const { data: school } = await supabase
        .from("schools" as never)
        .select("name")
        .eq("id", schoolId)
        .maybeSingle();
      setSchoolName((school as { name?: string } | null)?.name ?? null);
    })();
  }, []);

  const isMap = path === "/seikkailu";
  const activeScreen = (() => {
    const m = path.match(/\/seikkailu\/(\d+)/);
    return m ? Number(m[1]) : null;
  })();

  function go(target: number, locked: boolean) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      if (locked || !progression.canAccessScreen(target)) {
        toast(hint);
        return;
      }
      navigate({ to: "/seikkailu/$screen", params: { screen: String(target) } });
    };
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.general")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isMap}>
                  <Link to="/seikkailu" className="flex items-center gap-2">
                    <MapIcon size={18} /> <span>{t("sidebar.worldmap")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/student/strengths"}>
                  <Link to="/student/strengths" className="flex items-center gap-2">
                    <CandyIcon size={18} /> <span>{tr("Vahvuuteni")}</span>
                  </Link>
                </SidebarMenuButton>
                {/* My strengths stays as a plain navigation row. */}
              </SidebarMenuItem>
              {/* @lovable-new */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/student/sprint"}>
                  <Link to="/student/sprint" className="flex items-center gap-2">
                    <PlayIcon size={18} /> <span>{tr("Vahvuuspeli")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/student/give-strength"}>
                  <Link to="/student/give-strength" className="flex items-start gap-2">
                    <StarIcon size={18} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 break-words whitespace-normal leading-snug">
                      {tr("Anna vahvuus opettajallesi")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/student/profile"}>
                  <Link to="/student/profile" className="flex items-center gap-2">
                    <UserIcon size={18} /> <span>{tr("Profiili")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.modules")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORLDS.map((w) => {
                const inWorld =
                  activeScreen != null && activeScreen >= w.start && activeScreen <= w.end;
                /* @lovable-new 2026-08-08 — one shared progression rule */
                const locked = !progression.canAccessLevel(w);
                const target = locked
                  ? w.start
                  : inWorld
                    ? (activeScreen as number)
                    : progression.resumeScreenForLevel(w);
                const title = tr(w.title);
                const subtitle = tr(w.subtitle);
                const stats = progression.byWorld?.[w.id];
                const pct =
                  stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                return (
                  <SidebarMenuItem key={w.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={inWorld}
                      className="h-auto items-start py-2"
                    >
                      <a
                        /* @lovable-new 2026-08-08 — locked levels are not links:
                           no href, not focusable, not keyboard-activatable. */
                        href={locked ? undefined : `/seikkailu/${target}`}
                        onClick={go(target, locked)}
                        className={`flex items-start gap-2 whitespace-normal ${locked ? "cursor-not-allowed opacity-60" : ""}`}
                        aria-disabled={locked || undefined}
                        tabIndex={locked ? -1 : undefined}
                        title={locked ? hint : `${title} — ${subtitle}`}
                      >
                        <WorldIcon id={w.id} size={18} className="mt-0.5 shrink-0" />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block break-words text-sm font-bold leading-snug">
                            {title}
                            {locked && <LockIcon size={12} className="ml-1 inline opacity-60" />}
                          </span>
                          <span className="block break-words text-xs leading-snug opacity-80">
                            {subtitle}
                          </span>
                          <LevelProgressBar pct={pct} className="w-full" />
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {schoolName && (
        <SidebarFooter>
          <div className="truncate px-2 pb-2 text-xs opacity-60" title={schoolName}>
            {schoolName}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

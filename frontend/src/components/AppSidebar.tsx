import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Map as MapIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { WORLDS } from "@/lib/screens";
import { useNavGate } from "@/lib/screen-completion";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { useStudentProgress } from "@/lib/progress";
import { supabase } from "@/integrations/supabase/client";
import { useT, useTr } from "@/lib/i18n";

function pickResumeTarget(
  start: number,
  end: number,
  currentScreen: number | null,
  completedScreens: Set<number> | undefined,
): number {
  if (currentScreen != null && currentScreen >= start && currentScreen <= end) {
    return currentScreen;
  }
  for (let n = start; n <= end; n++) {
    const req = REQUIREMENTS[n];
    if (!req || req.length === 0) continue;
    if (!completedScreens?.has(n)) return n;
  }
  return start;
}

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { canNavigateTo, currentScreen } = useNavGate();
  const [userId, setUserId] = useState<string | null>(null);
  const t = useT();
  const tr = useTr();
  const hint = t("nav.finishFirst");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const progress = useStudentProgress(userId);

  const isMap = path === "/seikkailu";
  const activeScreen = (() => {
    const m = path.match(/\/seikkailu\/(\d+)/);
    return m ? Number(m[1]) : null;
  })();

  function go(target: number) {
    return (e: React.MouseEvent) => {
      if (!canNavigateTo(target)) {
        e.preventDefault();
        toast(hint);
        return;
      }
      e.preventDefault();
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
                    <MapIcon className="h-4 w-4" /> <span>{t("sidebar.worldmap")}</span>
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
                const inWorld = activeScreen != null && activeScreen >= w.start && activeScreen <= w.end;
                const target = pickResumeTarget(
                  w.start,
                  w.end,
                  inWorld ? activeScreen : currentScreen,
                  progress?.completedScreens,
                );
                const locked = currentScreen != null && target > currentScreen && !canNavigateTo(target);
                const title = tr(w.title);
                const subtitle = tr(w.subtitle);
                return (
                  <SidebarMenuItem key={w.id}>
                    <SidebarMenuButton asChild isActive={inWorld}>
                      <a
                        href={`/seikkailu/${target}`}
                        onClick={go(target)}
                        className="flex items-center gap-2"
                        aria-disabled={locked || undefined}
                        title={locked ? hint : `${title} — ${subtitle}`}
                      >
                        <span className="text-base leading-none" aria-hidden>{w.emoji}</span>
                        <span className="truncate flex-1">{title} — {subtitle}</span>
                        {locked && <Lock className="h-3 w-3 opacity-60" aria-hidden />}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

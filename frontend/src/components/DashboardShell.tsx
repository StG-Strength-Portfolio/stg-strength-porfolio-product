import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CornerBlobs } from "@/components/CornerBlobs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  CandyIcon,
  ChartIcon,
  HomeIcon,
  MapIcon,
  PencilIcon,
  PeopleIcon,
  SparkleIcon,
  StarIcon,
  UserIcon,
} from "@/components/icons/AppIcons";
import { useTr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface ShellTab {
  id: string;
  label: string;
}

const TAB_ICONS: Record<string, (p: { size?: number; className?: string }) => ReactNode> = {
  overview: HomeIcon,
  classes: MapIcon,
  students: PeopleIcon,
  teachers: UserIcon,
  codes: PencilIcon,
  strengths: CandyIcon,
  reports: ChartIcon,
  emails: StarIcon,
  settings: SparkleIcon,
};

/**
 * Shared chrome for the role dashboards: playful purple sidebar, school name
 * bottom-left, FI | SV | EN switcher top-right — matching the student theme.
 */
export function DashboardShell({
  title,
  tabs,
  active,
  onSelect,
  schoolName,
  persistLanguage = true,
  children,
}: {
  title: string;
  tabs: ShellTab[];
  active: string;
  onSelect: (id: string) => void;
  schoolName?: string | null;
  persistLanguage?: boolean;
  children: ReactNode;
}) {
  const tr = useTr();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-8 flex min-h-[70vh] flex-col rounded-[2rem] bg-[color:var(--purple)] p-5 text-white shadow-xl">
            <p className="mb-4 flex items-center gap-2 text-sm font-bold">
              <SparkleIcon size={18} />
              <span className="break-words">{title}</span>
            </p>
            <nav className="space-y-1.5">
              {tabs.map((tb) => {
                const Icon = TAB_ICONS[tb.id] ?? StarIcon;
                const isActive = active === tb.id;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => onSelect(tb.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition-all",
                      isActive
                        ? "bg-white text-[color:var(--purple)] shadow-md"
                        : "text-white/90 hover:bg-white/15",
                    )}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="min-w-0 break-words">{tb.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              className="mt-6 px-4 text-left text-xs text-white/80 underline hover:text-white"
              onClick={() => void signOut()}
            >
              {tr("Kirjaudu ulos")}
            </button>
            <div className="mt-auto break-words pt-10 text-xs text-white/70">
              {schoolName ?? ""}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
            <LanguageSwitcher persistToProfile={persistLanguage} />
          </header>

          <nav className="flex flex-wrap gap-2 md:hidden">
            {tabs.map((tb) => {
              const Icon = TAB_ICONS[tb.id] ?? StarIcon;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => onSelect(tb.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                    active === tb.id
                      ? "bg-[color:var(--purple)] text-white shadow"
                      : "bg-white/80 text-foreground",
                  )}
                >
                  <Icon size={14} />
                  {tb.label}
                </button>
              );
            })}
          </nav>

          {children}

          <p className="pt-6 text-xs opacity-50 md:hidden">{schoolName ?? ""}</p>
        </main>
      </div>
    </div>
  );
}

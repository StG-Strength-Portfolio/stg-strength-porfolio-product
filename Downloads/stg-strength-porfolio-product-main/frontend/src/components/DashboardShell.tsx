import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CornerBlobs } from "@/components/CornerBlobs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  ArrowLeftIcon,
  BookIcon,
  CandyIcon,
  ChartIcon,
  GamepadIcon,
  GiftIcon,
  GridIcon,
  HomeIcon,
  MapIcon,
  PencilIcon,
  PeopleIcon,
  PresentIcon,
  SparkleIcon,
  UserIcon,
} from "@/components/icons/AppIcons";
import { useTr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface ShellTab {
  id: string;
  label: string;
}

type IconCmp = (p: { size?: number; className?: string }) => ReactNode;

const TAB_ICONS: Record<string, IconCmp> = {
  overview: HomeIcon,
  classes: GridIcon,
  students: PeopleIcon,
  teachers: UserIcon,
  codes: PencilIcon,
  strengths: CandyIcon,
  reports: ChartIcon,
  emails: PencilIcon,
  materials: BookIcon,
  settings: UserIcon,
  profile: UserIcon,
};

/**
 * @lovable-new 2026-08-04 — every sidebar link gets a meaningful icon
 * (no more generic stars). Resolved from the destination route.
 */
export function iconForRoute(to: string): IconCmp {
  if (/\/(dashboard|seikkailu)$/.test(to)) return ArrowLeftIcon;
  if (to.includes("classrooms/teachers")) return PeopleIcon;
  if (to.includes("teach/materials")) return BookIcon;
  if (to.includes("teach/portfolio")) return PresentIcon;
  if (to.includes("sprint")) return to.includes("student") ? GamepadIcon : MapIcon;
  if (to.includes("give-strength")) return HeartOrGift;
  if (to.includes("received-strengths")) return GiftIcon;
  if (to.includes("profile")) return UserIcon;
  if (to.includes("strengths")) return CandyIcon;
  return SparkleIcon;
}

const HeartOrGift: IconCmp = GiftIcon;

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
  links, // @lovable-new — route links (Strength Sprint, give strength, …)
  sections, // @lovable-new — grouped route links (e.g. "Teach")
  children,
}: {
  title: string;
  tabs: ShellTab[];
  active: string;
  onSelect: (id: string) => void;
  schoolName?: string | null;
  persistLanguage?: boolean;
  links?: Array<{ to: string; label: string }>;
  sections?: Array<{ label: string; links: Array<{ to: string; label: string }> }>;
  children: ReactNode;
}) {
  const tr = useTr();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isTeacherArea = pathname.startsWith("/teacher");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  const teacherManagementLink = isTeacherArea
    ? { to: "/teacher/classrooms/teachers", label: tr("Opettajat") }
    : null;

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
                const Icon = TAB_ICONS[tb.id] ?? SparkleIcon;
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

            {teacherManagementLink && (
              <nav className="mt-3 space-y-1.5 border-t border-white/20 pt-3">
                <Link
                  to={teacherManagementLink.to}
                  className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition-all hover:bg-white/15"
                  activeProps={{ className: "bg-white text-[color:var(--purple)] shadow-md" }}
                >
                  <PeopleIcon size={18} className="shrink-0" />
                  <span className="min-w-0 break-words">{teacherManagementLink.label}</span>
                </Link>
              </nav>
            )}

            {/* @lovable-new */}
            {links && links.length > 0 && (
              <nav className="mt-3 space-y-1.5 border-t border-white/20 pt-3">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition-all hover:bg-white/15"
                    activeProps={{ className: "bg-white text-[color:var(--purple)] shadow-md" }}
                  >
                    {(() => {
                      const Icon = iconForRoute(l.to);
                      return <Icon size={18} className="shrink-0" />;
                    })()}
                    <span className="min-w-0 break-words">{l.label}</span>
                  </Link>
                ))}
              </nav>
            )}
            {/* @lovable-new */}
            {sections?.map((sec) => (
              <nav key={sec.label} className="mt-3 space-y-1.5 border-t border-white/20 pt-3">
                <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wider text-white/60">
                  {sec.label}
                </p>
                {sec.links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition-all hover:bg-white/15"
                    activeProps={{ className: "bg-white text-[color:var(--purple)] shadow-md" }}
                  >
                    {(() => {
                      const Icon = iconForRoute(l.to);
                      return <Icon size={18} className="shrink-0" />;
                    })()}
                    <span className="min-w-0 break-words">{l.label}</span>
                  </Link>
                ))}
              </nav>
            ))}
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
              const Icon = TAB_ICONS[tb.id] ?? SparkleIcon;
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
            {teacherManagementLink && (
              <Link
                to={teacherManagementLink.to}
                className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-foreground"
                activeProps={{ className: "bg-[color:var(--purple)] text-white shadow" }}
              >
                <PeopleIcon size={14} />
                {teacherManagementLink.label}
              </Link>
            )}
          </nav>

          {children}

          <p className="pt-6 text-xs opacity-50 md:hidden">{schoolName ?? ""}</p>
        </main>
      </div>
    </div>
  );
}

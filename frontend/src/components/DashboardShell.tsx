import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { useLanguage, useTr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  clearSuperAdminPreview,
  getSuperAdminPreview,
  setSuperAdminPreview,
} from "@/lib/superadmin-preview";
import { setStudentViewMode } from "@/lib/progression";
import { resetDemoState } from "@/lib/demo-store";
import { deleteDemoSprintsForHost } from "@/lib/demo-sprint.functions";

export interface ShellTab {
  id: string;
  label: string;
}

type IconCmp = (p: { size?: number; className?: string }) => ReactNode;
type ShellLink = { to: string; label: string };

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

export function iconForRoute(to: string): IconCmp {
  if (/\/(dashboard|seikkailu)$/.test(to)) return ArrowLeftIcon;
  if (to.includes("teach/materials")) return BookIcon;
  if (to.includes("teach/portfolio")) return PresentIcon;
  if (to.includes("sprint")) return to.includes("student") ? GamepadIcon : MapIcon;
  if (to.includes("give-strength")) return HeartOrGift;
  if (to.includes("received-strengths")) return GiftIcon;
  if (to.includes("management")) return PeopleIcon;
  if (to.includes("profile")) return UserIcon;
  if (to.includes("strengths")) return CandyIcon;
  if (to.includes("trash")) return GridIcon;
  return SparkleIcon;
}

const HeartOrGift: IconCmp = GiftIcon;

function mergeCommunityLinks(
  current: ShellLink[] | undefined,
  area: "teacher" | "school-admin" | null,
  labels: { give: string; sprint: string; profile: string; management: string; trash: string },
): ShellLink[] {
  const base = current ?? [];
  if (!area) return base;

  const prefix = area === "teacher" ? "/teacher" : "/school-admin";
  const communityPaths = new Set([
    `${prefix}/give-strength`,
    `${prefix}/sprint`,
    `${prefix}/profile`,
    `${prefix}/management`,
    `${prefix}/trash`,
  ]);
  const backPath = `${prefix}/dashboard`;
  const backLinks = base.filter((link) => link.to === backPath);
  const otherLinks = base.filter(
    (link) => link.to !== backPath && !communityPaths.has(link.to),
  );

  return [
    ...backLinks,
    { to: `${prefix}/give-strength`, label: labels.give },
    { to: `${prefix}/sprint`, label: labels.sprint },
    { to: `${prefix}/profile`, label: labels.profile },
    { to: `${prefix}/management`, label: labels.management },
    ...(area === "school-admin" ? [{ to: `${prefix}/trash`, label: labels.trash }] : []),
    ...otherLinks,
  ];
}

export function DashboardShell({
  title,
  tabs,
  active,
  onSelect,
  schoolName,
  persistLanguage = true,
  links,
  sections,
  children,
}: {
  title: string;
  tabs: ShellTab[];
  active: string;
  onSelect: (id: string) => void;
  schoolName?: string | null;
  persistLanguage?: boolean;
  links?: ShellLink[];
  sections?: Array<{ label: string; links: ShellLink[] }>;
  children: ReactNode;
}) {
  const tr = useTr();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const preview = getSuperAdminPreview();
  const rolePreview = preview.mode === "teacher" || preview.mode === "principal";
  const deleteGuestSprints = useServerFn(deleteDemoSprintsForHost);

  const area = pathname.startsWith("/teacher")
    ? "teacher"
    : pathname.startsWith("/school-admin")
      ? "school-admin"
      : null;
  const communityLabels = {
    give: language === "en" ? "Give a strength" : language === "sv" ? "Ge en styrka" : "Lähetä vahvuus",
    sprint: language === "en" ? "Strength Sprint" : language === "sv" ? "Styrkesprint" : "Vahvuussprintti",
    profile: language === "en" ? "Profile" : language === "sv" ? "Profil" : "Profiili",
    management:
      area === "teacher"
        ? language === "en"
          ? "Student management"
          : language === "sv"
            ? "Elevhantering"
            : "Opiskelijoiden hallinta"
        : language === "en"
          ? "School management"
          : language === "sv"
            ? "Skoladministration"
            : "Koulun hallinta",
    trash: language === "en" ? "Trash" : language === "sv" ? "Papperskorg" : "Roskakori",
  };
  const effectiveLinks = mergeCommunityLinks(links, area, communityLabels);
  const isTeacherDashboard = area === "teacher";
  const isSchoolAdminDashboard = area === "school-admin";
  const hasDashboardCardSpacing = isTeacherDashboard || isSchoolAdminDashboard;
  const visibleTabs = tabs.filter((tab) => {
    if (isTeacherDashboard && tab.id === "strengths") return false;
    if (isSchoolAdminDashboard && tab.id === "settings") return false;
    return true;
  });

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

  const effectiveSections = (sections ?? []).map((section) => {
    const hasSchoolAdminMaterials = section.links.some(
      (link) => link.to === "/school-admin/teach/materials",
    );
    const hasSchoolAdminPortfolio = section.links.some(
      (link) => link.to === "/school-admin/teach/portfolio",
    );
    if (!hasSchoolAdminMaterials || hasSchoolAdminPortfolio) return section;

    return {
      ...section,
      links: [
        { to: "/school-admin/teach/portfolio", label: tr("Vahvuusportfolio") },
        ...section.links,
      ],
    };
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  function exitPreview() {
    setStudentViewMode(false);
    clearSuperAdminPreview();
    window.location.href = "/superadmin/dashboard";
  }

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

  async function resetPreview() {
    try {
      await deleteGuestSprints();
    } catch (error) {
      console.warn("[demo-reset] guest Sprint cleanup", error);
    }
    resetDemoState();
    window.location.reload();
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      {rolePreview && (
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-[color:var(--purple)]">
          <span>{demoText}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["student", "teacher", "principal"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchDemoRole(mode)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold shadow-sm",
                  preview.mode === mode
                    ? "bg-[color:var(--purple)] text-white"
                    : "bg-white text-[color:var(--purple)]",
                )}
              >
                {roleLabels[mode]}
              </button>
            ))}
            <button type="button" onClick={() => void resetPreview()} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[color:var(--purple)] shadow-sm">
              {resetLabel}
            </button>
            <button type="button" onClick={exitPreview} className="rounded-full border border-[color:var(--purple)] bg-transparent px-3 py-1 text-xs font-bold text-[color:var(--purple)]">
              {exitLabel}
            </button>
          </div>
        </div>
      )}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-8 flex min-h-[70vh] flex-col rounded-[2rem] bg-[color:var(--purple)] p-5 text-white shadow-xl">
            <p className="mb-4 flex items-center gap-2 text-sm font-bold">
              <SparkleIcon size={18} />
              <span className="break-words">{title}</span>
            </p>
            <nav className="space-y-1.5">
              {visibleTabs.map((tb) => {
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
            {effectiveLinks.length > 0 && (
              <nav className="mt-3 space-y-1.5 border-t border-white/20 pt-3">
                {effectiveLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition-all hover:bg-white/15"
                    activeProps={{ className: "bg-white text-[color:var(--purple)] shadow-md" }}
                  >
                    {(() => {
                      const Icon = iconForRoute(link.to);
                      return <Icon size={18} className="shrink-0" />;
                    })()}
                    <span className="min-w-0 break-words">{link.label}</span>
                  </Link>
                ))}
              </nav>
            )}
            {effectiveSections.map((section) => (
              <nav key={section.label} className="mt-3 space-y-1.5 border-t border-white/20 pt-3">
                <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wider text-white/60">{section.label}</p>
                {section.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition-all hover:bg-white/15"
                    activeProps={{ className: "bg-white text-[color:var(--purple)] shadow-md" }}
                  >
                    {(() => {
                      const Icon = iconForRoute(link.to);
                      return <Icon size={18} className="shrink-0" />;
                    })()}
                    <span className="min-w-0 break-words">{link.label}</span>
                  </Link>
                ))}
              </nav>
            ))}
            {rolePreview ? (
              <button type="button" className="mt-6 px-4 text-left text-xs text-white/80 underline hover:text-white" onClick={exitPreview}>{exitLabel}</button>
            ) : (
              <button type="button" className="mt-6 px-4 text-left text-xs text-white/80 underline hover:text-white" onClick={() => void signOut()}>{tr("Kirjaudu ulos")}</button>
            )}
            <div className="mt-auto break-words pt-10 text-xs text-white/70">{schoolName ?? ""}</div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
            <LanguageSwitcher persistToProfile={rolePreview ? false : persistLanguage} />
          </header>

          <nav className="flex flex-wrap gap-2 md:hidden">
            {visibleTabs.map((tb) => {
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
          </nav>

          {effectiveLinks.length > 0 && (
            <nav className="flex flex-wrap gap-2 md:hidden">
              {effectiveLinks.map((link) => {
                const Icon = iconForRoute(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-foreground"
                    activeProps={{ className: "bg-[color:var(--purple)] text-white shadow" }}
                  >
                    <Icon size={14} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div
            className={cn(
              hasDashboardCardSpacing &&
                "space-y-6 [&>.grid]:gap-6 [&_button.inline-flex:not(.bg-red-600):not(.bg-red-700)]:bg-[color:var(--yellow)] [&_button.inline-flex:not(.bg-red-600):not(.bg-red-700)]:text-[color:var(--ink)] [&_button.inline-flex:not(.bg-red-600):not(.bg-red-700)]:hover:bg-[color:var(--yellow)] [&_button.inline-flex:not(.bg-red-600):not(.bg-red-700)]:hover:text-[color:var(--ink)] [&_button.inline-flex:not(.bg-red-600):not(.bg-red-700)]:hover:brightness-95",
            )}
          >
            {children}
          </div>

          <p className="pt-6 text-xs opacity-50 md:hidden">{schoolName ?? ""}</p>
        </main>
      </div>
    </div>
  );
}

/**
 * Teacher "Teach → Strength Portfolio".
 *
 * Classroom presentation view of the student Strength Portfolio. It reuses the
 * exact same screen renderer as the student route, but in read-only mode so a
 * teacher can guide students from a projector / classroom display.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CornerBlobs } from "@/components/CornerBlobs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PortfolioScreen, hasPortfolioScreen } from "@/components/PortfolioScreen";
import { ArrowLeftIcon, WorldIcon } from "@/components/icons/AppIcons";
import { useRoleGuard } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";
import { WORLDS, TOTAL_SCREENS, worldForScreen, type WorldId } from "@/lib/screens";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/teach/portfolio")({
  head: () => ({
    meta: [
      { title: "Strength Portfolio presentation — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Browse any of the 106 strength portfolio screens exactly as students see them.",
      },
      { property: "og:title", content: "Strength Portfolio presentation — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Read-only classroom view of all 106 portfolio screens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachPortfolioPage,
});

function TeachPortfolioPage() {
  const tr = useTr();
  const guard = useRoleGuard(["teacher"]);
  const [screen, setScreen] = useState<number>(1);

  const screens = useMemo(
    () => Array.from({ length: TOTAL_SCREENS }, (_, i) => i + 1).filter(hasPortfolioScreen),
    [],
  );

  if (!guard.ready) return null;

  const current = screens.includes(screen) ? screen : (screens[0] ?? 1);
  const pos = screens.indexOf(current);
  const world = worldForScreen(current);

  function goToLevel(id: WorldId) {
    const targetWorld = WORLDS.find((item) => item.id === id);
    if (!targetWorld) return;
    const first = screens.find((n) => n >= targetWorld.start && n <= targetWorld.end);
    if (first) setScreen(first);
  }

  function previousScreen() {
    if (pos <= 0) return;
    setScreen(screens[pos - 1]);
  }

  function nextScreen() {
    if (pos < 0 || pos >= screens.length - 1) return;
    setScreen(screens[pos + 1]);
  }

  return (
    <div className="relative h-screen min-h-[720px] overflow-hidden bg-[color:var(--purple)] text-white">
      <CornerBlobs />

      <div className="relative z-10 flex h-full min-w-0 flex-col px-5 pb-5 pt-4 xl:px-6 xl:pb-6">
        <header className="grid h-12 shrink-0 grid-cols-[280px_minmax(0,1fr)_auto] items-center gap-5 xl:grid-cols-[300px_minmax(0,1fr)_auto]">
          <Link
            to="/teacher/dashboard"
            className="inline-flex w-max items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 font-display text-sm font-bold text-[color:var(--purple)] shadow-md transition-transform hover:-translate-y-0.5"
          >
            <ArrowLeftIcon size={17} />
            {tr("Takaisin")}
          </Link>

          <h1 className="truncate font-display text-[clamp(20px,1.8vw,30px)] font-semibold text-white">
            {tr("Vahvuusportfolio")}
          </h1>

          <div className="flex items-center justify-end gap-3 xl:gap-4">
            <div className="hidden lg:block [&_button]:text-white/70 [&_button:hover]:text-white [&_span]:text-white/35">
              <LanguageSwitcher persistToProfile />
            </div>

            <span className="whitespace-nowrap font-mono text-sm font-semibold tracking-wide text-white/90">
              {tr("Näyttö")} {current} / {TOTAL_SCREENS}
            </span>

            <button
              type="button"
              disabled={pos <= 0}
              onClick={previousScreen}
              className="rounded-full bg-white px-5 py-2.5 font-display text-sm font-bold text-[color:var(--purple)] shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {tr("Edellinen")}
            </button>

            <button
              type="button"
              disabled={pos >= screens.length - 1}
              onClick={nextScreen}
              className="rounded-full bg-[color:var(--yellow)] px-5 py-2.5 font-display text-sm font-bold text-[color:var(--ink)] shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {tr("Seuraava")}
            </button>
          </div>
        </header>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-6">
          <aside className="min-h-0 overflow-hidden rounded-[2rem] bg-[#4f378d]/90 shadow-[0_16px_36px_rgba(34,20,70,0.22)] ring-1 ring-white/5 backdrop-blur-sm">
            <nav className="h-full overflow-y-auto px-3 py-3.5 [scrollbar-width:thin]">
              <div className="space-y-1.5">
                {WORLDS.map((item) => {
                  const active = item.id === world.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToLevel(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex w-full items-start gap-3 rounded-[1.4rem] px-4 py-2.5 text-left transition-all",
                        active
                          ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-[color:var(--yellow)]"
                          : "text-white/95 hover:bg-white/8",
                      )}
                    >
                      <WorldIcon id={item.id} size={18} className="mt-0.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-display text-[15px] font-bold leading-tight">
                          {tr(item.title)}
                        </span>
                        <span className="mt-0.5 block break-words text-[12px] font-medium leading-snug text-white/80">
                          {tr(item.subtitle)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          <main className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden rounded-[2rem] [scrollbar-gutter:stable]">
            <PortfolioScreen key={current} n={current} mode="teacher-preview" />
          </main>
        </div>
      </div>
    </div>
  );
}

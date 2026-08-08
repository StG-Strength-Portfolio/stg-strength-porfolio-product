/**
 * @lovable-new 2026-08-05 — Teacher "Strength Portfolio" final layout.
 *
 * Per the latest spec this page has NO language selector, NO fullscreen mode,
 * NO double-click fullscreen, NO title next to Back and NO bottom navigation.
 * Previous / Next live only in the top bar; the preview always follows the
 * teacher's current application language.
 *
 * The screen itself is rendered by the SHARED PortfolioScreenRenderer in
 * "teacher-preview" mode, so student visual changes appear here automatically
 * while reads and writes stay disabled.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { PortfolioScreenRenderer } from "@/components/portfolio/PortfolioScreenRenderer";
import { WorldIcon, ArrowLeftIcon } from "@/components/icons/AppIcons";
import { useRoleGuard } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";
import { WORLDS, worldForScreen, type WorldId } from "@/lib/screens";
import { ACTIVE_SCREENS, TOTAL_ACTIVE_SCREENS } from "@/lib/screen-registry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/teach/portfolio")({
  head: () => ({
    meta: [
      { title: "Strength Portfolio presentation — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Browse every strength portfolio screen exactly as students see them.",
      },
      { property: "og:title", content: "Strength Portfolio presentation — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Read-only classroom view of the whole strength portfolio.",
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
  const [screen, setScreen] = useState<number>(ACTIVE_SCREENS[0] ?? 1);

  const screens = ACTIVE_SCREENS;
  const pos = Math.max(0, screens.indexOf(screen));
  const current = screens[pos] ?? screens[0] ?? 1;
  const world = worldForScreen(current);

  const goPrev = useCallback(() => {
    setScreen((s) => {
      const i = screens.indexOf(s);
      return screens[Math.max(0, i - 1)] ?? s;
    });
  }, [screens]);
  const goNext = useCallback(() => {
    setScreen((s) => {
      const i = screens.indexOf(s);
      return screens[Math.min(screens.length - 1, i + 1)] ?? s;
    });
  }, [screens]);

  function goToLevel(id: WorldId) {
    const w = WORLDS.find((x) => x.id === id);
    if (!w) return;
    const first = screens.find((n) => n >= w.start && n <= w.end);
    if (first) setScreen(first);
  }

  if (!guard.ready) return null;

  return (
    <div className="journey-bg min-h-screen">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-3 lg:px-5">
        {/* @lovable-new 2026-08-05 — Top bar: only Back on the left; counter and
            Previous/Next on the right. No title, no language selector, no
            Full screen button. */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link
            to="/teacher/dashboard"
            aria-label={tr("Takaisin")}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-[color:var(--purple)] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yellow)]"
          >
            <ArrowLeftIcon size={16} />
            {tr("Takaisin")}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-white/85">
              {tr("Näyttö")} {current} / {TOTAL_ACTIVE_SCREENS}
            </span>
            <button
              type="button"
              onClick={goPrev}
              disabled={pos <= 0}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[color:var(--purple)] shadow disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yellow)]"
            >
              {tr("Edellinen")}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={pos >= screens.length - 1}
              className="rounded-full bg-[color:var(--yellow)] px-4 py-2 text-sm font-bold text-[color:var(--purple)] shadow disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {tr("Seuraava")}
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <LevelNavigator activeId={world.id} onSelect={goToLevel} tr={tr} />

          <div className="min-w-0">
            <PortfolioScreenRenderer screenNumber={current} mode="teacher-preview" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact level navigator — no progress bars, no percentages, no 0% text. */
function LevelNavigator({
  activeId,
  onSelect,
  tr,
}: {
  activeId: WorldId;
  onSelect: (id: WorldId) => void;
  tr: (s: string) => string;
}) {
  return (
    <nav className="h-max max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-[color:var(--purple)] p-2 text-white shadow-lg">
      {WORLDS.map((w) => {
        const active = w.id === activeId;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelect(w.id)}
            className={cn(
              "mb-1 flex w-full items-start gap-2 rounded-xl border-l-4 px-2.5 py-1.5 text-left transition-colors",
              active
                ? "border-[color:var(--yellow)] bg-white/15"
                : "border-transparent hover:bg-white/10",
            )}
          >
            <WorldIcon id={w.id} size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block break-words text-sm leading-tight",
                  active ? "font-bold" : "font-semibold",
                )}
              >
                {tr(w.title)}
              </span>
              <span className="block break-words text-[0.7rem] leading-tight opacity-80">
                {tr(w.subtitle)}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

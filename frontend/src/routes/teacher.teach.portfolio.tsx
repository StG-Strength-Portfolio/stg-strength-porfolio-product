/**
 * @lovable-new 2026-08-05
 * Teacher "Teach → Strength Portfolio".
 *
 * Renders the adventure exactly as students see it — one screen at a time,
 * same components and styling — but fully read-only: inputs disabled, nothing
 * autosaves, and no "Present to class" button. A level navigator on the left
 * jumps to the first screen of each level.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Component, useMemo, useState, type ReactNode } from "react";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { PencilBadge } from "@/components/PencilBadge";
import { WorldIcon } from "@/components/icons/AppIcons";
import { useRoleGuard } from "@/lib/role-guard";
import { TranslateFi, useTr } from "@/lib/i18n";
import { WORLDS, TOTAL_SCREENS, worldForScreen, type WorldId } from "@/lib/screens";
import { ScreenContent, hasContent } from "@/lib/screen-content";
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

/** Keeps a single misbehaving screen from taking down the whole page. */
class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[teach-portfolio] screen render failed", error);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/**
 * Renders one adventure screen with every control inert.
 *
 * `ScreenContent` dispatches to screen implementations that use different
 * hook sets. The keyed child is intentional: each screen number must mount as
 * a fresh React subtree so navigating between screens cannot reuse the hook
 * state from the previously rendered screen.
 */
function ReadOnlyScreen({ n }: { n: number }) {
  if (!hasContent(n)) return null;
  return (
    <ScreenBoundary key={n}>
      <div
        aria-disabled
        className="pointer-events-none select-none opacity-95 [&_button]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none"
      >
        <TranslateFi>
          <ScreenContent key={n} n={n} />
        </TranslateFi>
      </div>
    </ScreenBoundary>
  );
}

function TeachPortfolioPage() {
  const tr = useTr();
  const guard = useRoleGuard(["teacher"]);
  const [screen, setScreen] = useState<number>(1);

  /** Every screen that actually has content, in order. */
  const screens = useMemo(
    () => Array.from({ length: TOTAL_SCREENS }, (_, i) => i + 1).filter((n) => hasContent(n)),
    [],
  );

  if (!guard.ready) return null;

  const current = screens.includes(screen) ? screen : (screens[0] ?? 1);
  const pos = screens.indexOf(current);
  const world = worldForScreen(current);

  function goToLevel(id: WorldId) {
    const w = WORLDS.find((x) => x.id === id);
    if (!w) return;
    const first = screens.find((n) => n >= w.start && n <= w.end);
    if (first) setScreen(first);
  }

  return (
    <DashboardShell
      title={tr("Vahvuusportfolio")}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[
        { to: "/teacher/dashboard", label: tr("Takaisin") },
        { to: "/teacher/teach/materials", label: tr("Opetusmateriaalit") },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Level sub-navigator */}
        <nav className="h-max space-y-2 rounded-3xl bg-[color:var(--purple)] p-3 text-white shadow-lg">
          {WORLDS.map((w) => {
            const active = w.id === world.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => goToLevel(w.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-2xl px-3 py-2 text-left transition-colors",
                  active ? "bg-white text-[color:var(--purple)]" : "hover:bg-white/10",
                )}
              >
                <WorldIcon id={w.id} size={18} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-bold leading-snug">
                    {tr(w.title)}
                  </span>
                  <span className="block break-words text-xs leading-snug opacity-80">
                    {tr(w.subtitle)}
                  </span>
                  <LevelProgressBar pct={0} className="mt-1" />
                </span>
              </button>
            );
          })}
        </nav>

        {/* One screen at a time — 1:1 with the student view */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PencilBadge icon={<WorldIcon id={world.id} size={14} />}>
                {tr(world.title)}
              </PencilBadge>
              <span className="text-sm opacity-80">{tr(world.subtitle)}</span>
            </div>
            <span className="font-mono text-xs opacity-80">
              {tr("Näyttö")} {current} / {TOTAL_SCREENS}
            </span>
          </div>

          <StickyNote seed={`teach-screen-${current}`} className="space-y-3">
            <ReadOnlyScreen key={current} n={current} />
          </StickyNote>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={pos <= 0}
              onClick={() => setScreen(screens[Math.max(0, pos - 1)])}
              className="rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-slate-900 shadow disabled:opacity-40"
            >
              {tr("Edellinen")}
            </button>
            <button
              type="button"
              disabled={pos >= screens.length - 1}
              onClick={() => setScreen(screens[Math.min(screens.length - 1, pos + 1)])}
              className="rounded-full bg-[color:var(--purple)] px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-40"
            >
              {tr("Seuraava")}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

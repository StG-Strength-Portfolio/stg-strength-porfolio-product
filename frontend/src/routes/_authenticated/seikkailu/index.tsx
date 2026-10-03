import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WORLDS, TOTAL_SCREENS, worldForScreen } from "@/lib/screens";
import { WorldBadge } from "@/components/WorldBadge";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { useLanguage, useT, useTr } from "@/lib/i18n";
// @lovable-new 2026-08-08 — level locking comes from the shared progression rules
import { useProgression } from "@/lib/progression";

export const Route = createFileRoute("/_authenticated/seikkailu/")({
  component: WorldMap,
});

function WorldMap() {
  const navigate = useNavigate();
  const t = useT();
  const tr = useTr();
  const { language } = useLanguage();
  const progression = useProgression();

  const current = progression.nextAvailable;
  const currentWorld = worldForScreen(current);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">
            {language === "fi" ? "Lukiolaisen vahvuusportfolio" : t("worldmap.title")}
          </h1>
          <p className="opacity-85 mt-1">{t("worldmap.subtitle")}</p>
        </div>
        <StickyNote tone="yellow" className="!p-3 !px-4 max-w-xs">
          <div className="text-xs font-semibold uppercase tracking-wide">
            {t("worldmap.resumeHeader")}
          </div>
          <div className="font-display text-lg leading-tight">
            {t("worldmap.resumeAt", { world: tr(currentWorld.title), n: current })}
          </div>
          <Button
            className="mt-2 rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white"
            onClick={() =>
              navigate({ to: "/seikkailu/$screen", params: { screen: String(current) } })
            }
          >
            {t("common.continue")} →
          </Button>
        </StickyNote>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORLDS.map((w) => {
          const wp = progression.byWorld?.[w.id] ?? { completed: 0, total: 0 };
          const locked = !progression.canAccessLevel(w);
          const ratio = wp.total > 0 ? wp.completed / wp.total : 0;
          return (
            <WorldBadge
              key={w.id}
              world={w}
              locked={locked}
              progress={ratio}
              onClick={() =>
                navigate({
                  to: "/seikkailu/$screen",
                  params: { screen: String(progression.resumeScreenForLevel(w)) },
                })
              }
            />
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs opacity-70">
        {TOTAL_SCREENS} {t("app.screensSuffix")} • {language === "fi" ? "Vahvuusportfolio" : t("app.title")}
      </p>
    </div>
  );
}
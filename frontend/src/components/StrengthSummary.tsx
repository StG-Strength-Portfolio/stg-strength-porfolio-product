/**
 * @lovable-new 2026-08-05
 * Compact strength-collection summary shown under "My Strengths" in the
 * student sidebar: a gold growth bar plus the top 5 strengths with counts.
 */
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { useStrengthCounts } from "@/hooks/useStrengthCounts";
import { useLanguage, useTr } from "@/lib/i18n";
import { getStrengthName } from "@/lib/strengths-i18n";

/** Reasonable "full jar" reference so the bar stays meaningful early on. */
const MAX_EXPECTED = 50;

export function SidebarStrengthSummary() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const { top5, total, loading } = useStrengthCounts();

  if (loading) return null;

  const pct = Math.min(100, Math.round((total / MAX_EXPECTED) * 100));

  return (
    <div className="space-y-1 px-3 pb-2 pt-1 group-data-[collapsible=icon]:hidden">
      <LevelProgressBar pct={pct} showPercent={false} />
      <p className="text-right text-[10px] leading-none opacity-80">
        {total} {tr("kerätty")}
      </p>
      {top5.length === 0 ? (
        <p className="text-[11px] font-normal opacity-80">{tr("Ei vielä vahvuuksia")}</p>
      ) : (
        <ul className="space-y-0.5">
          {top5.map((s) => (
            <li key={s.id} className="text-[11px] font-normal leading-snug">
              {getStrengthName(s.id, lang)} ×{s.count}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * @lovable-new 2026-08-05 — Extracted the Strength Collection Growth chart out of
 * ReportTrends so the teacher, school-admin and student views share one visual
 * and one calculation path. Role-appropriate events are passed in by the caller.
 */
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StickyNote } from "@/components/StickyNote";
import { useTr } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { buildStrengthSeries, type RangeDays, type ReportEvent } from "@/lib/report-series";

const axisProps = { stroke: "currentColor", fontSize: 11, tickLine: false } as const;

const STUDENT_RANGES: { days: RangeDays; label: string }[] = [
  { days: 30, label: "30 päivää" },
  { days: 90, label: "90 päivää" },
  { days: 365, label: "1 vuosi" },
];

export interface StrengthGrowthChartProps {
  events: ReportEvent[];
  lang: "fi" | "en" | "sv";
  selectedRange?: RangeDays;
  onRangeChange?: (d: RangeDays) => void;
  showRangeControls?: boolean;
  showShowAllButton?: boolean;
  visibleStrengthMode?: "all" | "top10";
  emptyLabel?: string;
  seed?: string;
  printMode?: boolean;
  loading?: boolean;
}

export function StrengthGrowthChart({
  events,
  lang,
  selectedRange,
  onRangeChange,
  showRangeControls = false,
  showShowAllButton = false,
  visibleStrengthMode = "top10",
  emptyLabel,
  seed = "strength-growth",
  printMode = false,
  loading = false,
}: StrengthGrowthChartProps) {
  const tr = useTr();
  const [innerRange, setInnerRange] = useState<RangeDays>(selectedRange ?? 30);
  const days = selectedRange ?? innerRange;
  const setDays = (d: RangeDays) => {
    setInnerRange(d);
    onRangeChange?.(d);
  };

  const [showAll, setShowAll] = useState(visibleStrengthMode === "all");
  const limit = visibleStrengthMode === "all" || showAll ? undefined : 10;
  const locale = lang === "sv" ? "sv-SE" : lang === "en" ? "en-US" : "fi-FI";
  const { rows, legend } = useMemo(
    () => buildStrengthSeries(events, { days, limit, locale }),
    [events, days, limit, locale],
  );

  return (
    <StickyNote seed={seed} className="report-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-bold">{tr("Vahvuuksien keräämisen kasvu")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {showRangeControls && (
            <div className="no-print flex flex-wrap gap-1.5">
              {STUDENT_RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setDays(r.days)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    days === r.days
                      ? "bg-[color:var(--purple)] text-white"
                      : "bg-black/10 hover:bg-black/20"
                  }`}
                >
                  {tr(r.label)}
                </button>
              ))}
            </div>
          )}
          {showShowAllButton && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="no-print rounded-full bg-black/10 px-3 py-1 text-xs font-bold hover:bg-black/20"
            >
              {showAll ? tr("Näytä top 10") : tr("Näytä kaikki")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="opacity-70">{tr("Ladataan…")}</p>
      ) : legend.length === 0 ? (
        <p className="opacity-70">{emptyLabel ?? tr("Ei dataa tällä aikavälillä.")}</p>
      ) : (
        <>
          <div className="chart-box h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<StrengthTooltip legend={legend} lang={lang} />} />
                {legend.map((l) => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    name={getStrengthName(l.id, lang)}
                    stroke={getStrengthColor(l.id)}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={!printMode}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {legend.map((l) => (
              <li key={l.key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: getStrengthColor(l.id) }}
                  aria-hidden
                />
                <span className="font-medium break-words">{getStrengthName(l.id, lang)}</span>
                <span className="tabular-nums opacity-70">— {l.total}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </StickyNote>
  );
}

function StrengthTooltip({
  active,
  payload,
  label,
  legend,
  lang,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string | number }>;
  label?: string | number;
  legend: { key: string; id: number }[];
  lang: "fi" | "en" | "sv";
}) {
  const tr = useTr();
  if (!active || !payload?.length) return null;
  const rows = payload
    .map((p) => ({
      id: legend.find((l) => l.key === String(p.dataKey))?.id,
      value: Number(p.value ?? 0),
    }))
    .filter((r) => r.id != null && r.value > 0);
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <div className="rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-lg">
      <p className="mb-1 font-bold">{String(label ?? "")}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: getStrengthColor(r.id as number) }}
              aria-hidden
            />
            <span>{getStrengthName(r.id as number, lang)}:</span>
            <span className="tabular-nums font-semibold">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 border-t border-black/10 pt-1 font-bold">
        {tr("Yhteensä")}: <span className="tabular-nums">{total}</span>
      </p>
    </div>
  );
}

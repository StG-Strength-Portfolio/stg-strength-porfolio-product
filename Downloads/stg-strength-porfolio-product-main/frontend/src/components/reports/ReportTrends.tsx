import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StickyNote } from "@/components/StickyNote";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { useLanguage, useTr } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { buildLevelCompletion } from "@/lib/report-levels";
import {
  buildReportSeries,
  buildStrengthSeries,
  type RangeDays,
  type ReportEvent,
} from "@/lib/report-series";

const RANGES: { days: RangeDays; label: string }[] = [
  { days: 7, label: "7 päivää" },
  { days: 30, label: "30 päivää" },
  { days: 90, label: "90 päivää" },
  { days: 365, label: "1 vuosi" },
];

export function RangeSelector({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (d: RangeDays) => void;
}) {
  const tr = useTr();
  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((r) => (
        <button
          key={r.days}
          type="button"
          onClick={() => onChange(r.days)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            value === r.days
              ? "bg-[color:var(--purple)] text-white"
              : "bg-black/10 hover:bg-black/20"
          }`}
        >
          {tr(r.label)}
        </button>
      ))}
    </div>
  );
}

interface TrendProps {
  events: ReportEvent[];
  days: RangeDays;
  studentCount: number;
  totalRequired: number;
  classes?: { id: string; name: string }[];
  seedPrefix: string;
}

const PURPLE = "var(--purple)";
const CORAL = "var(--coral)";
const YELLOW = "var(--yellow)";

function ChartCard({
  seed,
  title,
  children,
}: {
  seed: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <StickyNote seed={seed} className="space-y-3">
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </StickyNote>
  );
}

const axisProps = { stroke: "currentColor", fontSize: 11, tickLine: false } as const;

export function ReportTrends({
  events,
  days,
  studentCount,
  totalRequired,
  classes,
  seedPrefix,
}: TrendProps) {
  const tr = useTr();
  const series = useMemo(
    () => buildReportSeries(events, { days, studentCount, totalRequired }),
    [events, days, studentCount, totalRequired],
  );

  const perClass = useMemo(() => {
    if (!classes?.length) return [];
    return classes.map((c) => ({
      ...c,
      series: buildReportSeries(events, {
        days,
        studentCount,
        totalRequired,
        classId: c.id,
      }),
    }));
  }, [classes, events, days, studentCount, totalRequired]);

  if (series.length === 0) {
    return <p className="opacity-70">{tr("Ei dataa tällä aikavälillä.")}</p>;
  }

  return (
    <>
      {/* @lovable-new 2026-08-05 every report can be saved as a PDF */}
      <div className="flex justify-end">
        <PrintReportButton />
      </div>

      <StrengthGrowthCard events={events} days={days} seed={`${seedPrefix}-growth`} />

      <LevelCompletionCard
        events={events}
        studentCount={studentCount}
        seed={`${seedPrefix}-levels`}
      />

      <ChartCard seed={`${seedPrefix}-active`} title={tr("Aktiiviset opiskelijat")}>
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip formatter={(v: number) => [v, tr("Aktiiviset opiskelijat")]} />
          <Bar
            dataKey="active"
            fill={YELLOW}
            radius={[6, 6, 0, 0]}
            name={tr("Aktiiviset opiskelijat")}
          />
        </BarChart>
      </ChartCard>

      {perClass.length > 0 && (
        <ChartCard seed={`${seedPrefix}-byclass`} title={tr("Luokkakohtainen kasvu")}>
          <LineChart margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" type="category" allowDuplicatedCategory={false} {...axisProps} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip />
            {perClass.map((c, i) => (
              <Line
                key={c.id}
                data={c.series}
                dataKey="strengths"
                name={c.name}
                stroke={[PURPLE, CORAL, YELLOW][i % 3]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartCard>
      )}
    </>
  );
}

/* ---------- Per-strength cumulative growth ---------- */

function StrengthGrowthCard({
  events,
  days,
  seed,
}: {
  events: ReportEvent[];
  days: RangeDays;
  seed: string;
}) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const [showAll, setShowAll] = useState(false);
  const { rows, legend } = useMemo(
    () => buildStrengthSeries(events, { days, limit: showAll ? undefined : 10 }),
    [events, days, showAll],
  );

  return (
    <StickyNote seed={seed} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-bold">{tr("Vahvuuksien keräämisen kasvu")}</h3>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold hover:bg-black/20"
        >
          {showAll ? tr("Näytä top 10") : tr("Näytä kaikki")}
        </button>
      </div>
      {legend.length === 0 ? (
        <p className="opacity-70">{tr("Ei dataa tällä aikavälillä.")}</p>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                {/* @lovable-new 2026-08-05 — strength names + a total row. */}
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
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {legend.map((l) => (
              <li key={l.key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: getStrengthColor(l.id) }}
                  aria-hidden
                />
                <span className="font-medium">{getStrengthName(l.id, lang)}</span>
                <span className="tabular-nums opacity-70">— {l.total}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </StickyNote>
  );
}

/**
 * @lovable-new 2026-08-05
 * Tooltip that resolves each series back to its strength name and adds a
 * translated total row at the bottom.
 */
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

/* ---------- Per-level completion breakdown ---------- */

function LevelCompletionCard({
  events,
  studentCount,
  seed,
}: {
  events: ReportEvent[];
  studentCount: number;
  seed: string;
}) {
  const tr = useTr();
  const levels = useMemo(
    () => buildLevelCompletion(events, { studentCount }),
    [events, studentCount],
  );

  return (
    <StickyNote seed={seed} className="space-y-3">
      <h3 className="text-xl font-bold">{tr("Valmistumisen edistyminen")}</h3>
      <ul className="space-y-2">
        {levels.map((l, i) => (
          <li key={l.id} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 font-medium">{tr(l.title)}</span>
            <LevelProgressBar pct={l.pct} className="w-28 shrink-0" />
          </li>
        ))}
      </ul>
    </StickyNote>
  );
}

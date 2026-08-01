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
      <StrengthGrowthCard events={events} days={days} seed={`${seedPrefix}-growth`} />

      <LevelCompletionCard events={events} studentCount={studentCount} seed={`${seedPrefix}-levels`} />


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
                <Tooltip
                  formatter={(v: number, key: string) => [
                    v,
                    getStrengthName(Number(String(key).slice(1)), lang),
                  ]}
                />
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
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-black/10">
              <span
                className="block h-full rounded-full transition-all"
                style={{
                  width: `${l.pct}%`,
                  background: [PURPLE, CORAL, YELLOW][i % 3],
                }}
              />
            </span>
            <span className="w-12 shrink-0 text-right tabular-nums">{l.pct} %</span>
          </li>
        ))}
      </ul>
    </StickyNote>
  );
}

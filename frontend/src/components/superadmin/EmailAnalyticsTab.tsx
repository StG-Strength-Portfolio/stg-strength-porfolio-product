import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StickyNote } from "@/components/StickyNote";
import { useTr } from "@/lib/i18n";
import { getEmailLog, type EmailAnalytics, type EmailLogRow } from "@/lib/email-templates.functions";

const RANGES = [7, 30, 90] as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-3 py-2 text-slate-900">
      <div className="text-[0.7rem] uppercase tracking-wider opacity-60">{label}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  );
}

export function EmailAnalyticsTab() {
  const tr = useTr();
  const fetchLog = useServerFn(getEmailLog);
  const [days, setDays] = useState<number>(30);
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [stats, setStats] = useState<EmailAnalytics | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchLog({ data: { days } });
      setRows(res.rows);
      setStats(res.analytics);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchLog, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <StickyNote seed="sa-email-analytics" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">{tr("Sähköpostien analytiikka")}</h2>
        <div className="flex gap-2">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                days === d ? "bg-[color:var(--purple)] text-white" : "bg-black/10"
              }`}
            >
              {d} {tr("päivää")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={tr("Lähetetyt yhteensä")} value={String(stats?.total ?? 0)} />
        <Stat label={tr("Onnistuneet")} value={String(stats?.sent ?? 0)} />
        <Stat label={tr("Avausprosentti")} value={`${stats?.openRate ?? 0}%`} />
        <Stat label={tr("Palautusprosentti")} value={`${stats?.bounceRate ?? 0}%`} />
        <Stat label={tr("Epäonnistuneet")} value={String(stats?.failed ?? 0)} />
      </div>

      {stats && stats.byTemplate.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byTemplate.map((t) => (
            <span
              key={t.template_key}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-900 shadow-sm"
            >
              {t.template_key} ×{t.count}
            </span>
          ))}
        </div>
      )}

      <h3 className="font-display text-lg">{tr("Lähetysloki")}</h3>
      {rows.length === 0 ? (
        <p className="text-sm opacity-70">{tr("Ei lähetettyjä viestejä tällä aikavälillä.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white/70">
          <table className="w-full text-left text-sm text-slate-900">
            <thead className="text-xs uppercase tracking-wider opacity-60">
              <tr>
                <th className="px-3 py-2">{tr("Malli")}</th>
                <th className="px-3 py-2">{tr("Vastaanottaja")}</th>
                <th className="px-3 py-2">{tr("Tila")}</th>
                <th className="px-3 py-2">{tr("Aika")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-black/5">
                  <td className="px-3 py-2">{r.template_key}</td>
                  <td className="px-3 py-2">{r.recipient_email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        r.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.status === "bounced"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StickyNote>
  );
}

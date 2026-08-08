/**
 * @lovable-new 2026-08-04
 * Teacher "Profile" — merges the old "My received strengths" feed and the
 * "Settings" tab into a single page reachable from the sidebar person icon.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileSettings } from "@/components/ProfileSettings";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage, useTr } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import {
  getTeacherReceivedStrengths,
  type ReceivedStrength,
} from "@/lib/give-strength.functions";

export const Route = createFileRoute("/teacher/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "Your teacher profile: account settings and the character strengths students and your principal gave you.",
      },
      { property: "og:title", content: "My Profile — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Account settings and the strengths you have received.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherProfilePage,
});

function Feed({
  title,
  rows,
  lang,
  empty,
}: {
  title: string;
  rows: ReceivedStrength[];
  lang: "fi" | "sv" | "en";
  empty: string;
}) {
  return (
    <StickyNote seed={`feed-${title}`} className="space-y-3">
      <h3 className="text-xl font-bold">{title}</h3>
      {rows.length === 0 && <p className="text-sm opacity-70">{empty}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3">
            <span
              className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
              style={{ background: getStrengthColor(r.strengthId) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                {getStrengthName(r.strengthId, lang)}
              </span>
              <span className="block text-xs opacity-70">{r.fromName}</span>
              {r.message && <span className="mt-1 block break-words text-sm">{r.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </StickyNote>
  );
}

function TeacherProfilePage() {
  const tr = useTr();
  const guard = useRoleGuard(["teacher"]);
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const load = useServerFn(getTeacherReceivedStrengths);
  const [rows, setRows] = useState<ReceivedStrength[]>([]);

  const refresh = useCallback(async () => {
    try {
      setRows(await load());
    } catch (e) {
      console.error("[teacher-profile]", e);
    }
  }, [load]);

  useEffect(() => {
    if (guard.ready) void refresh();
  }, [guard.ready, refresh]);

  const top5 = useMemo(() => {
    const count = new Map<number, number>();
    for (const r of rows) count.set(r.strengthId, (count.get(r.strengthId) ?? 0) + 1);
    return [...count.entries()]
      .map(([id, c]) => ({ id, count: c }))
      .sort((a, b) => b.count - a.count || a.id - b.id)
      .slice(0, 5);
  }, [rows]);

  if (!guard.ready) return null;

  const fromStudents = rows.filter((r) => r.fromRole === "student");
  const fromPrincipal = rows.filter((r) => r.fromRole === "school_admin");

  return (
    <DashboardShell
      title={tr("Profiili")}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[{ to: "/teacher/dashboard", label: tr("Takaisin") }]}
    >
      <ProfileSettings
        schoolName={guard.schoolName}
        displayName={guard.displayName}
        email={guard.email}
      />

      <StickyNote seed="profile-top5" className="space-y-3">
        <h3 className="text-xl font-bold">{tr("Saamani Top 5 vahvuudet")}</h3>
        {top5.length === 0 ? (
          <p className="text-sm opacity-70">{tr("Et ole vielä saanut vahvuuksia.")}</p>
        ) : (
          <TopStrengthCards items={top5} lang={lang} />
        )}
      </StickyNote>


      <Feed
        title={tr("Oppilailta saadut")}
        rows={fromStudents}
        lang={lang}
        empty={tr("Ei vielä vahvuuksia.")}
      />
      <Feed
        title={tr("Rehtorilta saadut")}
        rows={fromPrincipal}
        lang={lang}
        empty={tr("Ei vielä vahvuuksia.")}
      />
    </DashboardShell>
  );
}

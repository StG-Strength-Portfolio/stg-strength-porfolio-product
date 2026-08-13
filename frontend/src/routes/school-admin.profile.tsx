import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileSettings } from "@/components/ProfileSettings";
import { StickyNote } from "@/components/StickyNote";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { getMyReceivedStrengths, type ReceivedStrength } from "@/lib/give-strength.functions";
import { getDemoReceivedStrengths } from "@/lib/demo-community";
import { onDemoStateChange } from "@/lib/demo-store";

export const Route = createFileRoute("/school-admin/profile")({ component: SchoolAdminProfilePage });

const COPY = {
  fi: {
    profile: "Profiili",
    back: "Takaisin",
    give: "Anna vahvuus",
    sprint: "Vahvuussprintti",
    top5: "Saamani Top 5 vahvuudet",
    students: "Oppilailta saadut",
    teachers: "Opettajilta saadut",
    admins: "Muilta koulun admineilta saadut",
    empty: "Ei vielä vahvuuksia.",
    noStrengths: "Et ole vielä saanut vahvuuksia.",
    sprintLabel: "Vahvuussprintistä",
  },
  en: {
    profile: "Profile",
    back: "Back",
    give: "Give a strength",
    sprint: "Strength Sprint",
    top5: "My Top 5 Received Strengths",
    students: "From students",
    teachers: "From teachers",
    admins: "From other school admins",
    empty: "No strengths yet.",
    noStrengths: "You have not received strengths yet.",
    sprintLabel: "From Strength Sprint",
  },
  sv: {
    profile: "Profil",
    back: "Tillbaka",
    give: "Ge en styrka",
    sprint: "Styrkesprint",
    top5: "Mina 5 främsta mottagna styrkor",
    students: "Från elever",
    teachers: "Från lärare",
    admins: "Från andra skoladministratörer",
    empty: "Inga styrkor ännu.",
    noStrengths: "Du har inte fått några styrkor ännu.",
    sprintLabel: "Från Styrkesprint",
  },
} as const;

function Feed({ title, rows, lang, empty, sprintLabel }: {
  title: string;
  rows: ReceivedStrength[];
  lang: "fi" | "sv" | "en";
  empty: string;
  sprintLabel: string;
}) {
  return (
    <StickyNote seed={`admin-feed-${title}`} className="space-y-3">
      <h3 className="text-xl font-bold">{title}</h3>
      {rows.length === 0 && <p className="text-sm opacity-70">{empty}</p>}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3">
            <span
              className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
              style={{ background: getStrengthColor(row.strengthId) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{getStrengthName(row.strengthId, lang)}</span>
              <span className="block text-xs opacity-70">
                {row.fromName}{row.sprintId ? ` · ${sprintLabel}` : ""}
              </span>
              {row.message && <span className="mt-1 block break-words text-sm">{row.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </StickyNote>
  );
}

function SchoolAdminProfilePage() {
  const guard = useRoleGuard(["school_admin"]);
  const { language } = useLanguage();
  const text = COPY[language];
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const load = useServerFn(getMyReceivedStrengths);
  const [rows, setRows] = useState<ReceivedStrength[]>([]);

  const refresh = useCallback(async () => {
    try {
      if (guard.preview && guard.userId) {
        setRows(getDemoReceivedStrengths(guard.userId, language));
      } else {
        setRows(await load());
      }
    } catch (error) {
      console.error("[school-admin-profile]", error);
    }
  }, [guard.preview, guard.userId, language, load]);

  useEffect(() => {
    if (guard.ready) void refresh();
    if (!guard.preview) return;
    return onDemoStateChange(() => void refresh());
  }, [guard.preview, guard.ready, refresh]);

  const top5 = useMemo(() => {
    const count = new Map<number, number>();
    for (const row of rows) count.set(row.strengthId, (count.get(row.strengthId) ?? 0) + 1);
    return [...count.entries()]
      .map(([id, value]) => ({ id, count: value }))
      .sort((a, b) => b.count - a.count || a.id - b.id)
      .slice(0, 5);
  }, [rows]);

  if (!guard.ready) return null;

  const groups = {
    students: rows.filter((row) => row.fromRole === "student"),
    teachers: rows.filter((row) => row.fromRole === "teacher"),
    admins: rows.filter((row) => row.fromRole === "school_admin"),
  };

  return (
    <DashboardShell
      title={text.profile}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[
        { to: "/school-admin/dashboard", label: text.back },
        { to: "/school-admin/give-strength", label: text.give },
        { to: "/school-admin/sprint", label: text.sprint },
      ]}
    >
      <div className="space-y-6">
        <ProfileSettings
          schoolName={guard.schoolName}
          displayName={guard.displayName}
          email={guard.email}
        />

        <StickyNote seed="school-admin-profile-top5" className="space-y-3">
          <h3 className="text-xl font-bold">{text.top5}</h3>
          {top5.length === 0 ? (
            <p className="text-sm opacity-70">{text.noStrengths}</p>
          ) : (
            <TopStrengthCards items={top5} lang={lang} />
          )}
        </StickyNote>

        <Feed title={text.students} rows={groups.students} lang={lang} empty={text.empty} sprintLabel={text.sprintLabel} />
        <Feed title={text.teachers} rows={groups.teachers} lang={lang} empty={text.empty} sprintLabel={text.sprintLabel} />
        <Feed title={text.admins} rows={groups.admins} lang={lang} empty={text.empty} sprintLabel={text.sprintLabel} />
      </div>
    </DashboardShell>
  );
}

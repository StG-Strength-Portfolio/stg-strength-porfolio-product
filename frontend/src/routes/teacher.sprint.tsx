import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { DemoGuestSprintHost } from "@/components/demo/DemoGuestSprintHost";
import { StaffSprintHub } from "@/components/sprint/StaffSprintHub";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/sprint")({ component: TeacherSprintPage });

const COPY = {
  fi: { sprint: "Vahvuussprintti", back: "Takaisin", give: "Anna vahvuus", profile: "Profiili" },
  en: { sprint: "Strength Sprint", back: "Back", give: "Give a strength", profile: "Profile" },
  sv: { sprint: "Styrkesprint", back: "Tillbaka", give: "Ge en styrka", profile: "Profil" },
} as const;

function TeacherSprintPage() {
  const guard = useRoleGuard(["teacher"]);
  const { language } = useLanguage();
  const text = COPY[language];
  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={text.sprint}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      persistLanguage={!guard.preview}
      links={[
        { to: "/teacher/dashboard", label: text.back },
        { to: "/teacher/give-strength", label: text.give },
        { to: "/teacher/profile", label: text.profile },
      ]}
    >
      {guard.preview ? (
        <DemoGuestSprintHost />
      ) : guard.userId ? (
        <StaffSprintHub userId={guard.userId} />
      ) : null}
    </DashboardShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { DemoGuestSprintHost } from "@/components/demo/DemoGuestSprintHost";
import { StaffSprintHub } from "@/components/sprint/StaffSprintHub";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/school-admin/sprint")({ component: SchoolAdminSprintPage });

const COPY = {
  fi: { sprint: "Vahvuussprintti", back: "Takaisin", give: "Anna vahvuus", profile: "Profiili" },
  en: { sprint: "Strength Sprint", back: "Back", give: "Give a strength", profile: "Profile" },
  sv: { sprint: "Styrkesprint", back: "Tillbaka", give: "Ge en styrka", profile: "Profil" },
} as const;

function SchoolAdminSprintPage() {
  const guard = useRoleGuard(["school_admin"]);
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
        { to: "/school-admin/dashboard", label: text.back },
        { to: "/school-admin/give-strength", label: text.give },
        { to: "/school-admin/profile", label: text.profile },
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

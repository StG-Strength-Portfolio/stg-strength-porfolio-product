import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { SchoolGiftPanel } from "@/components/strengths/SchoolGiftPanel";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/school-admin/give-strength")({
  component: SchoolAdminGiveStrengthPage,
});

const COPY = {
  fi: {
    title: "Anna vahvuus",
    back: "Takaisin",
    profile: "Profiili",
    sprint: "Vahvuussprintti",
  },
  en: {
    title: "Give a strength",
    back: "Back",
    profile: "Profile",
    sprint: "Strength Sprint",
  },
  sv: {
    title: "Ge en styrka",
    back: "Tillbaka",
    profile: "Profil",
    sprint: "Styrkesprint",
  },
} as const;

function SchoolAdminGiveStrengthPage() {
  const guard = useRoleGuard(["school_admin"]);
  const { language } = useLanguage();
  const text = COPY[language];
  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={text.title}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[
        { to: "/school-admin/dashboard", label: text.back },
        { to: "/school-admin/sprint", label: text.sprint },
        { to: "/school-admin/profile", label: text.profile },
      ]}
    >
      <SchoolGiftPanel />
    </DashboardShell>
  );
}

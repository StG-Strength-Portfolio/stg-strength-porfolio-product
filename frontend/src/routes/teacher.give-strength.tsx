import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { StickyNote } from "@/components/StickyNote";
import { SchoolGiftPanel } from "@/components/strengths/SchoolGiftPanel";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/give-strength")({
  component: TeacherGiveStrengthPage,
});

const COPY = {
  fi: {
    title: "Anna vahvuus",
    back: "Takaisin",
    profile: "Profiili",
    sprint: "Vahvuussprintti",
    demo: "Demotilassa vahvuuksien lähettäminen oikeille käyttäjille on poistettu käytöstä.",
  },
  en: {
    title: "Give a strength",
    back: "Back",
    profile: "Profile",
    sprint: "Strength Sprint",
    demo: "Sending strengths to real users is disabled in demo mode.",
  },
  sv: {
    title: "Ge en styrka",
    back: "Tillbaka",
    profile: "Profil",
    sprint: "Styrkesprint",
    demo: "Att skicka styrkor till riktiga användare är avstängt i demoläget.",
  },
} as const;

function TeacherGiveStrengthPage() {
  const guard = useRoleGuard(["teacher"]);
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
        { to: "/teacher/dashboard", label: text.back },
        { to: "/teacher/sprint", label: text.sprint },
        { to: "/teacher/profile", label: text.profile },
      ]}
    >
      {guard.preview ? (
        <StickyNote seed="teacher-give-strength-preview">
          <p className="text-sm opacity-75">{text.demo}</p>
        </StickyNote>
      ) : (
        <SchoolGiftPanel />
      )}
    </DashboardShell>
  );
}

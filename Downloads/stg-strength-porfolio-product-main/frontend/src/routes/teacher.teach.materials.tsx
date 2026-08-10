/**
 * @lovable-new 2026-08-04
 * Teacher "Teach → Teaching Materials" — Canva decks published by the super admin.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { MaterialsBrowser } from "@/components/teach/MaterialsBrowser";
import { useRoleGuard } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/teach/materials")({
  head: () => ({
    meta: [
      { title: "Teaching Materials — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Present the Vahvuusseikkailu teaching slide decks to your class in fullscreen.",
      },
      { property: "og:title", content: "Teaching Materials — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Ready-made teaching slide decks you can present to your class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherMaterialsPage,
});

function TeacherMaterialsPage() {
  const tr = useTr();
  const guard = useRoleGuard(["teacher"]);
  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={tr("Opetusmateriaalit")}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[
        { to: "/teacher/dashboard", label: tr("Takaisin") },
        { to: "/teacher/teach/portfolio", label: tr("Vahvuusportfolio") },
      ]}
    >
      <MaterialsBrowser />
    </DashboardShell>
  );
}

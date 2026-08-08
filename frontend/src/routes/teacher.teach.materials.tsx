/**
 * @lovable-new 2026-08-04
 * Teacher "Teach → Teaching Materials" — Google Slides decks published by the super admin.
 * @lovable-new 2026-08-05 — DashboardShell removed: the page now uses the shared
 * full-width TeachingMaterialsLayout so there is no duplicated left sidebar.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MaterialsBrowser } from "@/components/teach/MaterialsBrowser";
import { TeachingMaterialsLayout } from "@/components/teach/TeachingMaterialsLayout";
import { useRoleGuard } from "@/lib/role-guard";

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
  const guard = useRoleGuard(["teacher"]);
  if (!guard.ready) return null;

  return (
    <TeachingMaterialsLayout>
      <MaterialsBrowser rootBackTo="/teacher/dashboard" />
    </TeachingMaterialsLayout>
  );
}

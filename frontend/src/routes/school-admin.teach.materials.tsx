/**
 * @lovable-new 2026-08-04
 * School admin "Teaching Materials" — same library the teachers see.
 * @lovable-new 2026-08-05 — DashboardShell removed: shared full-width layout.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MaterialsBrowser } from "@/components/teach/MaterialsBrowser";
import { TeachingMaterialsLayout } from "@/components/teach/TeachingMaterialsLayout";
import { useRoleGuard } from "@/lib/role-guard";

export const Route = createFileRoute("/school-admin/teach/materials")({
  head: () => ({
    meta: [
      { title: "Teaching Materials — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Browse and present the Vahvuusseikkailu teaching slide decks for your school.",
      },
      { property: "og:title", content: "Teaching Materials — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Teaching slide decks available to every teacher in your school.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolAdminMaterialsPage,
});

function SchoolAdminMaterialsPage() {
  const guard = useRoleGuard(["school_admin"]);
  if (!guard.ready) return null;

  return (
    <TeachingMaterialsLayout>
      <MaterialsBrowser rootBackTo="/school-admin/dashboard" />
    </TeachingMaterialsLayout>
  );
}

/**
 * @lovable-new 2026-08-04
 * School admin "Teaching Materials" — same library the teachers see.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { MaterialsBrowser } from "@/components/teach/MaterialsBrowser";
import { ExternalTeachingContentGate } from "@/components/privacy/ExternalTeachingContentGate";
import { useRoleGuard } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";

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
  const tr = useTr();
  const guard = useRoleGuard(["school_admin"]);
  if (!guard.ready) return null;

  return (
    <DashboardShell
      title={tr("Opetusmateriaalit")}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[
        { to: "/school-admin/dashboard", label: tr("Takaisin") },
        { to: "/school-admin/give-strength", label: tr("Anna vahvuus opettajalle") },
      ]}
    >
      <ExternalTeachingContentGate
        userId={guard.userId}
        schoolId={guard.schoolId}
        privacyRegion={guard.privacyRegion}
        preview={guard.preview}
      >
        <MaterialsBrowser />
      </ExternalTeachingContentGate>
    </DashboardShell>
  );
}

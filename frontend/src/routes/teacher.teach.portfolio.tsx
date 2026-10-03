import { createFileRoute } from "@tanstack/react-router";
import { PortfolioPresentation } from "@/components/portfolio/PortfolioPresentation";
import { useRoleGuard } from "@/lib/role-guard";

export const Route = createFileRoute("/teacher/teach/portfolio")({
  head: () => ({
    meta: [
      { title: "Strength Portfolio presentation — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Browse any of the 106 strength portfolio screens exactly as students see them.",
      },
      { property: "og:title", content: "Strength Portfolio presentation — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Read-only classroom view of all 106 portfolio screens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachPortfolioPage,
});

function TeachPortfolioPage() {
  const guard = useRoleGuard(["teacher"]);
  if (!guard.ready) return null;

  return <PortfolioPresentation backTo="/teacher/dashboard" persistLanguage />;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentRole, getStudentClassMembership, getCurrentScreen } from "@/lib/auth-helpers";
import { homeForRole } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Vahvuusportfolio" },
      { name: "description", content: "Digitaalinen vahvuusportfolio lukiolaiselle." },
    ],
  }),
  component: RootEntry,
});

function RootEntry() {
  const tr = useTr();
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const role = await getCurrentRole();
      if (role && role !== "student") {
        window.location.href = homeForRole(role);
        return;
      }
      const membership = await getStudentClassMembership();
      if (!membership) {
        navigate({ to: "/liity-yhteisoon", replace: true });
        return;
      }
      const screen = await getCurrentScreen();
      navigate({ to: "/seikkailu/$screen", params: { screen: String(screen) }, replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-lg opacity-80">{tr("Ladataan…")}</p>
    </div>
  );
}
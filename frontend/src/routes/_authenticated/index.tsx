import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentRole, getStudentClassMembership, getCurrentScreen } from "@/lib/auth-helpers";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Vahvuusseikkailu" },
      { name: "description", content: "Digitaalinen vahvuusportfolio lukiolaiselle." },
    ],
  }),
  component: RootEntry,
});

function RootEntry() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const role = await getCurrentRole();
      if (role === "teacher") {
        navigate({ to: "/opettaja", replace: true });
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
      <p className="text-lg opacity-80">Ladataan…</p>
    </div>
  );
}
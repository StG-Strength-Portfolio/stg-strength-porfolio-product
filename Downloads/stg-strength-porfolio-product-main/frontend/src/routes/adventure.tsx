import { createFileRoute, redirect } from "@tanstack/react-router";

// Localized alias — English students may see /adventure in a link; we
// redirect to the canonical Finnish path so the app keeps working.
export const Route = createFileRoute("/adventure")({
  beforeLoad: () => {
    throw redirect({ to: "/seikkailu", replace: true });
  },
});

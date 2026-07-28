import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ga-med-i-gemenskapen")({
  beforeLoad: () => {
    throw redirect({ to: "/liity-yhteisoon", replace: true });
  },
});

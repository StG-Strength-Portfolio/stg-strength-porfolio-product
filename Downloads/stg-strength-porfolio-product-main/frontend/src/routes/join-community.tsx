import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/join-community")({
  beforeLoad: () => {
    throw redirect({ to: "/liity-yhteisoon", replace: true });
  },
});

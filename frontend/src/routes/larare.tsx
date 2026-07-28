import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/larare")({
  beforeLoad: () => {
    throw redirect({ to: "/opettaja", replace: true });
  },
});

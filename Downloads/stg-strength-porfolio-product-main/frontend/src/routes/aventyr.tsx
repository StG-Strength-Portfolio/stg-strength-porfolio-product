import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/aventyr")({
  beforeLoad: () => {
    throw redirect({ to: "/seikkailu", replace: true });
  },
});

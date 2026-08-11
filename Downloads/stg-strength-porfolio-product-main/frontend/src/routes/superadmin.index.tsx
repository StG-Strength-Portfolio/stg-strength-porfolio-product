import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/superadmin/")({
  beforeLoad: () => {
    throw redirect({ to: "/superadmin/login" });
  },
});

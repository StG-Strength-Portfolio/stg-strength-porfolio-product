import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/superadmin/demo/principal")({
  beforeLoad: () => {
    throw redirect({ to: "/school-admin/dashboard" });
  },
  component: () => null,
});

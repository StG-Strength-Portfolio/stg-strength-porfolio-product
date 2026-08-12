import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register-school-admin")({
  beforeLoad: () => {
    throw redirect({ to: "/register-staff", replace: true });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register-teacher")({
  beforeLoad: () => {
    throw redirect({ to: "/register-staff", replace: true });
  },
});

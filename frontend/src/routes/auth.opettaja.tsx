import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/opettaja")({
  beforeLoad: () => {
    throw redirect({ to: "/register-staff", replace: true });
  },
});

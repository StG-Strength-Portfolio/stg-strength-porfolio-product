import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ idle: z.enum(["1"]).optional() }).parse,
  component: () => <Outlet />,
});

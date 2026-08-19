import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  validateSearch: z
    .object({
      idle: z.enum(["1"]).optional(),
      sso: z.enum(["miss"]).optional(),
      token_hash: z.string().optional(),
      type: z.enum(["email", "magiclink"]).optional(),
      returnTo: z.enum(["/auth", "/auth/login"]).optional(),
    })
    .passthrough()
    .parse,
  component: () => <Outlet />,
});

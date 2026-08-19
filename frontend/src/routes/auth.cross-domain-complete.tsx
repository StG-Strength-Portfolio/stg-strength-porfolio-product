import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { safeAuthReturnPath } from "@/lib/cross-domain-auth";
import { homeForRole, roleOfCurrentUser } from "@/lib/role-guard";

export const Route = createFileRoute("/auth/cross-domain-complete")({
  validateSearch: z.object({
    token_hash: z.string(),
    type: z.enum(["email", "magiclink"]),
    returnTo: z.enum(["/auth", "/auth/login"]).optional(),
  }).parse,
  component: CompleteCrossDomainAuth,
});

function CompleteCrossDomainAuth() {
  const { token_hash: tokenHash, type, returnTo } = Route.useSearch();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (cancelled) return;

      if (error) {
        console.error("[cross-domain-auth] Handoff verification failed", error);
        window.location.replace(`${safeAuthReturnPath(returnTo)}?sso=miss`);
        return;
      }

      setMessage("Opening Strength Portfolio…");
      window.history.replaceState({}, "", window.location.pathname);
      window.location.replace(homeForRole(await roleOfCurrentUser()));
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [returnTo, tokenHash, type]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <p className="text-center text-sm opacity-70">{message}</p>
    </div>
  );
}

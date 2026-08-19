import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  isStrengthPortfolioOrigin,
  safeAuthReturnPath,
} from "@/lib/cross-domain-auth";

export const Route = createFileRoute("/auth/cross-domain")({
  validateSearch: z.object({
    target: z.string(),
    returnTo: z.enum(["/auth", "/auth/login"]).optional(),
  }).parse,
  component: CrossDomainAuthBridge,
});

function CrossDomainAuthBridge() {
  const { target, returnTo } = Route.useSearch();
  const [message, setMessage] = useState("Checking your session…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const targetOrigin = target;
      const returnPath = safeAuthReturnPath(returnTo);

      if (!isStrengthPortfolioOrigin(targetOrigin) || targetOrigin === window.location.origin) {
        window.location.replace("/auth");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        window.location.replace(`${targetOrigin}${returnPath}?sso=miss`);
        return;
      }

      setMessage("Opening Strength Portfolio…");

      const { data, error } = await supabase.functions.invoke("cross-domain-session", {
        body: { targetOrigin },
      });

      if (cancelled) return;

      const tokenHash = typeof data?.tokenHash === "string" ? data.tokenHash : "";
      const verificationType =
        data?.verificationType === "magiclink" || data?.verificationType === "email"
          ? data.verificationType
          : "email";

      if (error || !tokenHash) {
        console.error("[cross-domain-auth] Could not create handoff", error ?? data);
        window.location.replace(`${targetOrigin}${returnPath}?sso=miss`);
        return;
      }

      const callback = new URL("/auth/cross-domain-complete", targetOrigin);
      callback.searchParams.set("token_hash", tokenHash);
      callback.searchParams.set("type", verificationType);
      callback.searchParams.set("returnTo", returnPath);
      window.location.replace(callback.toString());
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [returnTo, target]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <p className="text-center text-sm opacity-70">{message}</p>
    </div>
  );
}

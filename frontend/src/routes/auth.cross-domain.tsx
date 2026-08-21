import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { homeForRole, roleOfCurrentUser } from "@/lib/role-guard";
import {
  SSO_MESSAGE_STORAGE_KEY,
  authPathForReturnCode,
  consumeSsoMessage,
  isSsoAuthorityOrigin,
  isStrengthPortfolioOrigin,
  markAuthorityMiss,
  markAuthoritySeededFor,
  portfolioOriginForCode,
  safeSameOriginPath,
  type PortfolioDomainCode,
  type SsoMessage,
  type SsoReturnCode,
  type SsoVerificationType,
} from "@/lib/cross-domain-auth";
import { postSsoMessage } from "@/lib/central-sso-client";

function isDomainCode(value: unknown): value is PortfolioDomainCode {
  return value === "en" || value === "fi" || value === "sv";
}

function isReturnCode(value: unknown): value is SsoReturnCode {
  return value === "auth" || value === "login";
}

function isVerificationType(value: unknown): value is SsoVerificationType {
  return value === "email" || value === "magiclink";
}

function parsePostedMessage(raw: string): SsoMessage | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value.action !== "string") return null;

    if (value.action === "check" && isDomainCode(value.target) && isReturnCode(value.returnCode)) {
      return { action: "check", target: value.target, returnCode: value.returnCode };
    }

    if (
      value.action === "legacy-check" &&
      value.authority === "en" &&
      (value.fallback === "sv" || value.fallback === null) &&
      isReturnCode(value.returnCode)
    ) {
      return {
        action: "legacy-check",
        authority: "en",
        fallback: value.fallback,
        returnCode: value.returnCode,
      };
    }

    if (
      value.action === "receive" &&
      typeof value.tokenHash === "string" &&
      value.tokenHash.length > 0 &&
      value.tokenHash.length < 1000 &&
      isVerificationType(value.verificationType) &&
      isReturnCode(value.returnCode)
    ) {
      return {
        action: "receive",
        tokenHash: value.tokenHash,
        verificationType: value.verificationType,
        returnCode: value.returnCode,
      };
    }

    if (value.action === "miss" && isReturnCode(value.returnCode)) {
      return { action: "miss", returnCode: value.returnCode };
    }

    if (
      value.action === "seed" &&
      typeof value.tokenHash === "string" &&
      value.tokenHash.length > 0 &&
      value.tokenHash.length < 1000 &&
      isVerificationType(value.verificationType) &&
      isDomainCode(value.source) &&
      typeof value.returnPath === "string"
    ) {
      return {
        action: "seed",
        tokenHash: value.tokenHash,
        verificationType: value.verificationType,
        source: value.source,
        returnPath: safeSameOriginPath(value.returnPath),
      };
    }

    if (
      value.action === "seed-result" &&
      typeof value.ok === "boolean" &&
      typeof value.returnPath === "string"
    ) {
      return {
        action: "seed-result",
        ok: value.ok,
        returnPath: safeSameOriginPath(value.returnPath),
      };
    }
  } catch {
    // Invalid SSO payloads are rejected below.
  }
  return null;
}

function postedMessageResponse(message: SsoMessage): Response {
  const serialized = JSON.stringify(JSON.stringify(message)).replace(/</g, "\\u003c");
  const storageKey = JSON.stringify(SSO_MESSAGE_STORAGE_KEY);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"></head><body><script>sessionStorage.setItem(${storageKey},${serialized});history.replaceState({},"","/auth/cross-domain");location.replace("/auth/cross-domain");</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    },
  });
}

export const Route = createFileRoute("/auth/cross-domain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestOrigin = request.headers.get("origin") ?? "";
        if (!isStrengthPortfolioOrigin(requestOrigin)) {
          return new Response("Forbidden", { status: 403 });
        }

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
          return new Response("Bad Request", { status: 400 });
        }
        const form = await request.formData();
        const raw = form.get("message");
        const message = typeof raw === "string" ? parsePostedMessage(raw) : null;
        if (!message) return new Response("Bad Request", { status: 400 });
        return postedMessageResponse(message);
      },
    },
  },
  component: CrossDomainAuthBridge,
});

function CrossDomainAuthBridge() {
  useEffect(() => {
    let cancelled = false;

    async function createHandoff(targetOrigin: string, returnCode: SsoReturnCode) {
      const { data, error } = await supabase.functions.invoke("cross-domain-session", {
        body: { targetOrigin },
      });
      if (cancelled) return false;

      const tokenHash = typeof data?.tokenHash === "string" ? data.tokenHash : "";
      const verificationType =
        data?.verificationType === "magiclink" || data?.verificationType === "email"
          ? data.verificationType
          : "email";

      if (error || !tokenHash) {
        console.warn("[central-sso] Could not create handoff", error ?? data);
        return false;
      }

      postSsoMessage(targetOrigin, {
        action: "receive",
        tokenHash,
        verificationType,
        returnCode,
      });
      return true;
    }

    async function run() {
      const message = consumeSsoMessage();
      if (!message) {
        window.location.replace("/auth");
        return;
      }

      if (message.action === "miss") {
        markAuthorityMiss();
        window.location.replace(authPathForReturnCode(message.returnCode));
        return;
      }

      if (message.action === "receive") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: message.tokenHash,
          type: message.verificationType,
        });
        if (cancelled) return;
        if (error) {
          console.warn("[central-sso] Target handoff verification failed", error);
          markAuthorityMiss();
          window.location.replace(authPathForReturnCode(message.returnCode));
          return;
        }
        window.location.replace(homeForRole(await roleOfCurrentUser()));
        return;
      }

      if (message.action === "legacy-check") {
        const authorityOrigin = portfolioOriginForCode(message.authority);
        if (isSsoAuthorityOrigin(window.location.origin)) {
          markAuthorityMiss();
          window.location.replace(authPathForReturnCode(message.returnCode));
          return;
        }

        const { data: current } = await supabase.auth.getSession();
        if (current.session) {
          const ok = await createHandoff(authorityOrigin, message.returnCode);
          if (ok || cancelled) return;
        }

        if (message.fallback) {
          postSsoMessage(portfolioOriginForCode(message.fallback), {
            action: "legacy-check",
            authority: "en",
            fallback: null,
            returnCode: message.returnCode,
          });
          return;
        }

        postSsoMessage(authorityOrigin, { action: "miss", returnCode: message.returnCode });
        return;
      }

      if (message.action === "check") {
        const targetOrigin = portfolioOriginForCode(message.target);
        if (!isSsoAuthorityOrigin(window.location.origin) || targetOrigin === window.location.origin) {
          postSsoMessage(targetOrigin, { action: "miss", returnCode: message.returnCode });
          return;
        }

        const { data: current } = await supabase.auth.getSession();
        if (!current.session) {
          postSsoMessage(targetOrigin, { action: "miss", returnCode: message.returnCode });
          return;
        }

        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (refreshError || !refreshed.session) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          postSsoMessage(targetOrigin, { action: "miss", returnCode: message.returnCode });
          return;
        }

        const ok = await createHandoff(targetOrigin, message.returnCode);
        if (!ok && !cancelled) {
          postSsoMessage(targetOrigin, { action: "miss", returnCode: message.returnCode });
        }
        return;
      }

      if (message.action === "seed") {
        const sourceOrigin = portfolioOriginForCode(message.source);
        if (!isSsoAuthorityOrigin(window.location.origin) || sourceOrigin === window.location.origin) {
          postSsoMessage(sourceOrigin, {
            action: "seed-result",
            ok: false,
            returnPath: message.returnPath,
          });
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: message.tokenHash,
          type: message.verificationType,
        });
        if (cancelled) return;
        postSsoMessage(sourceOrigin, {
          action: "seed-result",
          ok: !error,
          returnPath: message.returnPath,
        });
        return;
      }

      if (message.action === "seed-result") {
        const { data } = await supabase.auth.getSession();
        if (message.ok && data.session?.user.id) {
          markAuthoritySeededFor(data.session.user.id);
        }
        window.location.replace(safeSameOriginPath(message.returnPath));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return <div className="min-h-screen bg-background" aria-hidden="true" />;
}

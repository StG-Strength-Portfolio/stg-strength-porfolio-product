import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  SSO_AUTHORITY_ORIGIN,
  canAttemptAuthoritySeed,
  claimSsoNavigation,
  clearAuthorityMiss,
  isSsoAuthorityOrigin,
  markAuthoritySeededFor,
  noteAuthoritySeedAttempt,
  portfolioDomainCode,
  portfolioOriginForCode,
  safeSameOriginPath,
  type SsoMessage,
  type SsoReturnCode,
  type SsoVerificationType,
} from "@/lib/cross-domain-auth";

const SILENT_SSO_CHANNEL = "strength-portfolio-silent-sso-v1";
const SILENT_SSO_TIMEOUT_MS = 2200;

type SilentAuthorityResponse =
  | { channel: typeof SILENT_SSO_CHANNEL; action: "handoff"; tokenHash: string; verificationType: SsoVerificationType }
  | { channel: typeof SILENT_SSO_CHANNEL; action: "miss" }
  | { channel: typeof SILENT_SSO_CHANNEL; action: "seed-result"; ok: boolean };

function createAuthorityFrame(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = `${SSO_AUTHORITY_ORIGIN}/auth/cross-domain`;
  iframe.title = "";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.referrerPolicy = "no-referrer";
  iframe.style.position = "absolute";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  iframe.style.left = "-9999px";
  return iframe;
}

function isSilentAuthorityResponse(value: unknown): value is SilentAuthorityResponse {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.channel === SILENT_SSO_CHANNEL && typeof message.action === "string";
}

export function postSsoMessage(origin: string, message: SsoMessage): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${origin}/auth/cross-domain`;
  form.style.display = "none";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "message";
  input.value = JSON.stringify(message);
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
}

export async function checkAuthoritySilently(): Promise<boolean> {
  if (typeof window === "undefined" || isSsoAuthorityOrigin(window.location.origin)) return false;

  return await new Promise<boolean>((resolve) => {
    const iframe = createAuthorityFrame();
    let settled = false;

    function finish(value: boolean) {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeoutId);
      iframe.remove();
      resolve(value);
    }

    async function onMessage(event: MessageEvent) {
      if (event.origin !== SSO_AUTHORITY_ORIGIN || event.source !== iframe.contentWindow) return;
      if (!isSilentAuthorityResponse(event.data)) return;

      if (event.data.action === "miss") {
        finish(false);
        return;
      }

      if (event.data.action !== "handoff") return;
      const tokenHash = event.data.tokenHash;
      const verificationType = event.data.verificationType;
      if (!tokenHash || (verificationType !== "email" && verificationType !== "magiclink")) {
        finish(false);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: verificationType,
      });
      if (!error) clearAuthorityMiss();
      finish(!error);
    }

    const timeoutId = window.setTimeout(() => finish(false), SILENT_SSO_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", () => {
      iframe.contentWindow?.postMessage(
        {
          channel: SILENT_SSO_CHANNEL,
          action: "check",
          targetOrigin: window.location.origin,
        },
        SSO_AUTHORITY_ORIGIN,
      );
    });
    document.body.appendChild(iframe);
  });
}

export async function seedAuthoritySilently(session: Session, force = false): Promise<boolean> {
  if (typeof window === "undefined" || isSsoAuthorityOrigin(window.location.origin)) return false;
  if (!force && !canAttemptAuthoritySeed(session.user.id)) return false;

  noteAuthoritySeedAttempt(session.user.id);
  const { data, error } = await supabase.functions.invoke("cross-domain-session", {
    body: { targetOrigin: SSO_AUTHORITY_ORIGIN },
  });

  const tokenHash = typeof data?.tokenHash === "string" ? data.tokenHash : "";
  const verificationType: SsoVerificationType =
    data?.verificationType === "magiclink" || data?.verificationType === "email"
      ? data.verificationType
      : "email";

  if (error || !tokenHash) {
    console.warn("[central-sso] Could not prepare silent authority seed", error ?? data);
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    const iframe = createAuthorityFrame();
    let settled = false;

    function finish(value: boolean) {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeoutId);
      iframe.remove();
      if (value) {
        markAuthoritySeededFor(session.user.id);
        clearAuthorityMiss();
      }
      resolve(value);
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== SSO_AUTHORITY_ORIGIN || event.source !== iframe.contentWindow) return;
      if (!isSilentAuthorityResponse(event.data) || event.data.action !== "seed-result") return;
      finish(event.data.ok);
    }

    const timeoutId = window.setTimeout(() => finish(false), SILENT_SSO_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", () => {
      iframe.contentWindow?.postMessage(
        {
          channel: SILENT_SSO_CHANNEL,
          action: "seed",
          tokenHash,
          verificationType,
        },
        SSO_AUTHORITY_ORIGIN,
      );
    });
    document.body.appendChild(iframe);
  });
}

export function startAuthorityCheck(returnCode: SsoReturnCode): boolean {
  if (typeof window === "undefined" || isSsoAuthorityOrigin(window.location.origin)) return false;
  const target = portfolioDomainCode(window.location.origin);
  if (!target || !claimSsoNavigation()) return false;

  postSsoMessage(SSO_AUTHORITY_ORIGIN, { action: "check", target, returnCode });
  return true;
}

export function startLegacyAuthorityDiscovery(returnCode: SsoReturnCode): boolean {
  if (typeof window === "undefined" || !isSsoAuthorityOrigin(window.location.origin)) return false;
  if (!claimSsoNavigation()) return false;

  postSsoMessage(portfolioOriginForCode("fi"), {
    action: "legacy-check",
    authority: "en",
    fallback: "sv",
    returnCode,
  });
  return true;
}

export async function seedAuthorityAndContinue(
  session: Session,
  returnPath: string,
  force = false,
): Promise<boolean> {
  if (typeof window === "undefined" || isSsoAuthorityOrigin(window.location.origin)) return false;

  const source = portfolioDomainCode(window.location.origin);
  if (!source || (!force && !canAttemptAuthoritySeed(session.user.id))) return false;

  noteAuthoritySeedAttempt(session.user.id);
  const { data, error } = await supabase.functions.invoke("cross-domain-session", {
    body: { targetOrigin: SSO_AUTHORITY_ORIGIN },
  });

  const tokenHash = typeof data?.tokenHash === "string" ? data.tokenHash : "";
  const verificationType =
    data?.verificationType === "magiclink" || data?.verificationType === "email"
      ? data.verificationType
      : "email";

  if (error || !tokenHash) {
    console.warn("[central-sso] Could not seed authority session", error ?? data);
    return false;
  }

  clearAuthorityMiss();
  postSsoMessage(SSO_AUTHORITY_ORIGIN, {
    action: "seed",
    tokenHash,
    verificationType,
    source,
    returnPath: safeSameOriginPath(returnPath, "/auth"),
  });
  return true;
}

export function ssoTargetOrigin(code: "en" | "fi" | "sv"): string {
  return portfolioOriginForCode(code);
}

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  SSO_AUTHORITY_ORIGIN,
  canAttemptAuthoritySeed,
  claimSsoNavigation,
  clearAuthorityMiss,
  isSsoAuthorityOrigin,
  noteAuthoritySeedAttempt,
  portfolioDomainCode,
  portfolioOriginForCode,
  safeSameOriginPath,
  type SsoMessage,
  type SsoReturnCode,
} from "@/lib/cross-domain-auth";

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

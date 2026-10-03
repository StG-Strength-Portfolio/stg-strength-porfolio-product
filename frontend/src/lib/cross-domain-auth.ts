export const STRENGTH_PORTFOLIO_ORIGINS = [
  "https://strengthportfolio.com",
  "https://www.strengthportfolio.com",
  "https://vahvuusportfolio.fi",
  "https://www.vahvuusportfolio.fi",
  "https://styrkeportfolj.com",
  "https://www.styrkeportfolj.com",
] as const;

export type PortfolioDomainCode = "en" | "fi" | "sv";
export type SsoReturnCode = "auth" | "login";
export type SsoVerificationType = "email" | "magiclink";

export type SsoMessage =
  | { action: "check"; target: PortfolioDomainCode; returnCode: SsoReturnCode }
  | {
      action: "legacy-check";
      authority: "en";
      fallback: "sv" | null;
      returnCode: SsoReturnCode;
    }
  | {
      action: "receive";
      tokenHash: string;
      verificationType: SsoVerificationType;
      returnCode: SsoReturnCode;
    }
  | { action: "miss"; returnCode: SsoReturnCode }
  | {
      action: "seed";
      tokenHash: string;
      verificationType: SsoVerificationType;
      source: PortfolioDomainCode;
      returnPath: string;
    }
  | { action: "seed-result"; ok: boolean; returnPath: string };

const ORIGIN_BY_CODE: Record<PortfolioDomainCode, string> = {
  en: "https://strengthportfolio.com",
  fi: "https://vahvuusportfolio.fi",
  sv: "https://styrkeportfolj.com",
};

export const SSO_AUTHORITY_ORIGIN = ORIGIN_BY_CODE.en;
export const SSO_MESSAGE_STORAGE_KEY = "strength_portfolio_sso_message_v3";

const ALLOWED_ORIGINS = new Set<string>(STRENGTH_PORTFOLIO_ORIGINS);
const AUTHORITY_MISS_KEY = "strength_portfolio_sso_authority_miss_v3";
const NAVIGATION_LOCK_KEY = "strength_portfolio_sso_navigation_v3";
const SEEDED_PREFIX = "strength_portfolio_sso_authority_seeded_v3:";
const SEED_ATTEMPT_PREFIX = "strength_portfolio_sso_authority_seed_attempt_v3:";

const RECENT_MISS_MS = 30_000;
const NAVIGATION_LOCK_MS = 5_000;
const SEED_RETRY_MS = 5 * 60_000;

export function canonicalStrengthPortfolioOrigin(origin: string): string | null {
  if (origin === "https://strengthportfolio.com" || origin === "https://www.strengthportfolio.com") {
    return ORIGIN_BY_CODE.en;
  }
  if (origin === "https://vahvuusportfolio.fi" || origin === "https://www.vahvuusportfolio.fi") {
    return ORIGIN_BY_CODE.fi;
  }
  if (origin === "https://styrkeportfolj.com" || origin === "https://www.styrkeportfolj.com") {
    return ORIGIN_BY_CODE.sv;
  }
  return null;
}

export function isStrengthPortfolioOrigin(value: string): boolean {
  return ALLOWED_ORIGINS.has(value);
}

export function portfolioDomainCode(origin: string): PortfolioDomainCode | null {
  const canonical = canonicalStrengthPortfolioOrigin(origin);
  if (canonical === ORIGIN_BY_CODE.en) return "en";
  if (canonical === ORIGIN_BY_CODE.fi) return "fi";
  if (canonical === ORIGIN_BY_CODE.sv) return "sv";
  return null;
}

export function portfolioOriginForCode(code: PortfolioDomainCode): string {
  return ORIGIN_BY_CODE[code];
}

export function isSsoAuthorityOrigin(origin: string): boolean {
  return canonicalStrengthPortfolioOrigin(origin) === SSO_AUTHORITY_ORIGIN;
}

export function authPathForReturnCode(code: SsoReturnCode): "/auth" | "/auth/login" {
  return code === "login" ? "/auth/login" : "/auth";
}

export function safeSameOriginPath(value: string | null | undefined, fallback = "/auth"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.length > 600) {
    return fallback;
  }
  return value;
}

function storageNumber(storage: Storage, key: string): number {
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) ? value : 0;
}

export function claimSsoNavigation(): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const previous = storageNumber(window.sessionStorage, NAVIGATION_LOCK_KEY);
  if (now - previous < NAVIGATION_LOCK_MS) return false;
  window.sessionStorage.setItem(NAVIGATION_LOCK_KEY, String(now));
  return true;
}

export function clearSsoNavigationLock(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(NAVIGATION_LOCK_KEY);
}

export function markAuthorityMiss(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTHORITY_MISS_KEY, String(Date.now()));
  clearSsoNavigationLock();
}

export function clearAuthorityMiss(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTHORITY_MISS_KEY);
}

export function hasRecentAuthorityMiss(): boolean {
  if (typeof window === "undefined") return false;
  const checkedAt = storageNumber(window.sessionStorage, AUTHORITY_MISS_KEY);
  return checkedAt > 0 && Date.now() - checkedAt < RECENT_MISS_MS;
}

export function peekSsoMessage(): SsoMessage | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SSO_MESSAGE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SsoMessage>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.action !== "string") return null;
    return parsed as SsoMessage;
  } catch {
    return null;
  }
}

export function consumeSsoMessage(): SsoMessage | null {
  if (typeof window === "undefined") return null;
  const message = peekSsoMessage();
  window.sessionStorage.removeItem(SSO_MESSAGE_STORAGE_KEY);
  clearSsoNavigationLock();
  return message;
}

export function isAuthoritySeededFor(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  return window.localStorage.getItem(`${SEEDED_PREFIX}${userId}`) === "1";
}

export function markAuthoritySeededFor(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(`${SEEDED_PREFIX}${userId}`, "1");
  window.localStorage.removeItem(`${SEED_ATTEMPT_PREFIX}${userId}`);
}

export function clearAuthoritySeededFor(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.removeItem(`${SEEDED_PREFIX}${userId}`);
  window.localStorage.removeItem(`${SEED_ATTEMPT_PREFIX}${userId}`);
}

export function canAttemptAuthoritySeed(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  if (isAuthoritySeededFor(userId)) return false;
  const attemptedAt = storageNumber(window.localStorage, `${SEED_ATTEMPT_PREFIX}${userId}`);
  return attemptedAt === 0 || Date.now() - attemptedAt >= SEED_RETRY_MS;
}

export function noteAuthoritySeedAttempt(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(`${SEED_ATTEMPT_PREFIX}${userId}`, String(Date.now()));
}

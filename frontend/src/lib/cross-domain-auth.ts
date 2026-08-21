export const STRENGTH_PORTFOLIO_ORIGINS = [
  "https://strengthportfolio.com",
  "https://www.strengthportfolio.com",
  "https://vahvuusportfolio.fi",
  "https://www.vahvuusportfolio.fi",
  "https://styrkeportfolj.com",
  "https://www.styrkeportfolj.com",
] as const;

const CANONICAL_ORIGINS = [
  "https://strengthportfolio.com",
  "https://vahvuusportfolio.fi",
  "https://styrkeportfolj.com",
] as const;

const ALLOWED_ORIGINS = new Set<string>(STRENGTH_PORTFOLIO_ORIGINS);

export function isStrengthPortfolioOrigin(value: string): boolean {
  return ALLOWED_ORIGINS.has(value);
}

function canonicalStrengthPortfolioOrigin(origin: string): string | null {
  if (origin === "https://strengthportfolio.com" || origin === "https://www.strengthportfolio.com") {
    return "https://strengthportfolio.com";
  }
  if (origin === "https://vahvuusportfolio.fi" || origin === "https://www.vahvuusportfolio.fi") {
    return "https://vahvuusportfolio.fi";
  }
  if (origin === "https://styrkeportfolj.com" || origin === "https://www.styrkeportfolj.com") {
    return "https://styrkeportfolj.com";
  }
  return null;
}

export function parseTriedStrengthPortfolioOrigins(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => canonicalStrengthPortfolioOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));
}

export function nextStrengthPortfolioOrigin(
  currentOrigin: string,
  triedOrigins: string[] = [],
): string | null {
  const current = canonicalStrengthPortfolioOrigin(currentOrigin);
  if (!current) return null;

  const tried = new Set(
    triedOrigins
      .map((origin) => canonicalStrengthPortfolioOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)),
  );

  return CANONICAL_ORIGINS.find((origin) => origin !== current && !tried.has(origin)) ?? null;
}

export function appendTriedStrengthPortfolioOrigin(
  triedOrigins: string[],
  origin: string,
): string[] {
  const canonical = canonicalStrengthPortfolioOrigin(origin);
  if (!canonical) return triedOrigins;
  return Array.from(new Set([...triedOrigins, canonical]));
}

export function safeAuthReturnPath(value: string | null | undefined): "/auth" | "/auth/login" {
  return value === "/auth/login" ? "/auth/login" : "/auth";
}

export function crossDomainMissUrl(
  origin: string,
  returnPath: string,
  triedOrigins: string[] = [],
): string {
  const url = new URL(safeAuthReturnPath(returnPath), origin);
  url.searchParams.set("sso", "miss");
  if (triedOrigins.length > 0) {
    url.searchParams.set("ssoTried", triedOrigins.join(","));
  }
  return url.toString();
}

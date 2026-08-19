export const STRENGTH_PORTFOLIO_ORIGINS = [
  "https://strengthportfolio.com",
  "https://www.strengthportfolio.com",
  "https://vahvuusportfolio.fi",
  "https://www.vahvuusportfolio.fi",
] as const;

const ALLOWED_ORIGINS = new Set<string>(STRENGTH_PORTFOLIO_ORIGINS);

export function isStrengthPortfolioOrigin(value: string): boolean {
  return ALLOWED_ORIGINS.has(value);
}

export function otherStrengthPortfolioOrigin(currentOrigin: string): string | null {
  if (currentOrigin === "https://strengthportfolio.com" || currentOrigin === "https://www.strengthportfolio.com") {
    return "https://vahvuusportfolio.fi";
  }
  if (currentOrigin === "https://vahvuusportfolio.fi" || currentOrigin === "https://www.vahvuusportfolio.fi") {
    return "https://strengthportfolio.com";
  }
  return null;
}

export function safeAuthReturnPath(value: string | null | undefined): "/auth" | "/auth/login" {
  return value === "/auth/login" ? "/auth/login" : "/auth";
}

export function crossDomainMissUrl(origin: string, returnPath: string): string {
  const path = safeAuthReturnPath(returnPath);
  return `${origin}${path}?sso=miss`;
}

import type { Language } from "@/lib/i18n";

export const DOMAIN_LANGUAGE_PREFERENCE_KEY = "strength_portfolio_domain_language";

export type RegistrationDomain =
  | "vahvuusportfolio.fi"
  | "strengthportfolio.com"
  | "styrkeportfolj.com";

const DOMAIN_DEFAULTS: Record<string, Language> = {
  "strengthportfolio.com": "en",
  "www.strengthportfolio.com": "en",
  "vahvuusportfolio.fi": "fi",
  "www.vahvuusportfolio.fi": "fi",
  "styrkeportfolj.com": "sv",
  "www.styrkeportfolj.com": "sv",
};

const CANONICAL_DOMAIN: Record<string, RegistrationDomain> = {
  "strengthportfolio.com": "strengthportfolio.com",
  "www.strengthportfolio.com": "strengthportfolio.com",
  "vahvuusportfolio.fi": "vahvuusportfolio.fi",
  "www.vahvuusportfolio.fi": "vahvuusportfolio.fi",
  "styrkeportfolj.com": "styrkeportfolj.com",
  "www.styrkeportfolj.com": "styrkeportfolj.com",
};

const BRAND_BY_DOMAIN: Record<RegistrationDomain, string> = {
  "vahvuusportfolio.fi": "Vahvuus Portfolio",
  "strengthportfolio.com": "Strength Portfolio",
  "styrkeportfolj.com": "Styrke Portfolj",
};

const ORIGIN_BY_LANGUAGE: Record<Language, string> = {
  fi: "https://vahvuusportfolio.fi",
  en: "https://strengthportfolio.com",
  sv: "https://styrkeportfolj.com",
};

function cleanHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

export function domainDefaultLanguage(hostname: string): Language | null {
  return DOMAIN_DEFAULTS[cleanHostname(hostname)] ?? null;
}

export function registrationDomainForHostname(hostname: string): RegistrationDomain | null {
  return CANONICAL_DOMAIN[cleanHostname(hostname)] ?? null;
}

export function domainBrandName(hostname: string): string | null {
  const domain = registrationDomainForHostname(hostname);
  return domain ? BRAND_BY_DOMAIN[domain] : null;
}

export function portfolioOriginForLanguage(language: Language): string {
  return ORIGIN_BY_LANGUAGE[language];
}

export function readDomainLanguagePreference(): Language | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(DOMAIN_LANGUAGE_PREFERENCE_KEY);
  return value === "en" || value === "fi" || value === "sv" ? value : null;
}

export function rememberDomainLanguagePreference(language: Language): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DOMAIN_LANGUAGE_PREFERENCE_KEY, language);
}

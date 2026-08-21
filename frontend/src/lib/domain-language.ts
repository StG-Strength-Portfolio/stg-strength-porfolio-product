import type { Language } from "@/lib/i18n";

export const DOMAIN_LANGUAGE_PREFERENCE_KEY = "strength_portfolio_domain_language";

const DOMAIN_DEFAULTS: Record<string, Language> = {
  "strengthportfolio.com": "en",
  "www.strengthportfolio.com": "en",
  "vahvuusportfolio.fi": "fi",
  "www.vahvuusportfolio.fi": "fi",
  "styrkeportfolj.com": "sv",
  "www.styrkeportfolj.com": "sv",
};

export function domainDefaultLanguage(hostname: string): Language | null {
  return DOMAIN_DEFAULTS[hostname.toLowerCase().replace(/\.$/, "")] ?? null;
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

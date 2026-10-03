import { LANGUAGES, useLanguage, type Language } from "@/lib/i18n";
import {
  domainDefaultLanguage,
  rememberDomainLanguagePreference,
} from "@/lib/domain-language";
import { cn } from "@/lib/utils";

const ORDER: Language[] = ["fi", "sv", "en"];
const DOMAIN_LOCKED_STAFF_PATHS = new Set([
  "/register-staff",
  "/confirm-staff",
  "/trial",
  "/confirm-trial",
]);

/** Small FI | SV | EN switcher for public auth pages. */
export function AuthLanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const items = ORDER.filter((l) => LANGUAGES.includes(l));

  // Teacher/School Admin registration is language-locked by production domain.
  // Preview/local hosts keep the switcher so the three languages remain testable.
  if (
    typeof window !== "undefined" &&
    DOMAIN_LOCKED_STAFF_PATHS.has(window.location.pathname) &&
    domainDefaultLanguage(window.location.hostname)
  ) {
    return null;
  }

  function pick(l: Language) {
    rememberDomainLanguagePreference(l);
    setLanguage(l);
  }

  return (
    <div
      className={cn(
        "absolute right-4 top-4 z-20 flex items-center gap-1 text-[12px] font-semibold",
        className,
      )}
    >
      {items.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => pick(l)}
            aria-pressed={language === l}
            className={cn(
              "rounded-full px-2 py-0.5 transition-colors",
              language === l
                ? "bg-foreground/15 text-foreground"
                : "text-foreground/60 hover:text-foreground",
            )}
          >
            {l.toUpperCase()}
          </button>
          {i < items.length - 1 && <span className="text-foreground/30">|</span>}
        </span>
      ))}
    </div>
  );
}

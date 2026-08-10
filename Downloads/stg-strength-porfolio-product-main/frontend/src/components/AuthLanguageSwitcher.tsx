import { LANGUAGES, useLanguage, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ORDER: Language[] = ["fi", "sv", "en"];

/** Small FI | SV | EN switcher for the public auth pages. */
export function AuthLanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const items = ORDER.filter((l) => LANGUAGES.includes(l));

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
            onClick={() => setLanguage(l)}
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

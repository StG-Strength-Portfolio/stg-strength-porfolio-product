import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  LANGUAGE_FLAG as BASE_LANGUAGE_FLAG,
  lookupContent as baseLookupContent,
  useLanguage,
  useT as useBaseT,
  useTr as useBaseTr,
  type Language,
} from "./i18n/index";

export * from "./i18n/index";

/**
 * U.S.-English presentation layer for Strength Portfolio.
 *
 * The workbook-generated translation files remain the source of truth.
 * We normalize only the English output here so Finnish and Swedish are left
 * untouched and regenerated translation files cannot reintroduce mixed
 * British/U.S. spelling or Finnish school-system terminology.
 */

export const LANGUAGE_FLAG: Record<Language, string> = {
  ...BASE_LANGUAGE_FLAG,
  en: "🇺🇸",
};

const US_UI_OVERRIDES: Record<string, string> = {
  "app.title": "Strength Portfolio",
  "app.tagline": "See the Good! — a strength portfolio for high school students",
  "sidebar.worldmap": "Level map",
  "worldmap.title": "Level map",
  "worldmap.subtitle": "Choose a level or continue where you left off.",
  "worldmap.resumeHeader": "Continue your journey",
  "teacher.classCard.joinCode": "Class code",
  "teacher.classCard.screensAvg": "Screens completed (avg.)",
  "teacher.classCard.sort.progress": "Progress (least complete first)",
  "teacher.roster.worlds": "Levels",
  "teacher.roster.worldScreens": "Level {w}, screens",
  "portfolio.filledOfTotal": "{done} of {total} screens completed",
};

const EXACT_ENGLISH_REWRITES: Record<string, string> = {
  "Welcome, upper secondary student!": "Welcome!",
  "High school student, start filling in the strength meter": "Start the Strength Meter",
  "Strength Portfolio for Upper Secondary Students": "Strength Portfolio for High School Students",
  "See the Good! — strength portfolio for high school":
    "See the Good! — Strength Portfolio for High School Students",
  "What did you enjoy at primary school, and what at secondary school?":
    "What did you enjoy in elementary school and middle school?",
  "What did you enjoy at school in primary grades and lower secondary school?":
    "What did you enjoy in elementary school and middle school?",
  "What encouraging feedback did you receive in comprehensive school from teachers and classmates?":
    "What encouraging feedback did you receive from teachers and classmates in elementary or middle school?",
  "What success from comprehensive school has stayed in your mind?":
    "What success from your earlier school years do you still remember?",
  "What did teachers and classmates give you encouraging feedback about in middle school?":
    "What did teachers and classmates praise or encourage you for in middle school?",
  "Choose 1–2 strength candies and use them in your studies.":
    "Choose 1–2 strength candies and use them in your schoolwork.",
  "Choose 1–2 strengths that you want to use in your studies.":
    "Choose 1–2 strengths you want to use in your schoolwork.",
  "Everyone has their own core strengths, which are worth focusing on and developing! Knowing your strengths and using them in studies and free time increases satisfaction, meaningfulness in studying and well-being.":
    "Everyone has their own core strengths, which are worth focusing on and developing! Knowing and using your strengths at school and in your free time can increase satisfaction, make schoolwork feel more meaningful, and support well-being.",
  "Everyone has their own core strengths, which are worth focusing on and developing. Knowing your strengths increases satisfaction, meaningfulness in studying and well-being.":
    "Everyone has their own core strengths, which are worth focusing on and developing. Knowing your strengths can increase satisfaction, make schoolwork feel more meaningful, and support well-being.",
};

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] && source[0] === source[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function replacePreservingCase(text: string, pattern: RegExp, replacement: string): string {
  return text.replace(pattern, (match) => matchCase(match, replacement));
}

export function normalizeAmericanEnglish(text: string): string {
  const exact = EXACT_ENGLISH_REWRITES[text];
  if (exact) return exact;

  let out = text;

  // U.S. school-system terminology.
  out = replacePreservingCase(out, /\bupper secondary school\b/gi, "high school");
  out = replacePreservingCase(out, /\bupper secondary students\b/gi, "high school students");
  out = replacePreservingCase(out, /\bupper secondary student\b/gi, "high school student");
  out = replacePreservingCase(out, /\blower secondary school\b/gi, "middle school");
  out = replacePreservingCase(out, /\bprimary school\b/gi, "elementary school");

  // American spelling. Keep these narrowly scoped to words found in the
  // student/teacher translation corpus rather than globally rewriting prose.
  out = replacePreservingCase(out, /\bfavourites\b/gi, "favorites");
  out = replacePreservingCase(out, /\bfavourite\b/gi, "favorite");
  out = replacePreservingCase(out, /\bbehaviours\b/gi, "behaviors");
  out = replacePreservingCase(out, /\bbehaviour\b/gi, "behavior");
  out = replacePreservingCase(out, /\brecognising\b/gi, "recognizing");
  out = replacePreservingCase(out, /\brecognised\b/gi, "recognized");
  out = replacePreservingCase(out, /\brecognises\b/gi, "recognizes");
  out = replacePreservingCase(out, /\brecognise\b/gi, "recognize");
  out = replacePreservingCase(out, /\bpractising\b/gi, "practicing");
  out = replacePreservingCase(out, /\bpractised\b/gi, "practiced");
  out = replacePreservingCase(out, /\bpractises\b/gi, "practices");
  out = replacePreservingCase(out, /\bpractise\b/gi, "practice");
  out = replacePreservingCase(out, /\bcoloured\b/gi, "colored");
  out = replacePreservingCase(out, /\bcolours\b/gi, "colors");
  out = replacePreservingCase(out, /\bcolour\b/gi, "color");

  return out;
}

function formatTemplate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function lookupContent(fi: string, lang: Language): string {
  const translated = baseLookupContent(fi, lang);
  return lang === "en" ? normalizeAmericanEnglish(translated) : translated;
}

export function useTr(): (finnish: string, vars?: Record<string, string | number>) => string {
  const baseTr = useBaseTr();
  const { language } = useLanguage();

  return useCallback(
    (finnish, vars) => {
      const translated = baseTr(finnish, vars);
      return language === "en" ? normalizeAmericanEnglish(translated) : translated;
    },
    [baseTr, language],
  );
}

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const baseT = useBaseT();
  const { language } = useLanguage();

  return useCallback(
    (key, vars) => {
      if (language === "en" && US_UI_OVERRIDES[key]) {
        return formatTemplate(US_UI_OVERRIDES[key], vars);
      }
      const translated = baseT(key, vars);
      return language === "en" ? normalizeAmericanEnglish(translated) : translated;
    },
    [baseT, language],
  );
}

// PortfolioScreen wraps the full student screen with TranslateFi, so this
// wrapper must use the normalized useTr() rather than the base implementation.
export function TranslateFi({ children }: { children: ReactNode }) {
  const tr = useTr();

  const translateNode = useCallback(
    (node: ReactNode): ReactNode => {
      if (typeof node === "string") {
        if (!node.trim()) return node;
        const leading = node.match(/^\s*/)?.[0] ?? "";
        const trailing = node.match(/\s*$/)?.[0] ?? "";
        return `${leading}${tr(node.trim())}${trailing}`;
      }

      if (Array.isArray(node)) return node.map(translateNode);
      if (!isValidElement(node)) return node;

      const element = node as ReactElement<{ children?: ReactNode }>;
      if (
        typeof element.type === "string" &&
        ["script", "style", "textarea"].includes(element.type)
      ) {
        return element;
      }

      const childNodes = element.props.children;
      if (childNodes === undefined) return element;
      return cloneElement(element, undefined, Children.map(childNodes, translateNode));
    },
    [tr],
  );

  return <>{Children.map(children, translateNode)}</>;
}

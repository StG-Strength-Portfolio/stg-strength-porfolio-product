import { useEffect } from "react";
import { useLanguage, type Language } from "@/lib/i18n";
import generated from "@/lib/i18n/translations-generated.json";

type Entry = { en?: string; sv?: string };
const CONTENT_DICT = generated as Record<string, Entry>;

const originalFinnish = new WeakMap<Text, string>();

function normalize(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .trim();
}

function translateKnownFinnish(source: string, language: Language) {
  if (language === "fi") return source.replace("Näy hyvää!", "Huomaa hyvä!");
  const entry = CONTENT_DICT[normalize(source)];
  const translated = entry?.[language];
  return translated?.trim() ? translated : source;
}

function shouldSkip(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(
    parent.closest(
      "script, style, textarea, input, select, option, [contenteditable='true'], [data-no-auto-translate]",
    ),
  );
}

function translateTextNode(node: Text, language: Language) {
  if (shouldSkip(node)) return;

  const raw = node.textContent ?? "";
  if (!raw.trim()) return;

  const leading = raw.match(/^\s*/)?.[0] ?? "";
  const trailing = raw.match(/\s*$/)?.[0] ?? "";
  const currentCore = raw.trim();

  let source = originalFinnish.get(node);
  if (!source) {
    // Only register nodes whose current Finnish text is actually known by the
    // product translation dictionary. This prevents translating names, codes,
    // user answers or other dynamic content.
    if (!CONTENT_DICT[normalize(currentCore)]) return;
    source = currentCore;
    originalFinnish.set(node, source);
  }

  const translated = translateKnownFinnish(source, language);
  const next = `${leading}${translated}${trailing}`;
  if (next !== raw) node.textContent = next;
}

function translateTree(root: Node, language: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, language);
    current = walker.nextNode();
  }
}

/**
 * Compatibility layer for legacy JSX that still renders Finnish text nodes
 * directly instead of calling tr()/t(). It only translates strings present in
 * the approved translation dictionary, and never touches form/user content.
 */
export function LegacyTranslationGuard() {
  const { language } = useLanguage();

  useEffect(() => {
    if (typeof document === "undefined") return;

    translateTree(document.body, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, language);
          continue;
        }
        for (const node of mutation.addedNodes) {
          translateTree(node, language);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

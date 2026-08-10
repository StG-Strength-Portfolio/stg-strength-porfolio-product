/**
 * @lovable-new 2026-08-04
 * Google Slides link helpers — turn a pasted share/edit link into the
 * embeddable and presentation URLs used by the Teaching Materials section.
 */

/** Extracts the presentation id from any Google Slides URL. */
export function slidesId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /presentation\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  if (m) return m[1];
  // Already a bare id?
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * Minimal-chrome embed URL. `hl` matches the app language so Google's own
 * controls never fall back to the browser locale, and `slide` pins a single
 * slide so the app can drive navigation itself.
 */
export function slidesEmbedUrl(
  url: string | null | undefined,
  opts?: { lang?: "fi" | "en" | "sv"; slide?: number },
): string | null {
  const id = slidesId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    rm: "minimal",
    start: "false",
    loop: "false",
    hl: opts?.lang ?? "fi",
  });
  // Numeric (1-based) slide index — works for every deck, unlike `id.pN`,
  // which only matches decks whose slide object ids were never regenerated.
  if (opts?.slide != null) params.set("slide", String(opts.slide));
  return `https://docs.google.com/presentation/d/${id}/embed?${params.toString()}`;
}

export function slidesPresentUrl(url: string | null | undefined): string | null {
  const id = slidesId(url);
  return id ? `https://docs.google.com/presentation/d/${id}/present` : null;
}

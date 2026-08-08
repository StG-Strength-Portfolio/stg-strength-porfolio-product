/**
 * @lovable-new 2026-08-05
 * Google Slides deck rendering for the Teach section.
 *
 * Browse mode = every slide stacked vertically (quick scanning).
 * @lovable-new 2026-08-05 — one shared slideshow: the yellow "Open slideshow"
 * button starts at slide 1, double-clicking a slide starts at that slide, and
 * both go through openSlideshowAt(). Native fullscreen is requested inside the
 * user gesture; the scroll position is restored when the slideshow closes.
 */
import { useCallback, useRef, useState } from "react";
import { TeachingMaterialsSlideshow } from "@/components/teach/TeachingMaterialsSlideshow";
import { slidesEmbedUrl, slidesId } from "@/lib/google-slides";
import { useTr } from "@/lib/i18n";

const DEFAULT_SLIDES = 10;

export function SlideDeck({
  url,
  title,
  lang,
  slideCount,
}: {
  url: string | null | undefined;
  title: string;
  lang: "fi" | "en" | "sv";
  slideCount?: number | null;
}) {
  const tr = useTr();
  const [slideshow, setSlideshow] = useState<number | null>(null);
  const scrollY = useRef(0);

  const total = slideCount && slideCount > 0 ? slideCount : DEFAULT_SLIDES;
  const id = slidesId(url);

  const openSlideshowAt = useCallback((index: number) => {
    scrollY.current = window.scrollY;
    // Must run inside the user gesture — a later effect may lose activation.
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    setSlideshow(index);
  }, []);

  const closeSlideshow = useCallback(() => {
    setSlideshow(null);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY.current }));
  }, []);

  if (!id) return <p className="opacity-70">{tr("Ei materiaaleja vielä.")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => openSlideshowAt(0)}
          className="rounded-full bg-[color:var(--yellow)] px-5 py-2 font-display text-base font-bold text-[color:var(--purple-dark)] shadow transition-all hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--purple-dark)]"
        >
          {tr("Avaa diaesitys")}
        </button>
        <span className="text-xs opacity-70">
          {tr("Avaa dia koko näytölle kaksoisklikkaamalla")}
        </span>
      </div>

      {/* Browse mode — every slide, scrollable */}
      <div className="space-y-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="space-y-1">
            <span className="font-mono text-xs opacity-70">
              {tr("Dia")} {i + 1}
            </span>
            <div
              role="button"
              tabIndex={0}
              aria-label={`${tr("Dia")} ${i + 1}`}
              onDoubleClick={() => openSlideshowAt(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openSlideshowAt(i);
              }}
              className="relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-2xl bg-white shadow"
            >
              <iframe
                src={slidesEmbedUrl(url, { lang, slide: i + 1 }) ?? undefined}
                title={`${title} — ${tr("Dia")} ${i + 1}`}
                loading="lazy"
                className="slide-viewer-iframe pointer-events-none h-full w-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        ))}
      </div>

      {slideshow != null && (
        <TeachingMaterialsSlideshow
          url={url}
          title={title}
          lang={lang}
          total={total}
          index={slideshow}
          onIndexChange={setSlideshow}
          onClose={closeSlideshow}
        />
      )}
    </div>
  );
}

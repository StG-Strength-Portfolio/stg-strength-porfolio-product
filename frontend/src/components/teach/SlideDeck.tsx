/**
 * @lovable-new 2026-08-05
 * Google Slides deck rendering for the Teach section.
 *
 * Browse mode = every slide stacked in a scrollable list (quick scanning).
 * Double-clicking a slide opens that slide fullscreen.
 */
import { useState } from "react";
import { SlideFullscreen } from "@/components/teach/SlideFullscreen";
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
  const [fullscreen, setFullscreen] = useState<number | null>(null);

  const total = slideCount && slideCount > 0 ? slideCount : DEFAULT_SLIDES;
  const id = slidesId(url);

  if (!id) return <p className="text-[#6B7280]">{tr("Ei materiaaleja vielä.")}</p>;

  return (
    <div className="space-y-4 text-[#1F2937]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-bold text-[#111827]">{title}</h3>
        <span className="text-xs text-[#6B7280]">
          {tr("Avaa dia koko näytölle kaksoisklikkaamalla")}
        </span>
      </div>

      <div className="space-y-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <span className="font-mono text-xs text-[#6B7280]">
              {tr("Dia")} {i + 1}
            </span>
            <div
              role="button"
              tabIndex={0}
              aria-label={`${tr("Dia")} ${i + 1}`}
              onDoubleClick={() => setFullscreen(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setFullscreen(i);
              }}
              className="designer-composite-button relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-none transition-colors hover:border-[#C4B5FD]"
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

      {fullscreen != null && (
        <SlideFullscreen
          url={url}
          title={title}
          lang={lang}
          total={total}
          index={fullscreen}
          onIndexChange={setFullscreen}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  );
}

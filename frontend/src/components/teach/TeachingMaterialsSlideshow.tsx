/**
 * @lovable-new 2026-08-05 — ONE shared Teaching Materials slideshow.
 * Replaces SlideFullscreen and the old PresentationOverlay: both the
 * "Open slideshow" button and double-clicking a slide use this component and
 * the same openSlideshowAt(index) state.
 *
 * Native fullscreen is requested by the caller inside the user gesture; if the
 * browser rejects it (preview iframe), this fixed 100vw × 100dvh body portal
 * still covers the screen, so the user never sees a blank page or a new tab.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { slidesEmbedUrl } from "@/lib/google-slides";
import { useTr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TeachingMaterialsSlideshow({
  url,
  title,
  lang,
  total,
  index,
  onIndexChange,
  onClose,
}: {
  url: string | null | undefined;
  title: string;
  lang: "fi" | "en" | "sv";
  total: number;
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const [chrome, setChrome] = useState(true);
  const timer = useRef<number | null>(null);

  const wake = useCallback(() => {
    setChrome(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setChrome(false), 3000);
  }, []);

  const prev = useCallback(() => {
    onIndexChange(Math.max(0, index - 1));
    wake();
  }, [index, onIndexChange, wake]);
  const next = useCallback(() => {
    onIndexChange(Math.min(total - 1, index + 1));
    wake();
  }, [index, total, onIndexChange, wake]);

  useEffect(() => {
    wake();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      if (timer.current) window.clearTimeout(timer.current);
      // Leaving the slideshow always leaves native fullscreen too.
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [wake]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        onClose();
      } else {
        wake();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, wake]);

  // Leaving browser fullscreen closes only the slideshow — never the article.
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) onClose();
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const fade = chrome ? "opacity-100" : "opacity-0";

  return createPortal(
    <div
      className="fixed inset-0 z-[120] h-[100dvh] w-screen bg-black"
      onMouseMove={wake}
      role="dialog"
      aria-label={title}
    >
      <iframe
        key={index}
        src={slidesEmbedUrl(url, { lang, slide: index + 1 }) ?? undefined}
        title={`${title} — ${tr("Dia")} ${index + 1}`}
        className="h-full w-full border-0"
        allowFullScreen
      />

      {/* Edge click zones — ~9% of the viewport each */}
      <button
        type="button"
        aria-label={tr("Edellinen")}
        onClick={prev}
        onFocus={wake}
        disabled={index <= 0}
        className={cn(
          "group absolute inset-y-0 left-0 z-10 flex w-[9%] items-center justify-start pl-3 transition-opacity disabled:pointer-events-none disabled:opacity-0",
          fade,
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur transition-colors group-hover:bg-white/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <button
        type="button"
        aria-label={tr("Seuraava")}
        onClick={next}
        onFocus={wake}
        disabled={index >= total - 1}
        className={cn(
          "group absolute inset-y-0 right-0 z-10 flex w-[9%] items-center justify-end pr-3 transition-opacity disabled:pointer-events-none disabled:opacity-0",
          fade,
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur transition-colors group-hover:bg-white/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m9 5 7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Close */}
      <button
        type="button"
        aria-label={tr("Sulje esitys")}
        onClick={onClose}
        onFocus={wake}
        className={cn(
          "absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur transition-opacity hover:bg-white/50",
          fade,
        )}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Counter */}
      <div className={cn("absolute inset-x-0 bottom-6 z-20 flex justify-center transition-opacity", fade)}>
        <span className="rounded-full bg-black/50 px-4 py-1.5 font-mono text-sm text-white backdrop-blur">
          {tr("Dia")} {index + 1} / {total}
        </span>
      </div>
    </div>,
    document.body,
  );
}

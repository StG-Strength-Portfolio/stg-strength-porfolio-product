// Fireworks burst celebration on save / next.
// Uses canvas-confetti for a localized burst near the trigger element.
// Respects prefers-reduced-motion. Keeps total animation under ~500ms.

import confetti from "canvas-confetti";

const DURATION_MS = 450;

export function celebrateSave(originEl?: Element | null): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      resolve();
      return;
    }

    // Compute origin from element (defaults to bottom-right where Seuraava sits).
    let originX = 0.85;
    let originY = 0.92;
    if (originEl && "getBoundingClientRect" in originEl) {
      const r = (originEl as HTMLElement).getBoundingClientRect();
      originX = (r.left + r.width / 2) / window.innerWidth;
      originY = (r.top + r.height / 2) / window.innerHeight;
    }

    const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#C780FA"];

    // Quick double-burst for a "firework" feel.
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 45,
      ticks: 90,
      gravity: 1.1,
      scalar: 0.9,
      origin: { x: originX, y: originY },
      colors,
      disableForReducedMotion: true,
    });
    window.setTimeout(() => {
      confetti({
        particleCount: 35,
        spread: 110,
        startVelocity: 30,
        ticks: 80,
        gravity: 1.2,
        scalar: 0.75,
        origin: { x: originX, y: originY },
        colors,
        disableForReducedMotion: true,
      });
    }, 120);

    window.setTimeout(resolve, DURATION_MS);
  });
}

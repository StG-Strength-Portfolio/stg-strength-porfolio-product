/**
 * Simple inline stroke icons — no external icon library.
 * 20px default, 1.5px stroke, currentColor so they invert on dark/light.
 */
import type { ReactElement, SVGProps } from "react";
import type { WorldId } from "@/lib/screens";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
    <path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" />
  </Svg>
);

export const StarIcon = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
);

export const PaletteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 100 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 005-5c0-3.9-4-7-9-7z" />
    <circle cx="7.5" cy="11.5" r="1" />
    <circle cx="10.5" cy="7.5" r="1" />
    <circle cx="15" cy="8.5" r="1" />
  </Svg>
);

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Svg>
);

export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5v-7z" />
  </Svg>
);

export const PeopleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0111 0" />
    <path d="M16 5.5a3 3 0 010 5.8" />
    <path d="M17 14.2A5.5 5.5 0 0120.5 20" />
  </Svg>
);

export const TrophyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
    <path d="M7 5.5H4.5V7A3.5 3.5 0 007.6 10.5" />
    <path d="M17 5.5h2.5V7a3.5 3.5 0 01-3.1 3.5" />
    <path d="M12 14v3.5" />
    <path d="M8.5 20h7" />
    <path d="M9.5 20l.6-2.5h3.8l.6 2.5" />
  </Svg>
);

export const GaugeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 18a9 9 0 1117 0" />
    <path d="M12 18l4-5" />
    <circle cx="12" cy="18" r="1.2" />
  </Svg>
);

export const MapIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
    <path d="M12 3c-2.5 2.6-3.8 5.7-3.8 9S9.5 18.4 12 21c2.5-2.6 3.8-5.7 3.8-9S14.5 5.6 12 3z" />
  </Svg>
);

export const CandyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M8.2 10.3L4.5 7.4v9.2l3.7-2.9" />
    <path d="M15.8 10.3l3.7-2.9v9.2l-3.7-2.9" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0115 0" />
  </Svg>
);

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z" />
    <path d="M14.5 6.5l3 3" />
  </Svg>
);

export const ChartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 17v-5M12.5 17V8M17 17v-7" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
  </Svg>
);

/** One icon per adventure level, replacing the old emoji glyphs. */
export const WORLD_ICONS: Record<WorldId, (p: IconProps) => ReactElement> = {
  prologi: SparkleIcon,
  m1: StarIcon,
  m2: PaletteIcon,
  m3: HomeIcon,
  m4: PlayIcon,
  m5: PeopleIcon,
  m6: TrophyIcon,
  m7: GaugeIcon,
};

export function WorldIcon({ id, ...rest }: IconProps & { id: WorldId }) {
  const Cmp = WORLD_ICONS[id] ?? SparkleIcon;
  return <Cmp {...rest} />;
}

/* ---------- @lovable-new 2026-08-04 — navigation icons ---------- */

export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Svg>
);

export const GiftIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
    <path d="M3.5 13h17M12 9v11.5" />
    <path d="M12 9S10.5 4.5 8 4.5a2.2 2.2 0 000 4.5h4zM12 9s1.5-4.5 4-4.5a2.2 2.2 0 010 4.5h-4z" />
  </Svg>
);

export const HeartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.4-7-9.2A4 4 0 0112 8.6 4 4 0 0119 10.8C19 15.6 12 20 12 20z" />
  </Svg>
);

export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
);

export const PresentIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M12 16v4M9 20h6" />
  </Svg>
);

export const GamepadIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" />
    <path d="M7 10.5v3M5.5 12h3" />
    <circle cx="16" cy="11" r=".9" />
    <circle cx="18" cy="13.5" r=".9" />
  </Svg>
);

interface TuvaraLogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * The official Tuvara logo — "2A Öppen solfjäder, omvänt: kantha-rader +
 * sashiko-rutnät, stiliserad solfjäder" tile, approved via Claude Design
 * (see docs/tuvara-logotyp-brief-claude-design.md and the project's
 * tuvara-logotyp-analys.md for the full design rationale). Per explicit
 * instruction this reversed tile — not the transparent light-background
 * mark used earlier — is the ONLY logo variant in use; do not reintroduce
 * the plain three-thread mark elsewhere.
 *
 * A rounded ink-navy tile carries a faint kantha-row / sashiko-grid
 * stitch pattern, with the five-thread fan icon (stem + four rising
 * threads, gold/cream) centered on top. Self-contained (background,
 * pattern and icon all in one SVG) so it drops in anywhere — nav
 * lockups, favicons, app icons — without needing a separate dark
 * container element.
 *
 * SVG path data copied verbatim from the approved Claude Design export
 * (id="2a", the "Omvänt" tile) — do not hand-edit the paths. The icon
 * layer's transform (translate 13.64,13.64 scale 0.7273) reproduces the
 * exact inset the original design used (a 96px icon centered in a 132px
 * tile) — do not change those numbers without re-deriving them.
 */
export function TuvaraLogoMark({ size = 32, className }: TuvaraLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Tuvara"
    >
      <rect x="0" y="0" width="100" height="100" rx="12.12" fill="#26314F" />
      <g clipPath="url(#tuvara-tile-clip)">
        <path d="M-5 14 L105 14" stroke="#F7EEDC" strokeWidth="1.4" strokeDasharray="5 5" opacity="0.16" />
        <path d="M-5 30 L105 30" stroke="#F7EEDC" strokeWidth="1.4" strokeDasharray="5 5" opacity="0.16" />
        <path d="M-5 86 L105 86" stroke="#F7EEDC" strokeWidth="1.4" strokeDasharray="5 5" opacity="0.16" />
        <path d="M-5 -5 L105 105" stroke="#E2A73E" strokeWidth="1.4" strokeDasharray="5 6" opacity="0.2" />
        <path d="M-5 35 L65 105" stroke="#E2A73E" strokeWidth="1.4" strokeDasharray="5 6" opacity="0.2" />
        <path d="M35 -5 L105 65" stroke="#E2A73E" strokeWidth="1.4" strokeDasharray="5 6" opacity="0.2" />
        <path d="M105 -5 L-5 105" stroke="#F7EEDC" strokeWidth="1.4" strokeDasharray="5 6" opacity="0.14" />
        <path d="M65 -5 L-5 65" stroke="#F7EEDC" strokeWidth="1.4" strokeDasharray="5 6" opacity="0.14" />
        <path d="M105 35 L35 105" stroke="#F7EEDC" strokeWidth="1.4" strokeDasharray="5 6" opacity="0.14" />
      </g>
      <g transform="translate(13.64,13.64) scale(0.7273)" fill="none">
        <path d="M17 83 Q29 77 42 69" stroke="#E2A73E" strokeWidth="5" strokeDasharray="8 7" strokeLinecap="round" />
        <circle cx="13" cy="86" r="4.5" fill="#E2A73E" />
        <path d="M45 68 Q61 67 77 66" stroke="#F7EEDC" strokeWidth="4" strokeDasharray="6.5 6" strokeLinecap="round" opacity="0.6" />
        <path d="M45 67 Q61 61 76 54" stroke="#F7EEDC" strokeWidth="4.2" strokeDasharray="6.5 6" strokeLinecap="round" opacity="0.8" />
        <path d="M44 66 Q58 52 72 39" stroke="#F7EEDC" strokeWidth="4.4" strokeDasharray="7 6" strokeLinecap="round" />
        <path d="M43 65 Q53 46 62 27" stroke="#F7EEDC" strokeWidth="4.2" strokeDasharray="6.5 6" strokeLinecap="round" opacity="0.8" />
        <path d="M42 64 Q45 41 47 19" stroke="#F7EEDC" strokeWidth="4" strokeDasharray="6.5 6" strokeLinecap="round" opacity="0.6" />
        <path d="M50 60 Q66 47 78 30" stroke="#E2A73E" strokeWidth="2.2" strokeDasharray="4 5" strokeLinecap="round" opacity="0.55" />
        <circle cx="81" cy="66" r="4" fill="#E2A73E" opacity="0.7" />
        <circle cx="80" cy="52" r="4.6" fill="#E2A73E" opacity="0.85" />
        <circle cx="76" cy="35" r="6.6" fill="#E2A73E" />
        <circle cx="65" cy="22" r="4.6" fill="#E2A73E" opacity="0.85" />
        <circle cx="48" cy="14" r="4" fill="#E2A73E" opacity="0.7" />
      </g>
      <defs>
        <clipPath id="tuvara-tile-clip">
          <rect x="0" y="0" width="100" height="100" rx="12.12" />
        </clipPath>
      </defs>
    </svg>
  );
}

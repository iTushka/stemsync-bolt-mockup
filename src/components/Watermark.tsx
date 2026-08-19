interface WatermarkProps {
  label: string;
}

/**
 * A small, low-opacity, click-through corner label — not a copy-
 * prevention measure (nothing on the web can stop a screenshot, see the
 * security/IP analysis doc), but traceability: if a screenshot of the app
 * is ever leaked or shown to someone it shouldn't be, this identifies
 * which pilot/demo instance and roughly when it was taken. Deliberately
 * uses PILOT_SLUG, not TenantConfig.displayName — see config.ts's comment
 * that displayName is "internal reference only, never shown in the app
 * UI"; PILOT_SLUG is already visible in the URL bar, so showing it here
 * doesn't expose anything new.
 *
 * Positioned bottom-left, above the bottom nav, deliberately on the
 * opposite side from the "Add item" FAB (bottom-24 right-4 in
 * StockList.tsx) so the two never collide.
 */
export function Watermark({ label }: WatermarkProps) {
  return (
    <div
      className="fixed bottom-20 left-2 z-20 pointer-events-none select-none text-[9px] leading-tight text-stone-400/60"
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

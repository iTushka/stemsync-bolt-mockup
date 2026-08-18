/**
 * B9 (tuvara-bifogade-filer-analys.md) — a small, fixed, generic colour
 * palette for tagging stock. Deliberately generic names (Red, Blue, Gold,
 * ...) rather than any industry-specific vocabulary (no flower/fabric
 * terms) — same "never a shared, branch-specific list" discipline as
 * categoryFieldMap.ts, just applied by *not* trying to be industry-aware
 * here at all. `swatch` is a valid CSS `background` value (a solid colour
 * or, for Multicolor, a gradient) so the UI never needs a special case.
 */
export interface ColorOption {
  name: string;
  swatch: string;
}

export const COLOR_PALETTE: ColorOption[] = [
  { name: 'Red', swatch: '#ef4444' },
  { name: 'Orange', swatch: '#f97316' },
  { name: 'Yellow', swatch: '#eab308' },
  { name: 'Green', swatch: '#22c55e' },
  { name: 'Blue', swatch: '#3b82f6' },
  { name: 'Purple', swatch: '#a855f7' },
  { name: 'Pink', swatch: '#ec4899' },
  { name: 'White', swatch: '#f5f5f4' },
  { name: 'Black', swatch: '#292524' },
  { name: 'Brown', swatch: '#92400e' },
  { name: 'Gold', swatch: '#ca8a04' },
  { name: 'Silver', swatch: '#a1a1aa' },
  { name: 'Multicolor', swatch: 'linear-gradient(135deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7)' },
];

export function swatchFor(colorName?: string): string | undefined {
  return COLOR_PALETTE.find((c) => c.name === colorName)?.swatch;
}

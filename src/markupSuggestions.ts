import type { MarkupPreset, SeasonPreset } from './types';

/**
 * B2/B3 (tuvara-sasongspaslag-analys.md) — combines a seller's own tag-based
 * markup presets (Lager 2) with a season/occasion boost (Lager 3) into one
 * suggested sale price. Confirmed combination rule from the pilots: "lägg
 * på" (multiply), not add — each matching layer multiplies the previous
 * result rather than the layers being summed. This is purely a *suggestion*
 * generator; nothing here writes to a StockItem — see AddSheet.tsx's
 * "Use this" button for where the seller actually applies it (never
 * automatic, per the AI-suggests/owner-decides principle).
 */
export interface MarkupSuggestion {
  /** Final multiplier after combining every matching layer, e.g. 1.5 for +50%. */
  multiplier: number;
  suggestedPrice: number;
  matchedTags: MarkupPreset[];
  matchedSeason?: SeasonPreset;
}

/**
 * @param tags Item's current tags — matched case-insensitively, exact tag
 *   text only (no fuzzy matching, same discipline as forecast.ts).
 * @param season Item's chosen season/occasion name, if any — matched
 *   case-insensitively against seasonPresets' `name`.
 */
export function suggestMarkup(
  purchasePrice: number,
  tags: string[],
  season: string | undefined,
  markupPresets: MarkupPreset[],
  seasonPresets: SeasonPreset[],
): MarkupSuggestion | null {
  if (purchasePrice <= 0) return null;

  const lowerTags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const matchedTags = markupPresets.filter((p) => lowerTags.includes(p.tag.trim().toLowerCase()));

  const matchedSeason = season
    ? seasonPresets.find((p) => p.name.trim().toLowerCase() === season.trim().toLowerCase())
    : undefined;

  if (matchedTags.length === 0 && !matchedSeason) return null;

  let multiplier = 1;
  for (const preset of matchedTags) {
    multiplier *= preset.markup;
  }
  if (matchedSeason) {
    multiplier *= matchedSeason.boostMultiplier;
  }

  return {
    multiplier,
    suggestedPrice: Math.round(purchasePrice * multiplier * 100) / 100,
    matchedTags,
    matchedSeason,
  };
}

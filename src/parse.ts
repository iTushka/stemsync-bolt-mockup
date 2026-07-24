import type { StockItem, Category, SalesChannel } from './types';
import { totalUnitsFromBatch, unitCostFromBatch } from './batchPricing';
import { suggestCategoryFromLearning } from './categoryLearning';
import { CATEGORY_KEYWORDS_BY_TENANT } from './categoryFieldMap';
import { TENANT } from './config';

export interface ParsedEntry {
  name?: string;
  quantity?: number;
  purchasePrice?: number;
  salePrice?: number;
  category?: Category;
  channels?: SalesChannel[];
}

const CHANNEL_KEYWORDS: { pattern: RegExp; name: string }[] = [
  { pattern: /whats ?app/i, name: 'WhatsApp' },
  { pattern: /facebook( marketplace)?/i, name: 'Facebook Marketplace' },
  { pattern: /instagram/i, name: 'Instagram' },
  { pattern: /(physical market|market stall|stall)/i, name: 'Physical market' },
];

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100,
};

// A "price token": an optional currency symbol before or after the number,
// and an optional per-unit suffix like "pp", "each", "ea", "/pp", "per unit".
// The negative lookahead right after the digits stops this from ever
// swallowing a still-unconsumed tray count ("4 tray") as if it were a
// price — without it, "bought 4 tray ..." reads "4" as the purchase price
// whenever the pieces-per-tray phrase couldn't be found and the batch
// block above never got a chance to strip "4 tray" out of the text first.
const PRICE_TOKEN =
  '(?:[£$€]|kr|tk|৳)?\\s*(\\d+(?:[.,]\\d+)?)(?!\\s*trays?\\b)\\s*(?:[£$€]|kr|tk|৳)?' +
  '(?:\\s*\\/?\\s*(?:pp|ea|each|piece|pieces|pcs|unit|units|st|p)\\b)?(?:\\s+each\\b)?';

function parseNumberWord(token: string): number | undefined {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  const lower = token.toLowerCase();
  if (numberWords[lower] !== undefined) return numberWords[lower];
  return undefined;
}

/** Finds a keyword (e.g. "bought", "sell for") and reads the price token that
 *  follows it. Returns both the parsed number and the full matched substring
 *  so the caller can strip it out of the name afterwards. */
function extractPriceAfterKeyword(
  text: string,
  keywordPattern: string
): { value: number; matchText: string } | undefined {
  const re = new RegExp(`(${keywordPattern})\\s*(?:at|for)?\\s*${PRICE_TOKEN}`, 'i');
  const match = text.match(re);
  if (!match) return undefined;
  const num = parseFloat(match[2].replace(',', '.'));
  if (isNaN(num) || num <= 0) return undefined;
  return { value: Math.round(num * 100) / 100, matchText: match[0] };
}

/**
 * Detects a price explicitly marked as a *total* — "40 in total", "40
 * total", "total cost 40" — as opposed to a per-unit price. This is the
 * free-text equivalent of the batch calculator in AddSheet: someone typing
 * "2 tray baby palms, 12 total, 40 in total" means £40 for all 12 plants,
 * not £40 each. Without this, the generic "bought/cost/paid" keyword match
 * below has no way to tell the difference and silently treats the total as
 * a per-unit price — which is exactly the bug this fixes.
 */
function extractTotalPrice(text: string): { value: number; matchText: string } | undefined {
  const re = new RegExp(
    `(?:total(?:\\s+cost)?\\s*(?:of|is|was)?\\s*${PRICE_TOKEN}|${PRICE_TOKEN}\\s*(?:in\\s+)?total)`,
    'i'
  );
  const match = text.match(re);
  if (!match) return undefined;
  const raw = match[1] ?? match[2];
  if (!raw) return undefined;
  const num = parseFloat(raw.replace(',', '.'));
  if (isNaN(num) || num <= 0) return undefined;
  return { value: Math.round(num * 100) / 100, matchText: match[0] };
}

/** "at 80p" / "for 25 £" — a price with no keyword, just a leading
 *  preposition. Shared by the plain per-unit fallback further down and by
 *  the tray/batch block, which reuses it to catch a batch total phrased as
 *  "... for 25 £" rather than "... 25 in total". `perUnit` is true when the
 *  match itself carries an explicit per-unit marker ("at £2 each") — the
 *  batch block must NOT treat that as a total to divide by quantity, since
 *  "each" already says it's per plant, not for the whole tray. */
function extractAtForPrice(
  text: string
): { value: number; matchText: string; perUnit: boolean } | undefined {
  const match = text.match(new RegExp(`(?:at|for)\\s*${PRICE_TOKEN}`, 'i'));
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(',', '.'));
  if (isNaN(num) || num <= 0) return undefined;
  const perUnit = /\b(?:pp|ea|each|piece|pieces|pcs|unit|units|st|p)\b/i.test(match[0]);
  return { value: Math.round(num * 100) / 100, matchText: match[0], perUnit };
}

/** "4 trays" — the tray count in a batch purchase. Deliberately does NOT
 *  match a bare "4" on its own; it only fires when the word "tray(s)"
 *  is actually there, so it can't be confused with a plain item count. */
function extractTrayCount(text: string): { value: number; matchText: string } | undefined {
  const match = text.match(/\b(\d+)\s*trays?\b/i);
  if (!match) return undefined;
  const num = parseInt(match[1], 10);
  if (isNaN(num) || num <= 0) return undefined;
  return { value: num, matchText: match[0] };
}

/** "6 pieces on each tray", "6 per tray", "tray has 6 plants" — how many
 *  individual plants are in a single tray. Deliberately requires an
 *  explicit descriptive word (pieces/pcs/units, or per/each/every, or
 *  has/have/contains/holds) — without that, a bare "2 tray" would satisfy
 *  this just as easily as it satisfies extractTrayCount, double-counting
 *  the same phrase as both the tray count AND the pieces-per-tray. The
 *  third alternative covers the reversed order ("each tray has 6 plants"),
 *  which the first two miss since they all expect the count before "tray". */
function extractPiecesPerTray(text: string): { value: number; matchText: string } | undefined {
  const match =
    text.match(/\b(\d+)\s*(?:pieces?|pcs|units?)\s*(?:on\s+)?(?:each|every|per)\s*tray\b/i) ??
    text.match(/\b(\d+)\s*(?:per|each|every)\s*tray\b/i) ??
    text.match(/\btrays?\s+(?:has|have|contains?|holds?)\s+(\d+)\b/i);
  if (!match) return undefined;
  const num = parseInt(match[1], 10);
  if (isNaN(num) || num <= 0) return undefined;
  return { value: num, matchText: match[0] };
}

export function parseEntry(text: string): ParsedEntry {
  const result: ParsedEntry = {};
  let cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return result;

  // --- Tray/batch purchase — "4 trays ... 6 pieces each tray ... total
  // 40£" — the free-text equivalent of the batch calculator in AddSheet.
  // Runs before the generic quantity/price extraction below, otherwise
  // "bought 4 trays" gets misread as "quantity: 4" (the tray count, not
  // the plant count) and the total price gets divided by that instead of
  // the real number of plants.
  const trayCount = extractTrayCount(cleaned);
  const piecesPerTray = extractPiecesPerTray(cleaned);
  if (trayCount && piecesPerTray) {
    result.quantity = totalUnitsFromBatch({
      totalCost: 0,
      trays: trayCount.value,
      piecesPerTray: piecesPerTray.value,
    });
    cleaned = cleaned
      .replace(piecesPerTray.matchText, ' ')
      .replace(trayCount.matchText, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const trayTotalPrice = extractTotalPrice(cleaned);
    const trayAtForPrice = trayTotalPrice ? undefined : extractAtForPrice(cleaned);
    const trayPrice = trayTotalPrice ?? trayAtForPrice;
    if (trayPrice) {
      cleaned = cleaned.replace(trayPrice.matchText, ' ').replace(/\s{2,}/g, ' ').trim();
      result.purchasePrice = trayAtForPrice?.perUnit
        ? trayAtForPrice.value
        : unitCostFromBatch({
            totalCost: trayPrice.value,
            trays: trayCount.value,
            piecesPerTray: piecesPerTray.value,
          });
    }
  }

  // --- Quantity ---------------------------------------------------------
  // Try "bought 20" / "buy 20" first, then "20 pcs/units", then fall back
  // to a leading number ("20 white roses"). Skipped entirely if the tray
  // logic above already worked it out — and "bought 4 trays" is excluded
  // here even on its own, so a tray count is never mistaken for a plain
  // item count even when pieces-per-tray couldn't be found.
  if (result.quantity === undefined) {
    let qtyMatch = cleaned.match(/\b(?:bought|buy(?:ing)?|purchase[d]?)\s+(\d+)\b(?!\s*trays?)/i);
    if (!qtyMatch) qtyMatch = cleaned.match(/\b(\d+)\s*(?:pcs|pieces?|units?)\b/i);
    if (qtyMatch) {
      result.quantity = parseInt(qtyMatch[1], 10);
      cleaned = cleaned.replace(qtyMatch[0], ' ').replace(/\s{2,}/g, ' ').trim();
    } else {
      const tokens = cleaned.split(' ');
      const firstToken = tokens[0];
      const nextToken = (tokens[1] ?? '').toLowerCase();
      const qty = parseNumberWord(firstToken);
      // "2 tray Baby palm tree" — don't treat the 2 as a plant count just
      // because pieces-per-tray wasn't found; leave it unset so the amber
      // hint below prompts a manual check instead of a silently wrong guess.
      const looksLikeTrayCount = /^trays?[.,;:]?$/.test(nextToken);
      if (qty !== undefined && tokens.length > 1 && !looksLikeTrayCount) {
        result.quantity = qty;
        cleaned = cleaned.replace(firstToken, '').trim();
      }
    }
  }

  // --- Purchase price: "total" phrasing takes priority over per-unit ------
  // "40 total" means the whole batch, not per plant — divide by quantity if
  // we already have one, the same arithmetic the batch calculator does.
  // If quantity isn't known yet, don't guess: leave purchasePrice unset so
  // the amber "couldn't find this" hint prompts a manual check instead of
  // silently treating the total as a per-unit price. Skipped if the tray
  // logic above already found and consumed a total price.
  if (result.purchasePrice === undefined) {
    const totalPrice = extractTotalPrice(cleaned);
    if (totalPrice) {
      cleaned = cleaned.replace(totalPrice.matchText, ' ').replace(/\s{2,}/g, ' ').trim();
      if (result.quantity && result.quantity > 0) {
        result.purchasePrice = Math.round((totalPrice.value / result.quantity) * 100) / 100;
      }
    }
  }

  // --- Purchase price (keyword-based only) --------------------------------
  if (result.purchasePrice === undefined) {
    const purchase = extractPriceAfterKeyword(cleaned, 'bought|cost|paid|buy(?:ing)?|purchase[d]?');
    if (purchase) {
      result.purchasePrice = purchase.value;
      cleaned = cleaned.replace(purchase.matchText, ' ').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // --- Sale price (keyword-based) — runs BEFORE the generic at/for fallback
  // below, so a phrase like "sell for 60 kr" is claimed by "sell" here and
  // never mistaken for a purchase price by the more generic pattern.
  const sale = extractPriceAfterKeyword(
    cleaned,
    'sell(?:ing)?\\s+price[d]?|sell(?:ing)?|price[d]?|asking|rrp'
  );
  if (sale) {
    result.salePrice = sale.value;
    cleaned = cleaned.replace(sale.matchText, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  // --- Purchase price fallback: original "40 roses at 80p each" style,
  // with no explicit keyword — only tried if nothing was found above.
  if (result.purchasePrice === undefined) {
    const forMatch = extractAtForPrice(cleaned);
    if (forMatch) {
      result.purchasePrice = forMatch.value;
      cleaned = cleaned.replace(forMatch.matchText, ' ').replace(/\s{2,}/g, ' ').trim();
    }
  }
  // --- Channels -----------------------------------------------------
  const foundChannels: SalesChannel[] = [];
  for (const { pattern, name: channelName } of CHANNEL_KEYWORDS) {
    const match = cleaned.match(pattern);
    if (match && !foundChannels.some((c) => c.name === channelName)) {
      foundChannels.push({ id: Math.random().toString(36).slice(2, 9), name: channelName });
      cleaned = cleaned.replace(match[0], ' ').replace(/\s{2,}/g, ' ').trim();
    }
  }
  if (foundChannels.length > 0) result.channels = foundChannels;

  // --- Whatever's left over is the name -----------------------------------
  // Only strip connector words ("on", "via", "and", "at", "for", "of") when
  // they're leftover debris at the very start/end of the string — e.g. "on"
  // dangling after a channel phrase was cut out, or "for" dangling after a
  // price phrase was cut out. A global mid-string strip here previously ate
  // these same words wherever they occurred, including inside real product
  // names ("stings and pearls" -> "stings pearls", "Bird of paradise" ->
  // "Bird paradise") — this must never happen, since those words were
  // actually typed by the seller and aren't extraction artifacts.
  const name = cleaned
    .replace(/^(?:\s*\b(?:on|via|and|at|for|of)\b\s*)+/i, '')
    .replace(/(?:\s*\b(?:on|via|and|at|for|of)\b\s*)+$/i, '')
    .replace(/\s*,\s*(?=$|,)/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (name) {
    result.name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  if (result.purchasePrice && result.purchasePrice > 0 && !result.salePrice) {
    const targetMargin = 0.68;
    result.salePrice = Math.round(result.purchasePrice / (1 - targetMargin));
  }

  if (result.name) {
    const learned = suggestCategoryFromLearning(result.name);
    if (learned) {
      result.category = learned;
    } else {
      const lower = result.name.toLowerCase();
      const keywordsByCategory = CATEGORY_KEYWORDS_BY_TENANT[TENANT];
      for (const [category, keywords] of Object.entries(keywordsByCategory) as [Category, string[]][]) {
        if (keywords.some((keyword) => lower.includes(keyword))) {
          result.category = category;
          break;
        }
      }
    }
  }

  return result;
}

export function createDraftFromParsed(parsed: ParsedEntry): Omit<StockItem, 'id' | 'createdAt'> {
  return {
    name: parsed.name ?? '',
    category: parsed.category ?? 'Other',
    quantity: parsed.quantity ?? 0,
    purchasePrice: parsed.purchasePrice ?? 0,
    salePrice: parsed.salePrice ?? 0,
    supplier: '',
    tags: [],
    environment: '',
    channels: parsed.channels ?? [],
    aging: false,
    soldOut: false,
  };
}

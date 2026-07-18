import type { StockItem, Category, SalesChannel } from './types';

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
const PRICE_TOKEN =
  '(?:[£$€]|kr|tk|৳)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:[£$€]|kr|tk|৳)?' +
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

export function parseEntry(text: string): ParsedEntry {
  const result: ParsedEntry = {};
  let cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return result;

  // --- Quantity ---------------------------------------------------------
  // Try "bought 20" / "buy 20" first, then "20 pcs/units", then fall back
  // to a leading number ("20 white roses").
  let qtyMatch = cleaned.match(/\b(?:bought|buy(?:ing)?|purchase[d]?)\s+(\d+)\b/i);
  if (!qtyMatch) qtyMatch = cleaned.match(/\b(\d+)\s*(?:pcs|pieces?|units?)\b/i);
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1], 10);
    cleaned = cleaned.replace(qtyMatch[0], ' ').replace(/\s{2,}/g, ' ').trim();
  } else {
    const firstToken = cleaned.split(' ')[0];
    const qty = parseNumberWord(firstToken);
    if (qty !== undefined && cleaned.split(' ').length > 1) {
      result.quantity = qty;
      cleaned = cleaned.replace(firstToken, '').trim();
    }
  }

  // --- Purchase price (keyword-based only) --------------------------------
  const purchase = extractPriceAfterKeyword(cleaned, 'bought|cost|paid|buy(?:ing)?|purchase[d]?');
  if (purchase) {
    result.purchasePrice = purchase.value;
    cleaned = cleaned.replace(purchase.matchText, ' ').replace(/\s{2,}/g, ' ').trim();
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
    const forMatch = cleaned.match(new RegExp(`(?:at|for)\\s*${PRICE_TOKEN}`, 'i'));
    if (forMatch) {
      const price = parseFloat(forMatch[1].replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        result.purchasePrice = Math.round(price * 100) / 100;
        cleaned = cleaned.replace(forMatch[0], ' ').replace(/\s{2,}/g, ' ').trim();
      }
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
  const name = cleaned
    .replace(/\b(on|via|and)\b/gi, ' ')
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
    const lower = result.name.toLowerCase();
    if (lower.includes('rose') || lower.includes('tulip') || lower.includes('eucalyptus') || lower.includes('flower')) {
      result.category = 'Flowers';
    } else if (lower.includes('tomato') || lower.includes('lettuce') || lower.includes('onion')) {
      result.category = 'Vegetables';
    } else if (lower.includes('apple') || lower.includes('pear') || lower.includes('lemon')) {
      result.category = 'Fruit';
    } else if (lower.includes('basil') || lower.includes('mint') || lower.includes('parsley')) {
      result.category = 'Herbs';
    } else {
      result.category = 'Other';
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

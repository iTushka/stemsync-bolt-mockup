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

function parseNumberWord(token: string): number | undefined {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  const lower = token.toLowerCase();
  if (numberWords[lower] !== undefined) return numberWords[lower];
  return undefined;
}

export function parseEntry(text: string): ParsedEntry {
  const result: ParsedEntry = {};
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return result;

  const tokens = cleaned.split(' ');

  const qty = parseNumberWord(tokens[0]);
  if (qty !== undefined && tokens.length > 1) {
    result.quantity = qty;
    tokens.shift();
  }

  const forMatch = cleaned.match(/(?:at|for)\s+(.+?)\s*(?:each|st\b|kr\b|p\b)/i);
  if (forMatch) {
    const priceStr = forMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price > 0) {
      result.purchasePrice = Math.round(price);
    }
  }

  const remaining = tokens.join(' ');
  let name = remaining
    .replace(/(?:at|for)\s+.+?(?:each|st\b|kr\b|p\b).*/i, '')
    .replace(/^\d+\s+/, '')
    .trim();

  // Explicit sale price, e.g. "sell for 60 kr", "selling at £3", "price 45"
  const sellMatch = cleaned.match(
    /(?:sell(?:ing)?\s*(?:for|at)|price[d]?\s*(?:at)?)\s*[£$€]?\s*(\d+(?:[.,]\d+)?)\s*(?:kr|each|st)?/i
  );
  if (sellMatch) {
    const price = parseFloat(sellMatch[1].replace(',', '.'));
    if (!isNaN(price) && price > 0) {
      result.salePrice = Math.round(price);
    }
    name = name.replace(sellMatch[0], '').trim();
  }

  // Channels explicitly mentioned in the text, e.g. "on WhatsApp and Instagram"
  const foundChannels: SalesChannel[] = [];
  for (const { pattern, name: channelName } of CHANNEL_KEYWORDS) {
    const match = cleaned.match(pattern);
    if (match && !foundChannels.some((c) => c.name === channelName)) {
      foundChannels.push({
        id: Math.random().toString(36).slice(2, 9),
        name: channelName,
      });
      name = name.replace(match[0], '').trim();
    }
  }
  if (foundChannels.length > 0) {
    result.channels = foundChannels;
  }

  // Tidy up leftover connector words after stripping price/channel phrases
  name = name.replace(/\s*\b(on|via|and)\b\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
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

import type { StockItem, Category } from './types';

export interface ParsedEntry {
  name?: string;
  quantity?: number;
  purchasePrice?: number;
  salePrice?: number;
  category?: Category;
}

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
  const name = remaining
    .replace(/(?:at|for)\s+.+?(?:each|st\b|kr\b|p\b).*/i, '')
    .replace(/^\d+\s+/, '')
    .trim();
  if (name) result.name = name.charAt(0).toUpperCase() + name.slice(1);

  if (result.purchasePrice && result.purchasePrice > 0) {
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
    channels: [],
    aging: false,
    soldOut: false,
  };
}

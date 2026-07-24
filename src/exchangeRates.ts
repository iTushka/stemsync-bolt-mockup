export type CurrencyCode = 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'CNH' | 'BDT';

export const REFERENCE_CURRENCIES: CurrencyCode[] = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CNH', 'BDT'];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'C$',
  AUD: 'A$',
  CNH: '¥',
  BDT: '৳',
};

/**
 * Manually entered, never fetched — there's no CORS-friendly rate API and
 * this app is deliberately backend-free (see CLAUDE.md). `rate` is how many
 * units of the seller's own trading currency (settings.currencySymbol) one
 * unit of `code` is worth, e.g. { code: 'USD', rate: 123.50 } for a seller
 * trading in BDT.
 */
export interface ExchangeRate {
  rate: number;
  updatedAt: number;
}

export type ExchangeRates = Partial<Record<CurrencyCode, ExchangeRate>>;

const STALE_AFTER_DAYS = 14;
const DAY_MS = 86400000;

export function daysSinceUpdate(updatedAt: number, now = Date.now()): number {
  return Math.floor((now - updatedAt) / DAY_MS);
}

export function isRateStale(updatedAt: number, now = Date.now()): boolean {
  return daysSinceUpdate(updatedAt, now) > STALE_AFTER_DAYS;
}

/** Foreign amount -> the seller's local trading currency. */
export function toLocal(foreignAmount: number, rate: number): number {
  return foreignAmount * rate;
}

/** Local trading currency -> foreign amount. */
export function fromLocal(localAmount: number, rate: number): number {
  if (rate <= 0) return 0;
  return localAmount / rate;
}

/** Which of the six reference currencies actually have a saved rate. */
export function availableCurrencies(rates: ExchangeRates): CurrencyCode[] {
  return REFERENCE_CURRENCIES.filter((code) => rates[code] !== undefined);
}

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Clock, PackageX, TrendingUp, ShoppingBag, Tag, Sparkles } from 'lucide-react';
import type { StockItem, Bundle, CartLine } from './types';
import { margin } from './types';

/**
 * Compact, glanceable insight chips for the top of each tab — the same idea
 * as a weather app's condition strip or a taskbar stock ticker: a handful of
 * short, colour-coded facts you register at a glance, not a dashboard you
 * have to read. Everything here is computed from data the app already has
 * (items, cart, bundles) — no new state, no per-tenant special-casing, so
 * it works the same way for every tenant automatically.
 */

export type InsightTone = 'positive' | 'warning' | 'danger' | 'info';

export interface InsightChip {
  id: string;
  icon: LucideIcon;
  label: string;
  tone: InsightTone;
}

const LOW_MARGIN_THRESHOLD = 30;
const LOW_STOCK_THRESHOLD = 3;

export function stockInsights(items: StockItem[]): InsightChip[] {
  const chips: InsightChip[] = [];

  const aging = items.filter((i) => i.aging && !i.soldOut);
  if (aging.length > 0) {
    chips.push({ id: 'aging', icon: Clock, label: `${aging.length} aging`, tone: 'warning' });
  }

  const belowMargin = items.filter(
    (i) => !i.soldOut && i.salePrice > 0 && margin(i.purchasePrice, i.salePrice) < LOW_MARGIN_THRESHOLD
  );
  if (belowMargin.length > 0) {
    chips.push({
      id: 'margin',
      icon: AlertTriangle,
      label: `${belowMargin.length} below margin`,
      tone: 'danger',
    });
  }

  const soldOut = items.filter((i) => i.soldOut);
  if (soldOut.length > 0) {
    chips.push({ id: 'soldout', icon: PackageX, label: `${soldOut.length} sold out`, tone: 'info' });
  }

  if (chips.length === 0 && items.length > 0) {
    chips.push({ id: 'healthy', icon: TrendingUp, label: 'Stock looks healthy', tone: 'positive' });
  }

  return chips;
}

export function sellInsights(items: StockItem[], cart: CartLine[], currencySymbol: string): InsightChip[] {
  const chips: InsightChip[] = [];

  if (cart.length > 0) {
    const total = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const count = cart.reduce((s, l) => s + l.quantity, 0);
    chips.push({
      id: 'cart',
      icon: ShoppingBag,
      label: `Cart: ${count} item${count === 1 ? '' : 's'}, ${currencySymbol}${total.toFixed(2)}`,
      tone: 'info',
    });
  }

  const lowStock = items.filter((i) => !i.soldOut && i.quantity > 0 && i.quantity <= LOW_STOCK_THRESHOLD);
  if (lowStock.length > 0) {
    chips.push({
      id: 'lowstock',
      icon: AlertTriangle,
      label: `${lowStock.length} running low`,
      tone: 'warning',
    });
  }

  if (chips.length === 0) {
    chips.push({ id: 'ready', icon: Sparkles, label: 'Ready to sell', tone: 'positive' });
  }

  return chips;
}

export function offersInsights(bundles: Bundle[], items: StockItem[]): InsightChip[] {
  const chips: InsightChip[] = [];

  const onSale = bundles.filter((b) => b.onSale);
  if (onSale.length > 0) {
    chips.push({ id: 'onsale', icon: Tag, label: `${onSale.length} on sale`, tone: 'positive' });
  }

  const agingNotBundled = items.filter(
    (i) => i.aging && !i.soldOut && !bundles.some((b) => b.itemIds.includes(i.id))
  );
  if (agingNotBundled.length > 0) {
    chips.push({
      id: 'unbundled',
      icon: Clock,
      label: `${agingNotBundled.length} aging, not bundled yet`,
      tone: 'warning',
    });
  }

  if (chips.length === 0 && bundles.length > 0) {
    chips.push({ id: 'stable', icon: TrendingUp, label: 'Offers look good', tone: 'positive' });
  }

  return chips;
}

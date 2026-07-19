import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Clock, PackageX, TrendingUp, TrendingDown, ShoppingBag, Tag, Sparkles } from 'lucide-react';
import type { StockItem, Bundle, CartLine, Sale } from './types';
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

/**
 * Forecasting signals — added after direct pilot feedback: a solo
 * micro-entrepreneur carries every role (buying, selling, forecasting) at
 * once, with no time to specialise in any of them, while social-commerce
 * channels can quietly cut off a sales stream overnight through algorithm
 * changes nobody outside the platform can see. She can't be shown what the
 * algorithm is doing — nobody can. What she CAN be shown, transparently, is
 * her own sales history: which channel she's quietly become dependent on,
 * and which items are moving faster or slower than the stock around them.
 * Every signal here is a plain calculation over data she already logged —
 * no external data, no black box, same principle as the AiBadge label.
 */

const CHANNEL_CONCENTRATION_THRESHOLD = 60;
const MIN_SALES_FOR_CHANNEL_SIGNAL = 3;
const RECENT_WINDOW_DAYS = 7;
const FAST_MOVER_SELL_THROUGH = 0.5;
const MIN_RECENT_SALES_FOR_FAST_MOVER = 2;
const SLOW_MOVER_STALE_DAYS = 14;

function channelConcentrationInsight(sales: Sale[]): InsightChip | undefined {
  if (sales.length < MIN_SALES_FOR_CHANNEL_SIGNAL) return undefined;

  const revenueByChannel = new Map<string, number>();
  let totalRevenue = 0;
  for (const sale of sales) {
    if (!sale.channelName) continue;
    revenueByChannel.set(sale.channelName, (revenueByChannel.get(sale.channelName) ?? 0) + sale.total);
    totalRevenue += sale.total;
  }
  if (totalRevenue <= 0) return undefined;

  let topChannel = '';
  let topAmount = 0;
  for (const [channel, amount] of revenueByChannel) {
    if (amount > topAmount) {
      topAmount = amount;
      topChannel = channel;
    }
  }
  const share = Math.round((topAmount / totalRevenue) * 100);
  if (share < CHANNEL_CONCENTRATION_THRESHOLD) return undefined;

  return {
    id: 'channel-concentration',
    icon: AlertTriangle,
    label: `${share}% of sales via ${topChannel}`,
    tone: 'warning',
  };
}

function fastMoverInsight(items: StockItem[], sales: Sale[]): InsightChip | undefined {
  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 86400000;
  const recentSoldByItem = new Map<string, number>();
  for (const sale of sales) {
    if (sale.date < cutoff) continue;
    for (const line of sale.lines) {
      recentSoldByItem.set(line.itemId, (recentSoldByItem.get(line.itemId) ?? 0) + line.quantity);
    }
  }

  let bestItem: StockItem | undefined;
  let bestRatio = 0;
  for (const item of items) {
    if (item.soldOut) continue;
    const recentSold = recentSoldByItem.get(item.id) ?? 0;
    if (recentSold < MIN_RECENT_SALES_FOR_FAST_MOVER) continue;
    const ratio = recentSold / (recentSold + item.quantity);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestItem = item;
    }
  }
  if (!bestItem || bestRatio < FAST_MOVER_SELL_THROUGH) return undefined;

  return {
    id: 'fast-mover',
    icon: TrendingUp,
    label: `${bestItem.name} selling fast — restock soon?`,
    tone: 'info',
  };
}

function slowMoverInsight(items: StockItem[], sales: Sale[]): InsightChip | undefined {
  const now = Date.now();
  let staleItem: StockItem | undefined;
  let staleDays = 0;

  for (const item of items) {
    if (item.soldOut || item.quantity <= 0) continue;
    const hasSold = sales.some((s) => s.lines.some((l) => l.itemId === item.id));
    if (hasSold) continue;
    const days = Math.floor((now - item.createdAt) / 86400000);
    if (days >= SLOW_MOVER_STALE_DAYS && days > staleDays) {
      staleDays = days;
      staleItem = item;
    }
  }
  if (!staleItem) return undefined;

  return {
    id: 'slow-mover',
    icon: TrendingDown,
    label: `${staleItem.name}: no sales in ${staleDays} days`,
    tone: 'danger',
  };
}

export function stockInsights(items: StockItem[], sales: Sale[] = []): InsightChip[] {
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

  const channelChip = channelConcentrationInsight(sales);
  if (channelChip) chips.push(channelChip);

  const fastMoverChip = fastMoverInsight(items, sales);
  if (fastMoverChip) chips.push(fastMoverChip);

  const slowMoverChip = slowMoverInsight(items, sales);
  if (slowMoverChip) chips.push(slowMoverChip);

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

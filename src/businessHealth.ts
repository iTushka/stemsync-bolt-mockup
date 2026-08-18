import type { AdSpendEntry, Customer, FixedCostEntry, OwedEntry, Sale, StockItem } from './types';
import { computeEarnings } from './earnings';
import { windowMarginPct } from './insights';

/**
 * "Business health" (tuvara-nyckeltal-analys.md) — plain-language versions
 * of ROI, Revenue Run Rate, aggregate margin, ROAS-lite, a simplified
 * Working Capital, and the classic Break-Even Point, all computed from
 * data already in the app (or the three small new logs — AdSpendEntry,
 * OwedEntry, FixedCostEntry — that mirror the বাকি pattern). Nothing here
 * guesses a number the seller hasn't logged herself; every function
 * returns null/undefined rather than a fabricated figure when there isn't
 * enough data yet, same discipline as forecast.ts and insights.ts.
 */

const MIN_SALES_FOR_RUN_RATE = 3;

export interface RoiSummary {
  windowDays: number;
  cost: number;
  profit: number;
  /** null when there's no known cost to divide by yet (e.g. no sales, or
   *  every sold item's cost is unknown because it's no longer in stock). */
  roiPct: number | null;
}

/** Return on Investment — profit ÷ cost, not profit ÷ revenue (that's
 *  margin, a related but different question — see the doc). Reuses
 *  computeEarnings' revenue/cost/profit rather than re-deriving them. */
export function computeROI(sales: Sale[], items: StockItem[], windowDays: number): RoiSummary {
  const { knownCost, profit } = computeEarnings(sales, items, windowDays);
  return {
    windowDays,
    cost: knownCost,
    profit,
    roiPct: knownCost > 0 ? Math.round((profit / knownCost) * 1000) / 10 : null,
  };
}

export interface RunRateSummary {
  windowDays: number;
  periodRevenue: number;
  saleCount: number;
  monthlyPace: number;
  annualPace: number;
}

/** Revenue Run Rate — "at this pace, roughly X per month/year". Requires
 *  at least MIN_SALES_FOR_RUN_RATE sales in the window, otherwise a single
 *  unusually large or small sale would produce a wildly misleading
 *  extrapolation — same "don't show on too little data" discipline as
 *  marginTrendInsight in insights.ts. */
export function computeRunRate(sales: Sale[], items: StockItem[], windowDays: number): RunRateSummary | null {
  const { revenue, saleCount } = computeEarnings(sales, items, windowDays);
  if (saleCount < MIN_SALES_FOR_RUN_RATE) return null;
  return {
    windowDays,
    periodRevenue: revenue,
    saleCount,
    monthlyPace: revenue * (30 / windowDays),
    annualPace: revenue * (365 / windowDays),
  };
}

/** Aggregate margin % for the window — the single "your overall margin
 *  right now" figure `EarningsStrip`/per-item margin never quite show.
 *  Delegates to insights.ts' windowMarginPct so there's exactly one place
 *  this calculation lives. */
export function computeAggregateMargin(sales: Sale[], items: StockItem[], windowDays: number): number | undefined {
  const now = Date.now();
  return windowMarginPct(sales, items, now - windowDays * 86400000, now);
}

export interface ChannelRoas {
  channelName: string;
  spend: number;
  revenue: number;
  /** null when spend is logged but revenue on that channel is 0 in the
   *  window — still worth showing (as "no matching sales yet"), just not
   *  as a ratio. */
  roas: number | null;
}

/**
 * ROAS-lite — correlates ad spend and revenue *on the same channel name,
 * in the same window*, because Tuvara has no click tracking or per-sale ad
 * attribution (no external data, by design). This is a rough directional
 * signal ("does spending on this channel roughly line up with sales
 * through it"), not precise per-sale ROAS — always label it that way in
 * the UI, never as an exact number.
 */
export function computeChannelRoas(sales: Sale[], adSpend: AdSpendEntry[], windowDays: number): ChannelRoas[] {
  const cutoff = Date.now() - windowDays * 86400000;

  const spendByChannel = new Map<string, number>();
  for (const entry of adSpend) {
    if (entry.loggedAt < cutoff) continue;
    const key = entry.channelName.trim().toLowerCase();
    if (!key) continue;
    spendByChannel.set(key, (spendByChannel.get(key) ?? 0) + entry.amount);
  }
  if (spendByChannel.size === 0) return [];

  const revenueByChannel = new Map<string, number>();
  for (const sale of sales) {
    if (sale.date < cutoff || !sale.channelName) continue;
    const key = sale.channelName.trim().toLowerCase();
    revenueByChannel.set(key, (revenueByChannel.get(key) ?? 0) + sale.total);
  }

  // Preserve the seller's own capitalisation for display — pick the most
  // recent logged entry's spelling for each channel key.
  const displayNameByKey = new Map<string, string>();
  for (const entry of [...adSpend].sort((a, b) => b.loggedAt - a.loggedAt)) {
    const key = entry.channelName.trim().toLowerCase();
    if (!displayNameByKey.has(key)) displayNameByKey.set(key, entry.channelName.trim());
  }

  const results: ChannelRoas[] = [];
  for (const [key, spend] of spendByChannel) {
    const revenue = revenueByChannel.get(key) ?? 0;
    results.push({
      channelName: displayNameByKey.get(key) ?? key,
      spend,
      revenue,
      roas: revenue > 0 && spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null,
    });
  }
  return results.sort((a, b) => b.spend - a.spend);
}

export interface WorkingCapitalLite {
  /** Stock value + outstanding বাকি (money customers owe her) — the
   *  closest honest reading of "current assets" Tuvara's data supports. */
  assets: number;
  /** Outstanding OwedEntry amounts — what she owes someone else. */
  liabilities: number;
  net: number;
}

/** A simplified Working Capital figure — deliberately not the textbook
 *  ratio (see the doc's open question #2: no formal "current liabilities"
 *  categorisation, just a flat "what I owe" list mirroring বাকি). Always
 *  shown as a plain difference, never a ratio, and always paired with the
 *  reminder that stock isn't liquid cash. */
export function computeWorkingCapitalLite(
  items: StockItem[],
  customers: Customer[],
  owed: OwedEntry[]
): WorkingCapitalLite {
  const stockValue = items.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0);
  const outstandingDebts = customers.reduce(
    (sum, c) => sum + c.debts.filter((d) => !d.settledAt).reduce((s, d) => s + d.amount, 0),
    0
  );
  const liabilities = owed.filter((o) => !o.settledAt).reduce((sum, o) => sum + o.amount, 0);
  const assets = stockValue + outstandingDebts;
  return { assets, liabilities, net: assets - liabilities };
}

export interface ClassicBreakEven {
  weeklyFixedCosts: number;
  /** Average (salePrice − purchasePrice) over currently sellable items —
   *  "contribution margin per unit" in the textbook formula. */
  contributionPerUnit: number;
  /** null when there's no positive contribution margin to divide by. */
  unitsPerWeek: number | null;
}

const WEEKS_PER_MONTH = 52 / 12;

/** The classic Break-Even Point from the formula sheet — "how many sales
 *  per week to cover your ongoing fixed costs" — deliberately named and
 *  computed separately from the existing stock break-even in earnings.ts
 *  (`breakEvenUnits`, "how many sales to recover money tied up in stock
 *  right now"). Same word, two different real questions — never conflate
 *  them in UI copy. Returns null (not zero) when no fixed costs have been
 *  logged yet, so an empty list reads as "not set up" rather than "0". */
export function computeClassicBreakEven(fixedCosts: FixedCostEntry[], items: StockItem[]): ClassicBreakEven | null {
  if (fixedCosts.length === 0) return null;

  const weeklyFixedCosts = fixedCosts.reduce(
    (sum, c) => sum + (c.cadence === 'week' ? c.amount : c.amount / WEEKS_PER_MONTH),
    0
  );

  const sellable = items.filter((i) => !i.soldOut && i.salePrice > 0);
  const contributionPerUnit =
    sellable.length > 0
      ? sellable.reduce((sum, i) => sum + (i.salePrice - i.purchasePrice), 0) / sellable.length
      : 0;

  return {
    weeklyFixedCosts,
    contributionPerUnit,
    unitsPerWeek: contributionPerUnit > 0 ? Math.ceil(weeklyFixedCosts / contributionPerUnit) : null,
  };
}

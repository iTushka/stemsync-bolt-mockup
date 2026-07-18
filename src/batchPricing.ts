/**
 * Solves two related pain points reported directly from the Flowertot
 * pilot: plants are often bought as a tray or batch at one total price
 * (not itemised per plant), and individual plants within that batch vary
 * enough in size/quality that they need different sale prices — which
 * today means manual arithmetic every time stock comes in.
 *
 * Nothing here talks to the network or an AI model. It's the same kind of
 * heuristic, transparent calculation as parse.ts and the margin threshold
 * — a number the seller can see the working for, not a black box.
 */

export interface BatchInput {
  totalCost: number;
  trays: number;
  piecesPerTray: number;
}

/** How many individual units a batch/tray purchase works out to. */
export function totalUnitsFromBatch(input: BatchInput): number {
  const units = input.trays * input.piecesPerTray;
  return Number.isFinite(units) && units > 0 ? Math.round(units) : 0;
}

/** Cost per single plant, derived from the total paid for the whole batch. */
export function unitCostFromBatch(input: BatchInput): number {
  const units = totalUnitsFromBatch(input);
  if (units <= 0 || !Number.isFinite(input.totalCost) || input.totalCost <= 0) return 0;
  return Math.round((input.totalCost / units) * 100) / 100;
}

/** Sensible markup range for houseplant resale — matches what Flowertot
 *  already uses in practice (cost x2.5 at the low end, x5 for rarer or
 *  larger specimens). DEFAULT_MARKUP is the starting suggestion; every
 *  suggested price stays fully editable. */
export const MIN_MARKUP = 2.5;
export const MAX_MARKUP = 5;
export const DEFAULT_MARKUP = 3;

export function suggestSalePrice(purchasePrice: number, markup: number): number {
  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return 0;
  if (!Number.isFinite(markup) || markup <= 0) return 0;
  return Math.round(purchasePrice * markup * 100) / 100;
}

export interface QualityTier {
  id: string;
  label: string;
  quantity: number;
  markup: number;
}

/**
 * A starting split for "this batch isn't uniform" — three named tiers with
 * ascending markup, quantities divided evenly across the batch total. This
 * is only ever a first draft: every field (label, quantity, markup) is
 * meant to be edited to match what's actually in front of the seller.
 */
export function createDefaultTiers(totalQuantity: number): QualityTier[] {
  if (totalQuantity <= 0) {
    return [
      { id: 'small', label: 'Small', quantity: 0, markup: 2.5 },
      { id: 'standard', label: 'Standard', quantity: 0, markup: 3 },
      { id: 'premium', label: 'Premium', quantity: 0, markup: 4 },
    ];
  }
  const third = Math.floor(totalQuantity / 3);
  const remainder = totalQuantity - third * 2;
  return [
    { id: 'small', label: 'Small', quantity: third, markup: 2.5 },
    { id: 'standard', label: 'Standard', quantity: third, markup: 3 },
    { id: 'premium', label: 'Premium', quantity: remainder, markup: 4 },
  ];
}

export function tierQuantityTotal(tiers: QualityTier[]): number {
  return tiers.reduce((sum, t) => sum + (Number.isFinite(t.quantity) ? t.quantity : 0), 0);
}

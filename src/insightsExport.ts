import type { FixedCostEntry, Sale, StockItem, VariableCostEntry } from './types';
import { margin } from './types';
import { vatPortionOfPrice } from './vat';
import type { InsightsSummary } from './businessHealth';

/**
 * CSV export for Insights (Owner-only) —
 * tuvara-app-personal-moms-butiker-kostnader-insights-analys.md punkt 5.
 * Modelled on Flowertot Florist's Friend's StockDataTools.tsx (two files:
 * a stock CSV and a sales CSV), rebuilt with Tuvara's own columns rather
 * than copying theirs verbatim. Plain client-side download — no backend,
 * matching how exportTenantData() already works in usePersistentState.ts.
 */

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Current-state snapshot of the stock list — one row per item. */
export function exportStockCsv(items: StockItem[], pilotSlug: string): void {
  const header = ['Name', 'Category', 'Shop', 'Quantity', 'Purchase price', 'Sale price', 'Margin %', 'Sold out'];
  const rows = items.map((i) => [
    i.name,
    i.category,
    i.shop ?? '',
    i.quantity,
    i.purchasePrice,
    i.salePrice,
    margin(i.purchasePrice, i.salePrice),
    i.soldOut ? 'Yes' : 'No',
  ]);
  downloadCsv(`tuvara-${pilotSlug}-stock-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
}

/** Every sale line within the current Insights period, plus a short
 *  summary block (fixed/variable costs for the same period, and the VAT
 *  portion of total revenue when Settings' VAT toggle is on) appended
 *  after a blank row — same "one file, not scattered reports" idea as
 *  Flowertot's sales CSV, adapted with Tuvara's own fields (punkt 2 and
 *  punkt 4). */
export function exportSalesCsv(
  sales: Sale[],
  summary: InsightsSummary,
  fixedCosts: FixedCostEntry[],
  variableCosts: VariableCostEntry[],
  vatEnabled: boolean,
  vatRatePct: number | undefined,
  pilotSlug: string
): void {
  const cutoff = Date.now() - summary.windowDays * 86400000;
  const inWindow = sales.filter((s) => s.date >= cutoff);

  const header = ['Date', 'Order', 'Item', 'Quantity', 'Unit price', 'Line total', 'Channel', 'Sold via'];
  const rows: (string | number)[][] = [];
  for (const sale of inWindow) {
    const dateLabel = new Date(sale.date).toISOString().slice(0, 10);
    for (const line of sale.lines) {
      rows.push([
        dateLabel,
        sale.id,
        line.name,
        line.quantity,
        line.unitPrice,
        line.unitPrice * line.quantity,
        sale.channelName ?? '',
        sale.customerId ? 'Recognised customer' : '',
      ]);
    }
  }

  rows.push([]);
  rows.push(['Summary', `Period: ${summary.period}`]);
  rows.push(['Revenue', summary.revenue.toFixed(2)]);
  rows.push(['Cost of goods', summary.costOfGoods.toFixed(2)]);
  rows.push(['Fixed costs', summary.fixedCosts.toFixed(2)]);
  rows.push(['One-off (variable) costs', summary.variableCosts.toFixed(2)]);
  rows.push(['Actual profit', summary.profit.toFixed(2)]);
  if (vatEnabled && vatRatePct) {
    rows.push([`Of which VAT (${vatRatePct}%, in revenue)`, vatPortionOfPrice(summary.revenue, vatRatePct).toFixed(2)]);
  }
  // Fixed/variable cost lines themselves, for a full audit trail alongside
  // the summary totals above.
  if (fixedCosts.length > 0) {
    rows.push([]);
    rows.push(['Fixed costs (all logged, not just this period)']);
    rows.push(['Label', 'Amount', 'Per']);
    fixedCosts.forEach((c) => rows.push([c.label, c.amount, c.cadence]));
  }
  if (variableCosts.length > 0) {
    rows.push([]);
    rows.push(['One-off costs (all logged, not just this period)']);
    rows.push(['Label', 'Amount', 'Date']);
    variableCosts.forEach((c) => rows.push([c.label, c.amount, new Date(c.loggedAt).toISOString().slice(0, 10)]));
  }

  downloadCsv(`tuvara-${pilotSlug}-sales-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
}

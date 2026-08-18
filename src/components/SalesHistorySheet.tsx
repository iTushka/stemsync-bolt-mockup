import { Receipt } from 'lucide-react';
import { Sheet } from './Sheet';
import type { Customer, Sale } from '../types';

interface SalesHistorySheetProps {
  open: boolean;
  onClose: () => void;
  sales: Sale[];
  customers: Customer[];
  currencySymbol: string;
}

function dateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Read-only order history — see tuvara-quote-card-analys.md P2 item 3.
 * `Sale` data was already being recorded on every completed sale
 * (App.tsx's handleCompleteSale), but nothing in the UI ever surfaced it
 * again afterwards. This is deliberately just a list, not an editor —
 * a completed sale is a one-way record, same principle as a settled
 * customer debt (CustomerDebtsSheet) never being un-settled.
 */
export function SalesHistorySheet({
  open,
  onClose,
  sales,
  customers,
  currencySymbol,
}: SalesHistorySheetProps) {
  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Recent sales</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar">
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Receipt size={40} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">No completed sales yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sales.map((sale) => {
              const customerName = sale.customerId
                ? customers.find((c) => c.id === sale.customerId)?.name
                : undefined;
              return (
                <div
                  key={sale.id}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400">{dateLabel(sale.date)}</span>
                    <span className="text-sm font-bold text-stone-900">
                      {sale.total} {currencySymbol}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {sale.lines.map((line, i) => (
                      <div key={i} className="text-xs text-stone-600 truncate">
                        {line.quantity} × {line.name}
                      </div>
                    ))}
                  </div>
                  {(sale.channelName || customerName) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sale.channelName && (
                        <span className="px-2 py-0.5 rounded-full bg-cream-100 text-[11px] font-medium text-stone-500">
                          {sale.channelName}
                        </span>
                      )}
                      {customerName && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-50 text-[11px] font-medium text-accent-700">
                          {customerName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

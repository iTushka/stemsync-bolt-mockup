import { useMemo } from 'react';
import { Users, AlertTriangle, Copy } from 'lucide-react';
import { Sheet } from './Sheet';
import type { Customer, Sale } from '../types';

interface CustomersSheetProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  sales: Sale[];
}

const INACTIVE_DAYS = 14;
const VERY_INACTIVE_DAYS = 30;

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizedPhone(phone?: string): string | undefined {
  const digits = (phone ?? '').replace(/[^\d]/g, '');
  return digits.length > 0 ? digits : undefined;
}

interface CustomerRow {
  customer: Customer;
  lastSaleAt: number | undefined;
  duplicateOfNames: string[];
}

/**
 * CRM duplicate-contact and inactivity flags (tuvara-visuell-lonsamhet-
 * analys.md, avsnitt 6) — computed purely from the customers/sales already
 * in the app, no backend, no new data collection. Two customers are flagged
 * as possible duplicates only when their name or phone number matches
 * exactly (after trimming/normalising) — this is deliberately a "looks
 * similar, check yourself" flag, never an automatic merge: Tuvara doesn't
 * have a concept of merging two customer records, and silently combining
 * them could lose a বাকি entry or a phone number. "Inactive" only ever
 * applies to a customer who has bought at least once before — a customer
 * who's never bought anything isn't "inactive", she just hasn't started.
 */
function buildCustomerRows(customers: Customer[], sales: Sale[]): CustomerRow[] {
  const lastSaleByCustomerId = new Map<string, number>();
  for (const sale of sales) {
    if (!sale.customerId) continue;
    const prev = lastSaleByCustomerId.get(sale.customerId);
    if (prev === undefined || sale.date > prev) lastSaleByCustomerId.set(sale.customerId, sale.date);
  }

  const byName = new Map<string, Customer[]>();
  const byPhone = new Map<string, Customer[]>();
  for (const c of customers) {
    const nameKey = normalizedName(c.name);
    if (nameKey) byName.set(nameKey, [...(byName.get(nameKey) ?? []), c]);
    const phoneKey = normalizedPhone(c.phone);
    if (phoneKey) byPhone.set(phoneKey, [...(byPhone.get(phoneKey) ?? []), c]);
  }

  return customers.map((customer) => {
    const nameMatches = byName.get(normalizedName(customer.name)) ?? [];
    const phoneKey = normalizedPhone(customer.phone);
    const phoneMatches = phoneKey ? byPhone.get(phoneKey) ?? [] : [];
    const duplicates = new Set<string>();
    for (const other of [...nameMatches, ...phoneMatches]) {
      if (other.id !== customer.id) duplicates.add(other.name);
    }
    return {
      customer,
      lastSaleAt: lastSaleByCustomerId.get(customer.id),
      duplicateOfNames: Array.from(duplicates),
    };
  });
}

function daysAgo(ts: number): number {
  return Math.floor((Date.now() - ts) / 86400000);
}

export function CustomersSheet({ open, onClose, customers, sales }: CustomersSheetProps) {
  const rows = useMemo(() => buildCustomerRows(customers, sales), [customers, sales]);
  // Most-recently-added first, matching how `customers` itself is already
  // stored (prepend convention) — not sorted by activity, so this stays a
  // stable, predictable list rather than jumping around as sales come in.
  const sorted = [...rows].sort((a, b) => b.customer.addedAt - a.customer.addedAt);

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center gap-2 px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Customers</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-1.5">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={36} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm max-w-[240px]">
              No customers yet — add one from the QR menu.
            </p>
          </div>
        ) : (
          sorted.map(({ customer, lastSaleAt, duplicateOfNames }) => {
            const idleDays = lastSaleAt !== undefined ? daysAgo(lastSaleAt) : undefined;
            const veryInactive = idleDays !== undefined && idleDays >= VERY_INACTIVE_DAYS;
            const inactive = idleDays !== undefined && idleDays >= INACTIVE_DAYS && !veryInactive;

            return (
              <div key={customer.id} className="rounded-xl border border-stone-200 bg-white px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-800 truncate">{customer.name}</div>
                    <div className="text-xs text-stone-400">
                      {idleDays === undefined
                        ? 'No purchases logged yet'
                        : `Last bought ${idleDays === 0 ? 'today' : `${idleDays}d ago`}`}
                    </div>
                  </div>
                  {(veryInactive || inactive) && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        veryInactive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {veryInactive ? `${VERY_INACTIVE_DAYS}+ days quiet` : `${INACTIVE_DAYS}+ days quiet`}
                    </span>
                  )}
                </div>
                {duplicateOfNames.length > 0 && (
                  <div className="mt-1.5 flex items-start gap-1 text-[11px] text-accent-600">
                    <Copy size={12} className="shrink-0 mt-0.5" />
                    <span>
                      Might be the same as {duplicateOfNames.join(', ')} — same name or number, check
                      before treating them as different people.
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
        {sorted.length > 0 && (
          <p className="pt-2 flex items-start gap-1.5 text-[11px] text-stone-400 leading-snug">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            Duplicate and inactivity flags are just a nudge from matching names/numbers and purchase
            dates already in Tuvara — nothing is merged or hidden automatically.
          </p>
        )}
      </div>
    </Sheet>
  );
}

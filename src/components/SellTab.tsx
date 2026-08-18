import { useMemo, useState } from 'react';
import { Search, ShoppingBag, Tag, Users } from 'lucide-react';
import type { StockItem, Bundle, CartLine, Customer } from '../types';
import { HeaderIconButtons } from './HeaderIconButtons';
import type { MenuItem } from './HeaderIconButtons';
import { InsightBar } from './InsightBar';
import { sellInsights } from '../insights';

interface SellTabProps {
  items: StockItem[];
  bundles: Bundle[];
  currencySymbol: string;
  cart: CartLine[];
  onAdd: (kind: 'item' | 'bundle', refId: string, name: string, unitPrice: number) => void;
  customers: Customer[];
  onGetWhatsAppCard: () => void;
  onAddCustomer: () => void;
  onOpenSettings: () => void;
  /** Optional "..." menu — see SalesHistorySheet / tuvara-quote-card-analys.md
   *  P2 item 3. Omitted entirely on tabs that don't need it. */
  moreMenuItems?: MenuItem[];
}

function cartQtyFor(cart: CartLine[], kind: 'item' | 'bundle', refId: string): number {
  return cart.find((l) => l.kind === kind && l.refId === refId)?.quantity ?? 0;
}

// How many units of a given stock item are already spoken for by the
// current cart — either bought directly, or as part of any bundle in the
// cart (including other units of the same bundle). Needed so a bundle's
// availability accounts for stock already reserved by what's already in
// the cart, not just the raw stock number.
function consumedQuantityForItem(cart: CartLine[], bundles: Bundle[], itemId: string): number {
  let consumed = 0;
  for (const line of cart) {
    if (line.kind === 'item' && line.refId === itemId) {
      consumed += line.quantity;
    } else if (line.kind === 'bundle') {
      const bundle = bundles.find((b) => b.id === line.refId);
      if (bundle?.itemIds.includes(itemId)) consumed += line.quantity;
    }
  }
  return consumed;
}

/**
 * Bug fix — see tuvara-offers-analys.md P0 item 2. A bundle button used to
 * never disable, regardless of whether the items it's made of actually had
 * any stock left — combined with the (also now fixed) missing stock
 * decrement on bundle sales, that made overselling easy to hit by accident.
 * True if any item the bundle is made of has none left once the current
 * cart's reservations are accounted for, or no longer exists in stock.
 */
function bundleUnavailable(
  bundle: Bundle,
  items: StockItem[],
  cart: CartLine[],
  bundles: Bundle[]
): boolean {
  return bundle.itemIds.some((itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return true;
    return item.quantity - consumedQuantityForItem(cart, bundles, itemId) <= 0;
  });
}

function daysAgo(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function SellTab({
  items,
  bundles,
  currencySymbol,
  cart,
  onAdd,
  customers,
  onGetWhatsAppCard,
  onAddCustomer,
  onOpenSettings,
  moreMenuItems,
}: SellTabProps) {
  const [search, setSearch] = useState('');

  const sellableItems = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );
  // Bug fix — see tuvara-offers-analys.md P0 item 3. `onSale` used to be
  // purely cosmetic (only controlled a badge) — a seller unchecking "Mark
  // as active sale" in the offer editor expected that to actually pause
  // it, but the bundle stayed fully purchasable regardless. Now it does
  // what it looks like it does: unchecked bundles are hidden from Sell,
  // same as OffersTab still shows them (marked accordingly) for management.
  const sellableBundles = useMemo(
    () => bundles.filter((b) => b.onSale && b.name.toLowerCase().includes(search.toLowerCase())),
    [bundles, search]
  );

  const nothingFound = sellableItems.length === 0 && sellableBundles.length === 0;

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur-md px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Sell</h1>
          <HeaderIconButtons
            onGetWhatsAppCard={onGetWhatsAppCard}
            onAddCustomer={onAddCustomer}
            onOpenSettings={onOpenSettings}
            moreMenuItems={moreMenuItems}
          />
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items or bundles…"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition"
          />
        </div>
      </div>

      <InsightBar chips={sellInsights(items, cart, currencySymbol)} />

      <div className="px-4 pt-1">
        {nothingFound ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag size={40} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">Nothing matches "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sellableBundles.map((bundle) => {
              const disabled = bundleUnavailable(bundle, items, cart, bundles);
              return (
                <button
                  key={`bundle-${bundle.id}`}
                  onClick={() => onAdd('bundle', bundle.id, bundle.name, bundle.bundlePrice)}
                  disabled={disabled}
                  className={`text-left bg-white rounded-2xl shadow-card overflow-hidden transition ${
                    disabled
                      ? 'opacity-40 grayscale cursor-not-allowed'
                      : 'hover:shadow-cardHover active:scale-[0.98]'
                  }`}
                >
                  <div className="relative aspect-square bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                    <Tag size={28} className="text-red-300" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase">
                      Bundle
                    </span>
                    {cartQtyFor(cart, 'bundle', bundle.id) > 0 && (
                      <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-bold text-white">
                        {cartQtyFor(cart, 'bundle', bundle.id)}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-stone-900 leading-tight truncate">
                      {bundle.name}
                    </h3>
                    <div className="mt-1.5 text-xs text-stone-400">
                      {disabled ? 'Not enough stock' : ' '}
                    </div>
                    <div className="mt-1 text-sm font-bold text-stone-900">
                      {bundle.bundlePrice} {currencySymbol}
                    </div>
                  </div>
                </button>
              );
            })}

            {sellableItems.map((item) => {
              const inCart = cartQtyFor(cart, 'item', item.id);
              const available = item.quantity - inCart;
              const disabled = item.soldOut || available <= 0;
              return (
                <button
                  key={item.id}
                  onClick={() => onAdd('item', item.id, item.name, item.salePrice)}
                  disabled={disabled}
                  className={`text-left bg-white rounded-2xl shadow-card overflow-hidden transition ${
                    disabled
                      ? 'opacity-40 grayscale cursor-not-allowed'
                      : 'hover:shadow-cardHover active:scale-[0.98]'
                  }`}
                >
                  <div className="relative aspect-square bg-gradient-to-br from-cream-100 to-stone-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-light text-stone-300">
                          {item.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {inCart > 0 && (
                      <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-bold text-white">
                        {inCart}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-stone-900 leading-tight truncate">
                      {item.name}
                    </h3>
                    <div className="mt-1.5 text-xs text-stone-400">
                      {disabled ? 'Out of stock' : `${available} left`}
                    </div>
                    <div className="mt-1 text-sm font-bold text-stone-900">
                      {item.salePrice} {currencySymbol}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {customers.length > 0 && (
          <div className="mt-8">
            <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
              <Users size={14} /> Recognised customers
            </div>
            <div className="space-y-1.5">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                >
                  <span className="text-sm font-semibold text-stone-800">{c.name}</span>
                  <span className="text-xs text-stone-400">Added {daysAgo(c.addedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

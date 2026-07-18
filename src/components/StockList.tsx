import { useState } from 'react';
import { MoreHorizontal, Search, SlidersHorizontal, Plus, Clock, Package2, QrCode, Settings as SettingsIcon } from 'lucide-react';
import type { StockItem } from '../types';
import { margin } from '../types';

interface StockListProps {
  items: StockItem[];
  activeCount: number;
  activeFilterCount: number;
  onSearch: (q: string) => void;
  onOpenFilters: () => void;
  onAdd: () => void;
  onGetWhatsAppCard: () => void;
  onAddCustomer: () => void;
  onOpenSettings: () => void;
  currencySymbol: string;
}

export function StockList({
  items,
  activeCount,
  activeFilterCount,
  onSearch,
  onOpenFilters,
  onAdd,
  onGetWhatsAppCard,
  onAddCustomer,
  onOpenSettings,
  currencySymbol,
}: StockListProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrMenuOpen, setQrMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Export', onClick: () => setMenuOpen(false) },
    { label: 'Import', onClick: () => setMenuOpen(false) },
    { label: 'Saved weekly lists', onClick: () => setMenuOpen(false) },
  ];

  const qrMenuItems = [
    {
      label: 'Share my card',
      onClick: () => {
        setQrMenuOpen(false);
        onGetWhatsAppCard();
      },
    },
    {
      label: 'Add a customer',
      onClick: () => {
        setQrMenuOpen(false);
        onAddCustomer();
      },
    },
  ];

  return (
    <div className="relative min-h-screen pb-24">
      {/* Row 1: Title bar */}
      <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Stock</h1>
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
              {activeCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setQrMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200/60 active:scale-95 transition"
                aria-label="WhatsApp card"
              >
                <QrCode size={20} />
              </button>
              {qrMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setQrMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-52 bg-white rounded-2xl shadow-cardHover py-1.5 animate-scaleIn origin-top-right">
                    {qrMenuItems.map(({ label, onClick }) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-cream-100 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200/60 active:scale-95 transition"
              aria-label="Settings"
            >
              <SettingsIcon size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200/60 active:scale-95 transition"
                aria-label="More options"
              >
                <MoreHorizontal size={22} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-52 bg-white rounded-2xl shadow-cardHover py-1.5 animate-scaleIn origin-top-right">
                    {menuItems.map(({ label, onClick }) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-cream-100 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Search + Filter */}
      <div className="sticky top-[52px] z-10 bg-cream-50/95 backdrop-blur-md px-4 pb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search stock…"
              onChange={(e) => onSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition"
            />
          </div>
          <button
            onClick={onOpenFilters}
            className="h-11 px-4 rounded-full bg-white border border-stone-200 flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:border-accent-300 active:scale-95 transition"
          >
            <SlidersHorizontal size={16} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-accent-500 text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Grid of cards */}
      <div className="px-4 pt-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package2 size={40} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">No items match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <StockCard key={item.id} item={item} currencySymbol={currencySymbol} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAdd}
        className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-accent-500 text-white shadow-fab flex items-center justify-center hover:bg-accent-600 active:scale-90 transition"
        aria-label="Add item"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

function StockCard({ item, currencySymbol }: { item: StockItem; currencySymbol: string }) {
  const m = margin(item.purchasePrice, item.salePrice);
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-cardHover transition-shadow">
      <div className="relative aspect-square bg-gradient-to-br from-cream-100 to-stone-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-light text-stone-300">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {item.aging && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-amber-100/95 flex items-center justify-center" title="Aging stock">
            <Clock size={14} className="text-amber-600" />
          </div>
        )}
        {item.soldOut && (
          <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-white/95 text-stone-700 text-xs font-semibold">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-stone-900 leading-tight truncate">{item.name}</h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-block px-2 py-0.5 rounded-full bg-cream-100 text-stone-600 text-[11px] font-medium">
            {item.category}
          </span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <span className="text-lg font-bold text-stone-900">{item.quantity}</span>
            <span className="text-xs text-stone-400 ml-1">pcs</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-stone-900">{item.salePrice} {currencySymbol}</div>
            <div className="text-[10px] text-stone-400">{m}% margin</div>
          </div>
        </div>
      </div>
    </div>
  );
}

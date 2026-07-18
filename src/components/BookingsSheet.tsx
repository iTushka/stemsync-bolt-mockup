import { useState } from 'react';
import { Plus, Calendar, Sparkles, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Sheet } from './Sheet';
import { suggestUpsells } from '../bookingSuggestions';
import type { Booking, StockItem } from '../types';

interface BookingsSheetProps {
  open: boolean;
  onClose: () => void;
  bookings: Booking[];
  items: StockItem[];
  currencySymbol: string;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => void;
  onStartVisit: (booking: Booking) => void;
}

type View = 'list' | 'new' | { prep: Booking };

export function BookingsSheet({
  open,
  onClose,
  bookings,
  items,
  currencySymbol,
  onAddBooking,
  onStartVisit,
}: BookingsSheetProps) {
  const [view, setView] = useState<View>('list');
  const [customerName, setCustomerName] = useState('');
  const [itemId, setItemId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const upcoming = bookings
    .filter((b) => b.status === 'upcoming')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const availableItems = items.filter((i) => !i.soldOut && i.quantity > 0);

  const resetForm = () => {
    setCustomerName('');
    setItemId('');
    setScheduledAt('');
    setNotes('');
  };

  const handleClose = () => {
    setView('list');
    resetForm();
    onClose();
  };

  const handleSaveBooking = () => {
    if (!customerName.trim() || !itemId || !scheduledAt) return;
    onAddBooking({ customerName: customerName.trim(), itemId, scheduledAt, notes: notes.trim() });
    resetForm();
    setView('list');
  };

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center gap-2 px-5 py-2 shrink-0">
        {view !== 'list' && (
          <button
            onClick={() => setView('list')}
            aria-label="Back"
            className="w-8 h-8 -ml-1.5 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="text-lg font-bold text-stone-900">
          {view === 'list' ? 'Bookings' : view === 'new' ? 'New booking' : 'Prepare visit'}
        </h2>
      </div>

      {view === 'list' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar size={36} className="text-stone-300 mb-3" />
              <p className="text-stone-500 text-sm max-w-[220px]">
                No upcoming bookings — log one when a customer reserves an item.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((b) => {
                const item = items.find((i) => i.id === b.itemId);
                return (
                  <button
                    key={b.id}
                    onClick={() => setView({ prep: b })}
                    className="w-full text-left flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3 hover:border-accent-300 transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{b.customerName}</div>
                      <div className="text-xs text-stone-400">
                        {item?.name ?? 'Item removed'} · {b.scheduledAt}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-accent-600">Prepare</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'new' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">Customer name</span>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Priya"
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">Reserved item</span>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="input">
              <option value="">Select an item…</option>
              {availableItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.salePrice} {currencySymbol}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">
              When are they coming?
            </span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wants a large pot too"
              className="input"
            />
          </label>
        </div>
      )}

      {typeof view === 'object' && (
        <VisitPrep
          booking={view.prep}
          items={items}
          currencySymbol={currencySymbol}
          onStartVisit={() => {
            onStartVisit(view.prep);
            setView('list');
            handleClose();
          }}
        />
      )}

      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab flex items-center justify-center gap-1.5 hover:bg-accent-600 active:scale-[0.98] transition"
          >
            <Plus size={17} /> New booking
          </button>
        )}
        {view === 'new' && (
          <button
            onClick={handleSaveBooking}
            disabled={!customerName.trim() || !itemId || !scheduledAt}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
          >
            Save booking
          </button>
        )}
      </div>
    </Sheet>
  );
}

function VisitPrep({
  booking,
  items,
  currencySymbol,
  onStartVisit,
}: {
  booking: Booking;
  items: StockItem[];
  currencySymbol: string;
  onStartVisit: () => void;
}) {
  const bookedItem = items.find((i) => i.id === booking.itemId);
  const suggestions = bookedItem ? suggestUpsells(bookedItem, items) : [];

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-xs font-medium text-stone-400 mb-1">
          {booking.customerName} · {booking.scheduledAt}
        </div>
        <div className="text-base font-bold text-stone-900">
          {bookedItem ? bookedItem.name : 'Item removed'}
        </div>
        {bookedItem && (
          <div className="mt-0.5 text-sm text-stone-500">
            {bookedItem.salePrice} {currencySymbol}
          </div>
        )}
        {booking.notes && (
          <div className="mt-2 text-xs text-stone-500 bg-cream-100 rounded-lg px-2.5 py-1.5">
            {booking.notes}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
            <Sparkles size={13} /> Have these ready too
          </div>
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-800">{s.name}</span>
                  {s.aging && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase">
                      Aging
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-400">
                  {s.salePrice} {currencySymbol}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-stone-400 leading-snug">
            Suggested from aging stock and items in the same category — worth having nearby when
            they visit.
          </p>
        </div>
      )}

      <button
        onClick={onStartVisit}
        className="mt-6 w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab flex items-center justify-center gap-1.5 hover:bg-accent-600 active:scale-[0.98] transition"
      >
        <ShoppingBag size={17} /> Start sale for this visit
      </button>
    </div>
  );
}

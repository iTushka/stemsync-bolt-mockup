import { useMemo, useState } from 'react';
import { Printer, Share2, MessageCircle } from 'lucide-react';
import { Sheet } from './Sheet';
import type { CartLine } from '../types';

interface QuoteCardProps {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  currencySymbol: string;
  businessName: string;
  contactInfo: string;
  onComplete: () => void;
}

function orderNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function QuoteCard({
  open,
  onClose,
  cart,
  currencySymbol,
  businessName,
  contactInfo,
  onComplete,
}: QuoteCardProps) {
  const [discount, setDiscount] = useState('');
  const orderNo = useMemo(() => orderNumber(), [open]);
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    [open]
  );

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discountAmount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const total = subtotal - discountAmount;

  const summaryText = [
    `${businessName} — Order #${orderNo}`,
    dateLabel,
    '',
    ...cart.map((l) => `${l.name}  ${l.quantity} × ${l.unitPrice} ${currencySymbol}`),
    '',
    discountAmount > 0 ? `Discount: -${discountAmount} ${currencySymbol}` : null,
    `Total: ${total} ${currencySymbol}`,
    contactInfo ? `\nContact: ${contactInfo}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: summaryText, title: `${businessName} — Order #${orderNo}` });
      } catch {
        // user cancelled — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(summaryText);
      } catch {
        // clipboard unavailable — silently ignore
      }
    }
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Quote card</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-lg font-bold text-stone-900">{businessName}</h3>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>Order #{orderNo}</span>
            <span>{dateLabel}</span>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-stone-100 pt-3">
            {cart.map((l) => (
              <div key={l.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-stone-800">{l.name}</div>
                  <div className="text-xs text-stone-400">
                    {l.quantity} × {l.unitPrice} {currencySymbol}
                  </div>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {l.quantity * l.unitPrice} {currencySymbol}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-stone-100 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span>{subtotal} {currencySymbol}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{discountAmount} {currencySymbol}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-bold text-stone-900 pt-1">
              <span>Total</span>
              <span>{total} {currencySymbol}</span>
            </div>
          </div>
        </div>

        <label className="block mt-4">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Discount ({currencySymbol})
          </span>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            className="input"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 h-11 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 h-11 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
          >
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button
            onClick={handleShare}
            className="flex-1 h-11 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
          >
            <Share2 size={15} /> Share
          </button>
        </div>
      </div>

      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        <button
          onClick={onComplete}
          disabled={cart.length === 0}
          className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
        >
          Complete sale
        </button>
      </div>
    </Sheet>
  );
}

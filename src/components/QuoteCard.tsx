import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Share2, MessageCircle, Minus, Plus, Trash2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Sheet } from './Sheet';
import type { Bundle, CartLine, Customer, PrintFormat, SocialLink, StockItem } from '../types';
import { margin } from '../types';
import { ReceiptLayout } from './ReceiptLayout';
import { applyPrintFormat } from '../printFormats';
import { shareReceiptImage } from '../receiptImage';

interface QuoteCardProps {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  currencySymbol: string;
  businessName: string;
  contactInfo: string;
  /** Receipt branding — see ReceiptLayout.tsx / Settings' "Receipt
   *  branding" section. All optional; the receipt/image/print still work
   *  fine with none of these set, just plainer. */
  logoUrl?: string;
  website?: string;
  socialLinks?: SocialLink[];
  printFormat?: PrintFormat;
  /** Channels the items in this cart are already listed on — offered as
   *  quick picks so recording where a sale came from costs one tap, not
   *  typing. Optional: leaving it unset is a valid, tracked choice. */
  channelOptions: string[];
  /** Needed only to compute the cost basis behind the margin warning below
   *  — never shown to the customer (kept out of summaryText). See
   *  tuvara-quote-card-analys.md P1 item 1. */
  items: StockItem[];
  bundles: Bundle[];
  /** Recognised customers this sale can (optionally) be linked to — see
   *  tuvara-quote-card-analys.md P2 item 2. */
  customers: Customer[];
  onComplete: (channelName?: string, customerId?: string) => void;
  /** Bug fix — see tuvara-quote-card-analys.md: previously there was no
   *  way to correct a mis-added item or wrong quantity from inside the
   *  Quote card at all. Set to 0/negative removes the line. */
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onRemoveLine: (lineId: string) => void;
  /** Re-inserts an exact previously-removed line — powers the "Undo" toast
   *  after a removal, see tuvara-quote-card-analys.md P2 item "undo". */
  onRestoreLine: (line: CartLine) => void;
  /** B4 (tuvara-bifogade-filer-analys.md) — switches a cart line's unit
   *  price to the item's standing bulk price. Only ever called from an
   *  explicit tap on the suggestion banner below; never applied on its
   *  own just because the threshold was reached. */
  onApplyBulkPrice: (lineId: string, unitPrice: number) => void;
}

function orderNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Cost basis for one cart line, or null if it can't be resolved (e.g. the
 *  underlying stock item was deleted after being added to the cart). For a
 *  bundle, sums the current purchase price of each item it's made of —
 *  Bundle itself carries no separate cost field. Null propagates rather
 *  than being treated as zero, so an unresolvable line hides the margin
 *  warning instead of showing a misleadingly optimistic number — same
 *  "don't guess, leave it out" discipline as parse.ts. */
function lineCost(line: CartLine, items: StockItem[], bundles: Bundle[]): number | null {
  if (line.kind === 'item') {
    const item = items.find((i) => i.id === line.refId);
    return item ? item.purchasePrice * line.quantity : null;
  }
  const bundle = bundles.find((b) => b.id === line.refId);
  if (!bundle) return null;
  let cost = 0;
  for (const itemId of bundle.itemIds) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return null;
    cost += item.purchasePrice;
  }
  return cost * line.quantity;
}

export function QuoteCard({
  open,
  onClose,
  cart,
  currencySymbol,
  businessName,
  contactInfo,
  logoUrl,
  website,
  socialLinks,
  printFormat,
  channelOptions,
  items,
  bundles,
  customers,
  onComplete,
  onUpdateQuantity,
  onRemoveLine,
  onRestoreLine,
  onApplyBulkPrice,
}: QuoteCardProps) {
  const [discount, setDiscount] = useState('');
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [removedLine, setRemovedLine] = useState<CartLine | null>(null);
  const [imageStatus, setImageStatus] = useState<'idle' | 'working' | 'failed'>('idle');
  const undoTimerRef = useRef<number | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const orderNo = useMemo(() => orderNumber(), [open]);
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    [open]
  );

  useEffect(() => {
    if (open) {
      setSelectedChannel(undefined);
      setSelectedCustomerId(undefined);
      setRemovedLine(null);
    }
  }, [open]);

  // Clear any pending undo timer on unmount so it can't fire against a
  // cart that's since moved on (e.g. after a sale completed).
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discountAmount =
    discountMode === 'percent'
      ? Math.min(subtotal, Math.max(0, ((parseFloat(discount) || 0) / 100) * subtotal))
      : Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const total = subtotal - discountAmount;

  // Margin warning — reuses the exact same threshold/colour logic as the
  // "Add item" card (AddSheet.tsx, via the shared `margin()` helper) rather
  // than inventing a second scale. Only shown once a discount is actually
  // applied, since that's the one moment in this flow where "never
  // underprice" can quietly be broken. Owner-facing only — never included
  // in summaryText, which is what gets printed/shared/WhatsApped.
  const costBasis = useMemo(() => {
    let sum = 0;
    for (const l of cart) {
      const c = lineCost(l, items, bundles);
      if (c === null) return null;
      sum += c;
    }
    return sum;
  }, [cart, items, bundles]);
  const overallMargin = costBasis !== null ? margin(costBasis, total) : null;

  const handleRemove = (line: CartLine) => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    onRemoveLine(line.id);
    setRemovedLine(line);
    undoTimerRef.current = window.setTimeout(() => setRemovedLine(null), 4000);
  };

  const handleUndo = () => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    if (removedLine) onRestoreLine(removedLine);
    setRemovedLine(null);
  };

  // Real, clickable links can't live inside the shared image (see
  // handleShareImage below) — they travel here instead, as plain text
  // that WhatsApp and most messaging apps auto-linkify on their own.
  const summaryText = [
    `${businessName} — Order #${orderNo}`,
    dateLabel,
    '',
    ...cart.map((l) => `${l.name}  ${l.quantity} × ${l.unitPrice} ${currencySymbol}`),
    '',
    discountAmount > 0 ? `Discount: -${discountAmount} ${currencySymbol}` : null,
    `Total: ${total} ${currencySymbol}`,
    contactInfo ? `\nContact: ${contactInfo}` : null,
    website ? `Website: ${website}` : null,
    ...(socialLinks ?? []).map((s) => `${s.label || 'Link'}: ${s.url}`),
  ]
    .filter(Boolean)
    .join('\n');

  // Printed-receipt-only QR — see ReceiptLayout.tsx. No hosted per-order
  // page exists (no backend), so it can't encode "view this receipt
  // online"; it points at the first social/marketplace link, falling back
  // to the website, and is simply omitted if neither is set rather than
  // guessing something to encode.
  const qrValue = socialLinks?.[0]?.url || website || undefined;

  const handlePrint = () => {
    // Was previously a bare window.print() with zero print CSS anywhere,
    // so it printed the whole app UI (nav, buttons, everything) instead of
    // a receipt. applyPrintFormat injects the @page size/width/font-size
    // for the seller's chosen paper (Settings → Print format); the
    // visibility rules that hide everything except .receipt-print-root
    // live statically in index.css. See tuvara-perioder-analys.md-style
    // reasoning: printer width materially changes the CSS, so it's a
    // setting, not a guess.
    applyPrintFormat(printFormat ?? 'a4');
    window.print();
  };

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

  // A receipt as an *image* — a raster picture can never contain a real
  // clickable link, so contact/website/social info still travels as the
  // plain-text `summaryText` alongside the image (WhatsApp etc. auto-
  // linkify plain URLs/phone numbers on their own); the image is purely
  // the branded, professional-looking visual. See ReceiptLayout.tsx.
  const handleShareImage = async () => {
    if (!receiptRef.current || imageStatus === 'working') return;
    setImageStatus('working');
    const result = await shareReceiptImage(receiptRef.current, `receipt-${orderNo}.png`, summaryText);
    setImageStatus(result === 'failed' ? 'failed' : 'idle');
    if (result === 'failed') {
      setTimeout(() => setImageStatus('idle'), 3000);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      {/* Off-screen always — this is the clean receipt used for the print
          and image-share buttons below, never shown as part of the
          interactive Checkout UI itself. See ReceiptLayout.tsx. */}
      {cart.length > 0 && (
        <ReceiptLayout
          ref={receiptRef}
          businessName={businessName}
          logoUrl={logoUrl}
          orderNo={orderNo}
          dateLabel={dateLabel}
          cart={cart}
          subtotal={subtotal}
          discountAmount={discountAmount}
          total={total}
          currencySymbol={currencySymbol}
          contactInfo={contactInfo}
          website={website}
          socialLinks={socialLinks ?? []}
          qrValue={qrValue}
        />
      )}
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        {/* Was "Quote card" — didn't match the "Complete sale" CTA below it,
            or the "Checkout" label already used on the bar that opens this
            sheet (CheckoutBar.tsx). Naming it the same thing everywhere in
            the flow removes a small but real "is this the same step?" gap.
            See tuvara-quote-card-analys.md finding A. */}
        <h2 className="text-lg font-bold text-stone-900">Checkout</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        {cart.length === 0 ? (
          // Reachable once removing items down to zero was made possible —
          // previously impossible, since the cart could never be edited
          // from here at all. Sharing/printing an empty quote made no
          // sense, so this replaces the whole receipt rather than showing
          // a 0-total one.
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-stone-500 mb-4">Cart is empty — nothing left to quote.</p>
            <button
              onClick={onClose}
              className="h-11 px-6 rounded-full bg-accent-500 text-white text-sm font-semibold active:scale-[0.98] transition"
            >
              Continue shopping
            </button>
          </div>
        ) : (
        <>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-lg font-bold text-stone-900">{businessName}</h3>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>Order #{orderNo}</span>
            <span>{dateLabel}</span>
          </div>

          <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
            {cart.map((l) => {
              // B4 (tuvara-bifogade-filer-analys.md) — suggested, never
              // silent: only a banner with an explicit "Apply" tap, shown
              // only once the cart quantity actually reaches the item's
              // own standing bulk threshold and it isn't already applied.
              const bulkItem =
                l.kind === 'item' ? items.find((i) => i.id === l.refId) : undefined;
              const bulkAvailable =
                bulkItem?.bulkThreshold !== undefined &&
                bulkItem?.bulkUnitPrice !== undefined &&
                l.quantity >= bulkItem.bulkThreshold &&
                l.unitPrice > bulkItem.bulkUnitPrice;

              return (
              <div key={l.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-stone-800 truncate">{l.name}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        l.quantity - 1 <= 0 ? handleRemove(l) : onUpdateQuantity(l.id, l.quantity - 1)
                      }
                      aria-label={`Decrease ${l.name} quantity`}
                      className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center active:scale-90 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold text-stone-700">
                      {l.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(l.id, l.quantity + 1)}
                      aria-label={`Increase ${l.name} quantity`}
                      className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center active:scale-90 transition"
                    >
                      <Plus size={12} />
                    </button>
                    <span className="ml-1 text-xs text-stone-400">
                      × {l.unitPrice} {currencySymbol}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-sm font-semibold text-stone-900">
                    {l.quantity * l.unitPrice} {currencySymbol}
                  </div>
                  <button
                    onClick={() => handleRemove(l)}
                    aria-label={`Remove ${l.name}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-stone-300 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {bulkAvailable && bulkItem && (
                <button
                  onClick={() => onApplyBulkPrice(l.id, bulkItem.bulkUnitPrice as number)}
                  className="mt-1.5 flex w-full items-center justify-between rounded-lg bg-accent-50 px-2.5 py-1.5 text-left transition active:scale-[0.98]"
                >
                  <span className="text-[11px] font-medium text-accent-700">
                    Buy {bulkItem.bulkThreshold}+: {bulkItem.bulkUnitPrice} {currencySymbol} each
                  </span>
                  <span className="text-[11px] font-semibold text-accent-700">Apply</span>
                </button>
              )}
              </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-stone-100 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span>{subtotal} {currencySymbol}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{discountAmount.toFixed(2)} {currencySymbol}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-bold text-stone-900 pt-1">
              <span>Total</span>
              <span>{total.toFixed(2)} {currencySymbol}</span>
            </div>
            {/* Margin warning — owner-facing only, see the costBasis/
                overallMargin comment above. Only surfaces once a discount
                is actually applied. */}
            {discountAmount > 0 && overallMargin !== null && (
              <p
                className={`!mt-2 text-xs font-medium flex items-center gap-1 ${
                  overallMargin >= 50
                    ? 'text-emerald-600'
                    : overallMargin >= 30
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {overallMargin < 30 && <AlertTriangle size={12} />}
                {overallMargin}% margin after discount
                {overallMargin >= 50
                  ? ' — looks good'
                  : overallMargin >= 30
                    ? ' — a bit thin'
                    : ' — below your usual margin'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="block text-xs font-medium text-stone-500">Discount</span>
            <div className="inline-flex rounded-full border border-stone-200 bg-cream-50 p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (discountMode !== 'amount') setDiscount('');
                  setDiscountMode('amount');
                }}
                aria-pressed={discountMode === 'amount'}
                className={`px-2.5 h-6 rounded-full text-[11px] font-semibold transition ${
                  discountMode === 'amount' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                {currencySymbol}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (discountMode !== 'percent') setDiscount('');
                  setDiscountMode('percent');
                }}
                aria-pressed={discountMode === 'percent'}
                className={`px-2.5 h-6 rounded-full text-[11px] font-semibold transition ${
                  discountMode === 'percent' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                %
              </button>
            </div>
          </div>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            className="input"
          />
        </div>

        {channelOptions.length > 0 && (
          <div className="mt-4">
            <span className="block text-xs font-medium text-stone-500 mb-1.5">
              Sold via (optional)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {channelOptions.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedChannel((c) => (c === name ? undefined : name))}
                  className={`h-8 px-3 rounded-full text-xs font-medium border transition ${
                    selectedChannel === name
                      ? 'bg-accent-500 border-accent-500 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-accent-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-stone-400 leading-snug">
              Helps you see later which channel actually sells best — visible in your Stock tab signals.
            </p>
          </div>
        )}

        {customers.length > 0 && (
          <div className="mt-4">
            <span className="block text-xs font-medium text-stone-500 mb-1.5">
              Customer (optional)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId((id) => (id === c.id ? undefined : c.id))}
                  className={`h-8 px-3 rounded-full text-xs font-medium border transition ${
                    selectedCustomerId === c.id
                      ? 'bg-accent-500 border-accent-500 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-accent-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-stone-400 leading-snug">
              Links this sale to a customer so you can spot repeat buyers later.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          <button
            onClick={handlePrint}
            className="h-11 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={handleWhatsApp}
            className="h-11 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition"
          >
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button
            onClick={handleShareImage}
            disabled={imageStatus === 'working'}
            className="h-11 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition disabled:opacity-50"
          >
            <ImageIcon size={15} /> {imageStatus === 'working' ? '…' : 'Image'}
          </button>
          <button
            onClick={handleShare}
            className="h-11 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition"
          >
            <Share2 size={15} /> Share
          </button>
        </div>
        {imageStatus === 'failed' && (
          <p className="mt-1.5 text-[11px] text-red-500 text-center">
            Couldn't create the image — try again, or use Print/Share instead.
          </p>
        )}
        </>
        )}
      </div>

      {removedLine && (
        <div className="shrink-0 mx-5 mb-3 flex items-center justify-between gap-3 rounded-xl bg-stone-800 text-white px-4 py-2.5 text-sm animate-fadeIn">
          <span className="truncate">Removed {removedLine.name}</span>
          <button
            onClick={handleUndo}
            className="shrink-0 font-semibold text-accent-300 hover:text-accent-200 transition"
          >
            Undo
          </button>
        </div>
      )}

      {cart.length > 0 && (
        <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
          <button
            onClick={() => onComplete(selectedChannel, selectedCustomerId)}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition"
          >
            Complete sale
          </button>
        </div>
      )}
    </Sheet>
  );
}

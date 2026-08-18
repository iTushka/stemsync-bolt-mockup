import { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { CartLine, SocialLink } from '../types';

interface ReceiptLayoutProps {
  businessName: string;
  logoUrl?: string;
  orderNo: string;
  dateLabel: string;
  cart: CartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  currencySymbol: string;
  contactInfo: string;
  website?: string;
  socialLinks: SocialLink[];
  /** Only rendered in the printed version — see the QR note in
   *  tuvara-perioder-analys.md-style reasoning below. Undefined/empty
   *  simply omits the QR block rather than guessing a link to encode. */
  qrValue?: string;
}

/** The clean, non-interactive, branded receipt — used for two things only:
 *  1) captured to a PNG for sharing (see receiptImage.ts)
 *  2) the actual printed page (see printFormats.ts / the .receipt-print-root
 *     CSS hook in index.css)
 *
 * It deliberately does NOT reuse the interactive Checkout card in
 * QuoteCard.tsx — that one has +/− steppers and delete buttons that make
 * no sense on something you print or hand to a customer. Single source of
 * truth for "what a receipt looks like" so print and image-share can never
 * drift apart from each other.
 *
 * Portaled straight to document.body and kept off-screen via a wrapper
 * (see the .receipt-offscreen-wrapper comment below) — never part of the
 * normal on-screen Checkout flow.
 *
 * IMPORTANT: the off-screen positioning lives on the *wrapper*, not on the
 * node with the ref (.receipt-print-root) itself. html-to-image clones the
 * captured node's own inline styles into an SVG <foreignObject> to
 * rasterize it — if `position: fixed; left: -9999px` were on that node
 * directly, the clone would carry that same huge negative offset *inside*
 * the foreignObject's own coordinate space and render as a blank image.
 * Keeping the offset on an ancestor that isn't part of the captured
 * subtree avoids that trap.
 */
export const ReceiptLayout = forwardRef<HTMLDivElement, ReceiptLayoutProps>(function ReceiptLayout(
  {
    businessName,
    logoUrl,
    orderNo,
    dateLabel,
    cart,
    subtotal,
    discountAmount,
    total,
    currencySymbol,
    contactInfo,
    website,
    socialLinks,
    qrValue,
  },
  ref
) {
  return createPortal(
    <div className="receipt-offscreen-wrapper" aria-hidden="true">
      <div
        ref={ref}
        className="receipt-print-root"
        style={{
          width: 420,
          background: '#ffffff',
          color: '#292524',
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ fontSize: 18, fontWeight: 700 }}>{businessName}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#78716c',
            marginBottom: 10,
          }}
        >
          <span>Order #{orderNo}</span>
          <span>{dateLabel}</span>
        </div>

        <div style={{ borderTop: '1px solid #e7e5e4', paddingTop: 10 }}>
          {cart.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <span>
                {l.name} <span style={{ color: '#a8a29e' }}>× {l.quantity}</span>
              </span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {l.unitPrice * l.quantity} {currencySymbol}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e7e5e4', marginTop: 8, paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78716c' }}>
            <span>Subtotal</span>
            <span>
              {subtotal} {currencySymbol}
            </span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#059669' }}>
              <span>Discount</span>
              <span>
                -{discountAmount.toFixed(2)} {currencySymbol}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 15,
              fontWeight: 700,
              marginTop: 3,
            }}
          >
            <span>Total</span>
            <span>
              {total.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </div>

        {(contactInfo || website || socialLinks.length > 0) && (
          <div
            style={{
              borderTop: '1px solid #e7e5e4',
              marginTop: 10,
              paddingTop: 10,
              fontSize: 11,
              color: '#57534e',
            }}
          >
            {contactInfo && <div>{contactInfo}</div>}
            {website && <div>{website}</div>}
            {socialLinks.map((s) => (
              <div key={s.id}>
                {s.label}: {s.url}
              </div>
            ))}
          </div>
        )}

        {qrValue && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <QRCodeSVG value={qrValue} size={84} />
            <span style={{ fontSize: 9, color: '#a8a29e' }}>Scan to reach us</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});

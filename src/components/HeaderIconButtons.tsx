import { useState } from 'react';
import { MoreHorizontal, QrCode, Settings as SettingsIcon } from 'lucide-react';

interface MenuItem {
  label: string;
  onClick: () => void;
}

interface HeaderIconButtonsProps {
  onGetWhatsAppCard: () => void;
  onAddCustomer: () => void;
  onOpenSettings: () => void;
  /** Extra items for the "..." menu — omit entirely to hide that button. */
  moreMenuItems?: MenuItem[];
}

/**
 * The QR/customer-capture menu, settings, and (optionally) a "more" menu —
 * previously only on the Stock tab's header. Customer capture and settings
 * are not stock-specific actions, so this now renders identically on Stock,
 * Sell, and Offers rather than being reimplemented per tab.
 */
export function HeaderIconButtons({
  onGetWhatsAppCard,
  onAddCustomer,
  onOpenSettings,
  moreMenuItems,
}: HeaderIconButtonsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrMenuOpen, setQrMenuOpen] = useState(false);

  const qrMenuItems: MenuItem[] = [
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

      {moreMenuItems && moreMenuItems.length > 0 && (
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
                {moreMenuItems.map(({ label, onClick }) => (
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
      )}
    </div>
  );
}

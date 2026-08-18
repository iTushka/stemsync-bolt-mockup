import { useState } from 'react';
import { MoreHorizontal, QrCode, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../useLanguage';

export interface MenuItem {
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
 *
 * P1.5 — each button used to be a bare icon with only an aria-label (no
 * visible text), which the UX analysis flagged as a high-risk pattern for
 * a target audience with limited app experience: the meaning has to be
 * guessed or learned rather than read. Now icon + short visible label,
 * same visual language as BottomNav (icon on top, small label below) so
 * it reads as one consistent pattern rather than two different ones.
 */
export function HeaderIconButtons({
  onGetWhatsAppCard,
  onAddCustomer,
  onOpenSettings,
  moreMenuItems,
}: HeaderIconButtonsProps) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrMenuOpen, setQrMenuOpen] = useState(false);

  const qrMenuItems: MenuItem[] = [
    {
      label: t('headerShareCard'),
      onClick: () => {
        setQrMenuOpen(false);
        onGetWhatsAppCard();
      },
    },
    {
      label: t('headerAddCustomer'),
      onClick: () => {
        setQrMenuOpen(false);
        onAddCustomer();
      },
    },
  ];

  // No fixed width here on purpose — "Customers"/"Settings" are long enough
  // that a fixed narrow width caused the labels to visually run together
  // (caught in browser testing: "CUSTOMERSSETTINGS" with no gap). Sizing to
  // content + the gap-0.5 on the parent row keeps every label readable
  // regardless of language/word length.
  const iconButtonClass =
    'flex flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1 text-stone-600 hover:bg-stone-200/60 active:scale-95 transition';
  const iconLabelClass = 'text-[8px] font-semibold leading-none uppercase whitespace-nowrap';

  return (
    <div className="flex items-center gap-0.5">
      <div className="relative">
        <button
          onClick={() => setQrMenuOpen((v) => !v)}
          className={iconButtonClass}
          aria-label={t('headerCustomers')}
        >
          <QrCode size={18} />
          <span className={iconLabelClass}>{t('headerCustomers')}</span>
        </button>
        {qrMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setQrMenuOpen(false)} />
            <div className="absolute right-0 top-14 z-20 w-52 bg-white rounded-2xl shadow-cardHover py-1.5 animate-scaleIn origin-top-right">
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

      <button onClick={onOpenSettings} className={iconButtonClass} aria-label={t('headerSettings')}>
        <SettingsIcon size={18} />
        <span className={iconLabelClass}>{t('headerSettings')}</span>
      </button>

      {moreMenuItems && moreMenuItems.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={iconButtonClass}
            aria-label={t('headerMore')}
          >
            <MoreHorizontal size={20} />
            <span className={iconLabelClass}>{t('headerMore')}</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-14 z-20 w-52 bg-white rounded-2xl shadow-cardHover py-1.5 animate-scaleIn origin-top-right">
                {moreMenuItems.map(({ label, onClick }) => (
                  <button
                    key={label}
                    onClick={() => {
                      // Close the dropdown itself, not just whatever sheet the
                      // item opens — otherwise it stays open underneath (its
                      // backdrop is confined to this header's own sticky
                      // stacking context) and reappears once that sheet closes.
                      setMenuOpen(false);
                      onClick();
                    }}
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

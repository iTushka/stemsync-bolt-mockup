import { availableCurrencies, CURRENCY_SYMBOLS, type CurrencyCode, type ExchangeRates } from '../exchangeRates';

interface DemoCurrencySwitcherProps {
  nativeSymbol: string;
  exchangeRates: ExchangeRates;
  value: CurrencyCode | 'native';
  onChange: (value: CurrencyCode | 'native') => void;
}

/**
 * Demo-only display toggle — lets the same seeded demo tenant be shown to a
 * prospect in any of its saved reference currencies (see exchangeRates.ts)
 * without touching the underlying stored prices. Gated by isDemoPilot() at
 * the call site; never rendered for real pilot tenants, which already have
 * their own currency in Settings.
 */
export function DemoCurrencySwitcher({ nativeSymbol, exchangeRates, value, onChange }: DemoCurrencySwitcherProps) {
  const codes = availableCurrencies(exchangeRates);
  if (codes.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white border border-stone-200">
      <button
        onClick={() => onChange('native')}
        className={`w-7 h-7 rounded-full text-xs font-semibold transition ${
          value === 'native' ? 'bg-accent-500 text-white' : 'text-stone-500 hover:bg-stone-100'
        }`}
        aria-label={`Show prices in ${nativeSymbol}`}
      >
        {nativeSymbol}
      </button>
      {codes.map((code) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          className={`w-7 h-7 rounded-full text-xs font-semibold transition ${
            value === code ? 'bg-accent-500 text-white' : 'text-stone-500 hover:bg-stone-100'
          }`}
          aria-label={`Show prices in ${code}`}
        >
          {CURRENCY_SYMBOLS[code]}
        </button>
      ))}
    </div>
  );
}

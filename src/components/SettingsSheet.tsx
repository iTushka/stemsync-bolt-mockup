import { useState, useRef } from 'react';
import { Plus, Trash2, RotateCcw, Download, Upload, Image as ImageIcon, Layers, FileCheck, ShieldCheck, Sparkles, Check, Lock } from 'lucide-react';
import { Sheet } from './Sheet';
import { clearTenantStorage, exportTenantData, importTenantData } from '../usePersistentState';
import type {
  AppSettings,
  LegalAcceptance,
  BusinessProfile,
  MarkupPreset,
  PrintFormat,
  SeasonPreset,
  SocialLink,
  StockItem,
  StockPeriod,
  TeamUser,
} from '../types';
import { TERMS_VERSION, NDA_VERSION } from '../legalText';
import { hasBusinessProfileContent } from '../businessProfile';
import { CURRENT_STOCK_SENTINEL } from '../types';
import { REFERENCE_CURRENCIES, daysSinceUpdate, isRateStale, type CurrencyCode } from '../exchangeRates';
import { PILOT_SLUG, isDemoPilot, TENANT, MAX_SHOPS, MAX_STAFF } from '../config';
import { useLanguage } from '../useLanguage';
import { PRINT_FORMATS } from '../printFormats';
import { SEASON_PRESETS_BY_TENANT } from '../categoryFieldMap';

const PRINT_FORMAT_ORDER: PrintFormat[] = ['a4', 'thermal80', 'thermal58'];

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  team: TeamUser[];
  onTeamChange: (team: TeamUser[]) => void;
  /** Who's currently using the app on this device — see
   *  tuvara-app-personal-moms-butiker-kostnader-insights-analys.md punkt 1
   *  and 5. A trust-based switch for now, not PIN-gated yet. */
  activeUserId: string;
  onActiveUserChange: (id: string) => void;
  /** Stock periods — see tuvara-perioder-analys.md. This "Stock periods"
   *  section is the one always-visible entry point into the feature;
   *  nothing elsewhere in the app (Stock's period chips, new items'
   *  periodId) shows up until a seller actually taps "Start new period"
   *  here for the first time. */
  items: StockItem[];
  periods: StockPeriod[];
  onStartPeriod: (name: string, copyFromPeriodId?: string) => void;
  /** Terms of Use / Confidentiality acceptance status — see
   *  legalText.ts and LegalAgreementSheet.tsx. This row is the permanent
   *  entry point to sign or review, whether or not the on-Stock hint
   *  (LegalAcceptanceHint) has been dismissed. */
  legalAcceptance: LegalAcceptance | null;
  onOpenLegal: () => void;
  /** "About your business" — see BusinessProfileHint.tsx and
   *  businessProfile.ts. This row is the permanent entry point, whether or
   *  not the on-Stock hint has been dismissed. */
  businessProfile: BusinessProfile | null;
  onOpenBusinessProfile: () => void;
}

const CURRENCIES = ['kr', '£', '$', '৳', '€'];

export function SettingsSheet({
  open,
  onClose,
  settings,
  onChange,
  team,
  onTeamChange,
  activeUserId,
  onActiveUserChange,
  items,
  periods,
  onStartPeriod,
  legalAcceptance,
  onOpenLegal,
  businessProfile,
  onOpenBusinessProfile,
}: SettingsSheetProps) {
  const [newUserName, setNewUserName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  // PIN-gated switch (väg A) — see updateUserPin/addUser below and
  // tuvara-app-personal-moms-butiker-kostnader-insights-analys.md punkt 1.
  const [pendingSwitchUserId, setPendingSwitchUserId] = useState<string | null>(null);
  const [pinAttempt, setPinAttempt] = useState('');
  const [pinError, setPinError] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const { lang, setLang, t } = useLanguage();

  const [periodFormOpen, setPeriodFormOpen] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [copyFrom, setCopyFrom] = useState('');

  const currentStockCount = items.filter((i) => !i.periodId).length;
  const periodItemCount = (id: string) => items.filter((i) => i.periodId === id).length;

  const handleConfirmStartPeriod = () => {
    onStartPeriod(newPeriodName, copyFrom || undefined);
    setNewPeriodName('');
    setCopyFrom('');
    setPeriodFormOpen(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ok = await importTenantData(file);
    if (ok) {
      window.location.reload();
    } else {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  const exchangeRates = settings.exchangeRates ?? {};

  const updateRate = (code: CurrencyCode, rawValue: string) => {
    const nextRates = { ...exchangeRates };
    const num = parseFloat(rawValue);
    if (!rawValue.trim() || isNaN(num) || num <= 0) {
      delete nextRates[code];
    } else {
      nextRates[code] = { rate: num, updatedAt: Date.now() };
    }
    update({ exchangeRates: nextRates });
  };

  // Max MAX_STAFF Staff accounts — punkt 1,
  // tuvara-app-personal-moms-butiker-kostnader-insights-analys.md. Owner
  // isn't counted/capped; there's normally exactly one.
  const staffCount = team.filter((u) => u.role === 'Staff').length;
  const staffLimitReached = staffCount >= MAX_STAFF;

  const addUser = () => {
    if (!newUserName.trim() || staffLimitReached) return;
    onTeamChange([
      ...team,
      { id: Math.random().toString(36).slice(2, 9), name: newUserName.trim(), role: 'Staff' },
    ]);
    setNewUserName('');
  };

  const removeUser = (id: string) => onTeamChange(team.filter((u) => u.id !== id));

  const updateUserPin = (id: string, pin: string) =>
    onTeamChange(team.map((u) => (u.id === id ? { ...u, pin: pin || undefined } : u)));

  // Tapping a name: switches immediately if it's already active or has no
  // PIN set; otherwise opens the inline PIN prompt for that row. Owner can
  // always see/reset any code right here in this same list, so there's no
  // separate "forgot PIN" flow to build — see TeamUser.pin's doc comment.
  const handleTapUser = (u: TeamUser) => {
    if (u.id === activeUserId) return;
    if (!u.pin) {
      onActiveUserChange(u.id);
      return;
    }
    setPendingSwitchUserId(u.id);
    setPinAttempt('');
    setPinError(false);
  };

  const handleConfirmSwitch = (u: TeamUser) => {
    if (pinAttempt === u.pin) {
      onActiveUserChange(u.id);
      setPendingSwitchUserId(null);
      setPinAttempt('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Shops/showrooms — see
  // tuvara-app-personal-moms-butiker-kostnader-insights-analys.md punkt 3.
  // Just names, capped at MAX_SHOPS (config.ts) — the "simple tag" reading
  // of "flera butiker", not a real multi-location model.
  const shopNames = settings.shopNames ?? [];
  const addShop = () => {
    const name = newShopName.trim();
    if (!name || shopNames.length >= MAX_SHOPS || shopNames.includes(name)) return;
    update({ shopNames: [...shopNames, name] });
    setNewShopName('');
  };
  const removeShop = (name: string) => update({ shopNames: shopNames.filter((s) => s !== name) });

  const socialLinks = settings.socialLinks ?? [];

  const addSocialLink = () => {
    const link: SocialLink = { id: Math.random().toString(36).slice(2, 9), label: '', url: '' };
    update({ socialLinks: [...socialLinks, link] });
  };

  const updateSocialLink = (id: string, patch: Partial<SocialLink>) => {
    update({ socialLinks: socialLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  };

  const removeSocialLink = (id: string) => {
    update({ socialLinks: socialLinks.filter((l) => l.id !== id) });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({ logoUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleRole = (id: string) =>
    onTeamChange(
      team.map((u) =>
        u.id === id ? { ...u, role: u.role === 'Owner' ? 'Staff' : 'Owner' } : u
      )
    );

  // B2/B3 (tuvara-sasongspaslag-analys.md) — Lager 2 (tag markups) has no
  // seeded default at all; Lager 3 (seasons) falls back to the tenant's
  // starter list until the seller edits it for the first time, at which
  // point the edited copy (including the untouched entries) becomes
  // settings.seasonPresets going forward.
  const markupPresets = settings.markupPresets ?? [];
  const seasonPresets = settings.seasonPresets ?? SEASON_PRESETS_BY_TENANT[TENANT];

  const addMarkupPreset = () => {
    const preset: MarkupPreset = { id: Math.random().toString(36).slice(2, 9), tag: '', markup: 1.2 };
    update({ markupPresets: [...markupPresets, preset] });
  };
  const updateMarkupPreset = (id: string, patch: Partial<MarkupPreset>) => {
    update({ markupPresets: markupPresets.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };
  const removeMarkupPreset = (id: string) => {
    update({ markupPresets: markupPresets.filter((p) => p.id !== id) });
  };

  const addSeasonPreset = () => {
    const preset: SeasonPreset = { id: Math.random().toString(36).slice(2, 9), name: '', boostMultiplier: 1.2 };
    update({ seasonPresets: [...seasonPresets, preset] });
  };
  const updateSeasonPreset = (id: string, patch: Partial<SeasonPreset>) => {
    update({ seasonPresets: seasonPresets.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };
  const removeSeasonPreset = (id: string) => {
    update({ seasonPresets: seasonPresets.filter((p) => p.id !== id) });
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">{t('settingsTitle')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">{t('settingsCurrencyLabel')}</span>
            <select
              value={settings.currencySymbol}
              onChange={(e) => update({ currencySymbol: e.target.value })}
              className="input"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">{t('settingsLanguageLabel')}</span>
            {/* Real EN/BN switch — was a fully wired-looking dropdown
                (English/Svenska/বাংলা) that didn't change anything
                anywhere in the app, then briefly a static honest label
                (P0.1). Now backed by LanguageContext.tsx / strings.ts.
                Only English/বাংলা — "Svenska" was never a real product
                language, just a leftover from the dev-facing mockup. */}
            <div
              role="group"
              aria-label={t('settingsLanguageLabel')}
              className="inline-flex w-full rounded-xl border border-stone-200 bg-cream-50 p-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`flex-1 h-9 rounded-[10px] text-sm font-semibold transition ${
                  lang === 'en' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                aria-pressed={lang === 'bn'}
                className={`flex-1 h-9 rounded-[10px] text-sm font-semibold transition ${
                  lang === 'bn' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'
                }`}
              >
                বাংলা
              </button>
            </div>
            <p className="mt-1 text-[11px] text-stone-400 leading-snug">
              বাংলা এখনো পুরোপুরি অনুবাদ করা হয়নি — কিছু অংশ ইংরেজিতেই থাকবে।
            </p>
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">{t('settingsBusinessNameLabel')}</span>
          <input
            value={settings.businessName}
            onChange={(e) => update({ businessName: e.target.value })}
            className="input"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Contact info (phone or email)
          </span>
          <input
            value={settings.contactInfo}
            onChange={(e) => update({ contactInfo: e.target.value })}
            placeholder="+44 7700 900123"
            className="input"
          />
        </label>

        <div className="pt-2 border-t border-stone-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-1">
            <Layers size={13} className="text-stone-400" /> Stock periods
          </span>
          <p className="mb-2.5 text-[11px] text-stone-400 leading-snug">
            Group stock into named batches — "Eid Collection 2026", "Autumn
            restock", or just "Week 34" if that's how you think about it.
            Entirely optional — nothing changes anywhere else until you
            start your first one.
          </p>

          {periods.length > 0 && (
            <div className="space-y-1.5 mb-2.5">
              {periods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                >
                  <div>
                    <span className="block text-sm font-semibold text-stone-800">{p.name}</span>
                    <span className="block text-[11px] text-stone-400">
                      Started {new Date(p.startedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {periodItemCount(p.id)} item{periodItemCount(p.id) === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {periodFormOpen ? (
            <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2.5">
              <input
                value={newPeriodName}
                onChange={(e) => setNewPeriodName(e.target.value)}
                placeholder="e.g. Autumn stock, Eid Collection, Week 34"
                className="input"
                autoFocus
              />
              <label className="block">
                <span className="block text-[11px] font-medium text-stone-500 mb-1">
                  Copy items from (optional)
                </span>
                <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="input">
                  <option value="">Don't copy — start empty</option>
                  {currentStockCount > 0 && (
                    <option value={CURRENT_STOCK_SENTINEL}>
                      Current stock ({currentStockCount} item{currentStockCount === 1 ? '' : 's'})
                    </option>
                  )}
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({periodItemCount(p.id)} item{periodItemCount(p.id) === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
                {copyFrom && (
                  <p className="mt-1 text-[11px] text-stone-400 leading-snug">
                    Copies each item's name, price and details as a fresh entry with
                    quantity set to 0 — you fill in what this batch actually has.
                  </p>
                )}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPeriodFormOpen(false);
                    setNewPeriodName('');
                    setCopyFrom('');
                  }}
                  className="flex-1 h-10 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStartPeriod}
                  disabled={!newPeriodName.trim()}
                  className="flex-1 h-10 rounded-full bg-accent-500 text-white text-xs font-semibold disabled:opacity-40"
                >
                  Start period
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setPeriodFormOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent-600"
            >
              <Plus size={14} /> Start new period
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Receipt branding
          </span>
          <p className="mb-3 text-[11px] text-stone-400 leading-snug">
            Shown on printed and shared receipts — all optional.
          </p>

          <div className="flex items-center gap-3 mb-3.5">
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFile}
            />
            {settings.logoUrl ? (
              <button
                onClick={() => logoFileInputRef.current?.click()}
                className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-stone-200"
              >
                <img src={settings.logoUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ) : (
              <button
                onClick={() => logoFileInputRef.current?.click()}
                className="w-14 h-14 shrink-0 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 hover:border-accent-300 hover:text-accent-500 transition"
              >
                <ImageIcon size={18} />
              </button>
            )}
            <div>
              <span className="block text-xs font-medium text-stone-700 mb-1">Logo</span>
              <div className="flex gap-3">
                <button
                  onClick={() => logoFileInputRef.current?.click()}
                  className="text-xs font-semibold text-accent-600"
                >
                  {settings.logoUrl ? 'Change' : 'Upload'}
                </button>
                {settings.logoUrl && (
                  <button
                    onClick={() => update({ logoUrl: undefined })}
                    className="text-xs font-semibold text-stone-400 hover:text-red-500 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="block mb-3.5">
            <span className="block text-xs font-medium text-stone-500 mb-1">Website</span>
            <input
              value={settings.website ?? ''}
              onChange={(e) => update({ website: e.target.value })}
              placeholder="www.myshop.com"
              className="input"
            />
          </label>

          <div>
            <span className="block text-xs font-medium text-stone-500 mb-1.5">
              Social & marketplace links
            </span>
            <div className="space-y-1.5">
              {socialLinks.map((link) => (
                <div key={link.id} className="flex gap-1.5">
                  <input
                    value={link.label}
                    onChange={(e) => updateSocialLink(link.id, { label: e.target.value })}
                    placeholder="Instagram"
                    className="input w-24 shrink-0"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => updateSocialLink(link.id, { url: e.target.value })}
                    placeholder="instagram.com/..."
                    className="input flex-1"
                  />
                  <button
                    onClick={() => removeSocialLink(link.id)}
                    aria-label="Remove link"
                    className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addSocialLink}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent-600"
            >
              <Plus size={14} /> Add link
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-1">Print format</span>
          <p className="mb-2 text-[11px] text-stone-400 leading-snug">
            Match your printer — a regular printer, or a receipt printer at a market stall.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {PRINT_FORMAT_ORDER.map((f) => (
              <button
                key={f}
                onClick={() => update({ printFormat: f })}
                aria-pressed={(settings.printFormat ?? 'a4') === f}
                className={`h-11 rounded-xl px-1 text-[11px] font-semibold leading-tight transition ${
                  (settings.printFormat ?? 'a4') === f
                    ? 'bg-accent-500 text-white'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                {PRINT_FORMATS[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-1">Tag markups</span>
          <p className="mb-2.5 text-[11px] text-stone-400 leading-snug">
            Give one of your own tags (e.g. "premium", "handmade") a suggested markup —
            it shows up as a price suggestion in Add item whenever that tag is used.
            Entirely your own vocabulary; nothing is pre-filled.
          </p>
          <div className="space-y-1.5">
            {markupPresets.map((p) => (
              <div key={p.id} className="flex gap-1.5">
                <input
                  value={p.tag}
                  onChange={(e) => updateMarkupPreset(p.id, { tag: e.target.value })}
                  placeholder="Tag, e.g. premium"
                  className="input flex-1"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.05}
                  value={p.markup || ''}
                  onChange={(e) => updateMarkupPreset(p.id, { markup: parseFloat(e.target.value) || 0 })}
                  placeholder="×1.2"
                  className="input w-20"
                />
                <button
                  onClick={() => removeMarkupPreset(p.id)}
                  aria-label="Remove tag markup"
                  className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-red-500 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addMarkupPreset}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent-600"
          >
            <Plus size={14} /> Add tag markup
          </button>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-1">Seasons & occasions</span>
          <p className="mb-2.5 text-[11px] text-stone-400 leading-snug">
            A starting list for your kind of business — edit, remove or add your own.
            Picking one of these in Add item boosts the suggested price on top of any
            tag markup above (multiplied together, not added).
          </p>
          <div className="space-y-1.5">
            {seasonPresets.map((p) => (
              <div key={p.id} className="flex gap-1.5">
                <input
                  value={p.name}
                  onChange={(e) => updateSeasonPreset(p.id, { name: e.target.value })}
                  placeholder="e.g. Eid"
                  className="input flex-1"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.05}
                  value={p.boostMultiplier || ''}
                  onChange={(e) => updateSeasonPreset(p.id, { boostMultiplier: parseFloat(e.target.value) || 0 })}
                  placeholder="×1.25"
                  className="input w-20"
                />
                <button
                  onClick={() => removeSeasonPreset(p.id)}
                  aria-label="Remove season"
                  className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-red-500 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addSeasonPreset}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent-600"
          >
            <Plus size={14} /> Add season
          </button>
        </div>

        <div>
          <span className="block text-xs font-medium text-stone-500 mb-2">
            Shops ({shopNames.length}/{MAX_SHOPS})
          </span>
          <p className="mb-2 text-[11px] text-stone-400 leading-snug">
            One shared stock list, tagged and filterable per shop — not separate inventories.
          </p>
          {shopNames.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {shopNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                >
                  <span className="text-sm font-semibold text-stone-800">{name}</span>
                  <button
                    onClick={() => removeShop(name)}
                    aria-label="Remove shop"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {shopNames.length < MAX_SHOPS ? (
            <div className="flex gap-2">
              <input
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                placeholder="e.g. Showroom 2"
                className="input flex-1"
              />
              <button
                onClick={addShop}
                disabled={!newShopName.trim()}
                className="w-11 h-11 shrink-0 rounded-xl bg-accent-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
                aria-label="Add shop"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-stone-400">Limit of {MAX_SHOPS} shops reached.</p>
          )}
        </div>

        <div>
          <span className="block text-xs font-medium text-stone-500 mb-2">
            Team & roles
          </span>
          <p className="mb-2 text-[11px] text-stone-400 leading-snug">
            Tap a name to switch who's currently using this device. Set a PIN below to ask for
            it before switching to that person — a soft check against a wrong tap, not real
            security.
          </p>
          <div className="space-y-1.5">
            {team.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleTapUser(u)}
                    className="flex items-center gap-1.5 min-w-0"
                  >
                    {u.id === activeUserId && (
                      <Check size={14} className="text-accent-500 shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-stone-800 truncate">{u.name}</span>
                    {u.pin && <Lock size={11} className="text-stone-300 shrink-0" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRole(u.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                        u.role === 'Owner'
                          ? 'bg-accent-100 text-accent-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {u.role}
                    </button>
                    {u.role !== 'Owner' && (
                      <button
                        onClick={() => removeUser(u.id)}
                        aria-label="Remove user"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* PIN management — visible to whoever can open Settings
                    (normally Owner), same "no separate forgot-PIN flow"
                    reasoning as handleTapUser above. */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 shrink-0">PIN</span>
                  <input
                    value={u.pin ?? ''}
                    onChange={(e) => updateUserPin(u.id, e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    placeholder="none set"
                    className="w-20 text-xs px-2 py-1 rounded-lg border border-stone-200 bg-cream-50"
                  />
                  <span className="text-[10px] text-stone-300">4 digits, optional</span>
                </div>

                {/* Inline PIN prompt for switching to a code-protected user
                    — see handleTapUser/handleConfirmSwitch above. */}
                {pendingSwitchUserId === u.id && (
                  <div className="mt-2 flex items-center gap-1.5 animate-fadeIn">
                    <input
                      value={pinAttempt}
                      onChange={(e) => {
                        setPinAttempt(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setPinError(false);
                      }}
                      inputMode="numeric"
                      placeholder="Enter PIN"
                      autoFocus
                      className={`w-24 text-xs px-2 py-1.5 rounded-lg border ${
                        pinError ? 'border-red-400' : 'border-stone-200'
                      }`}
                    />
                    <button
                      onClick={() => handleConfirmSwitch(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-accent-500 text-white text-xs font-semibold"
                    >
                      Switch
                    </button>
                    <button
                      onClick={() => setPendingSwitchUserId(null)}
                      className="px-2 py-1.5 text-xs text-stone-400"
                    >
                      Cancel
                    </button>
                    {pinError && <span className="text-[11px] text-red-500">Wrong PIN</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {staffLimitReached && (
            <p className="mt-2 text-[11px] text-amber-600">
              Limit of {MAX_STAFF} Staff accounts reached — remove one to add another.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Add team member name"
              disabled={staffLimitReached}
              className="input flex-1 disabled:opacity-50"
            />
            <button
              onClick={addUser}
              disabled={!newUserName.trim() || staffLimitReached}
              className="w-11 h-11 shrink-0 rounded-xl bg-accent-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
              aria-label="Add team member"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <button
            onClick={() => update({ simulateFreePlan: !settings.simulateFreePlan })}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
          >
            <div className="text-left">
              <span className="block text-sm font-medium text-stone-700">
                Simulate free plan (demo)
              </span>
              <span className="block text-[11px] text-stone-400">
                Shows the upgrade prompts a free-tier user would see
              </span>
            </div>
            <span
              className={`shrink-0 relative w-9 h-5 rounded-full transition ${
                settings.simulateFreePlan ? 'bg-accent-500' : 'bg-stone-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.simulateFreePlan ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <button
            onClick={() => update({ vatEnabled: !settings.vatEnabled })}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
          >
            <div className="text-left">
              <span className="block text-sm font-medium text-stone-700">
                Include VAT in prices
              </span>
              <span className="block text-[11px] text-stone-400">
                Your call — Tuvara doesn't decide this for you or by market
              </span>
            </div>
            <span
              className={`shrink-0 relative w-9 h-5 rounded-full transition ${
                settings.vatEnabled ? 'bg-accent-500' : 'bg-stone-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.vatEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
          {settings.vatEnabled && (
            <label className="mt-2 block">
              <span className="block text-xs font-medium text-stone-500 mb-1">
                VAT rate (%) — type your own, Tuvara never suggests one
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={settings.vatRatePct ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  update({ vatRatePct: raw === '' ? undefined : Math.max(0, parseFloat(raw) || 0) });
                }}
                placeholder="e.g. 15"
                className="input"
              />
              <span className="block mt-1 text-[11px] text-stone-400">
                Shown as "of which VAT: X" on the price and on your quote/WhatsApp card —
                your prices don't change.
              </span>
            </label>
          )}
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-2">
            Reference exchange rates
          </span>
          <p className="mb-2 text-[11px] text-stone-400 leading-snug">
            Optional — fill in only the currencies you actually deal with. Entered by hand;
            nothing is fetched automatically. Converts to/from your trading currency (
            {settings.currencySymbol}).
          </p>
          <div className="space-y-1.5">
            {REFERENCE_CURRENCIES.map((code) => {
              const entry = exchangeRates[code];
              const days = entry ? daysSinceUpdate(entry.updatedAt) : 0;
              return (
                <div
                  key={code}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-sm font-semibold text-stone-700">
                      1 {code} =
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.01}
                      value={entry?.rate ?? ''}
                      onChange={(e) => updateRate(code, e.target.value)}
                      placeholder="e.g. 123.50"
                      className="input flex-1"
                    />
                    <span className="w-6 shrink-0 text-sm text-stone-500">
                      {settings.currencySymbol}
                    </span>
                  </div>
                  {entry && (
                    <p className="mt-1 text-[11px] text-stone-400">
                      Updated {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}
                      {isRateStale(entry.updatedAt) && (
                        <span className="text-amber-600"> — worth checking the latest rate?</span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-2">
            Terms &amp; confidentiality
          </span>
          <button
            onClick={onOpenLegal}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
          >
            <div className="flex items-center gap-2 text-left">
              <FileCheck size={15} className="text-stone-400 shrink-0" />
              <div>
                <span className="block text-sm font-medium text-stone-700">Terms of Use</span>
                <span className="block text-[11px] text-stone-400">
                  {legalAcceptance?.termsAcceptedAt !== undefined && legalAcceptance.termsVersion === TERMS_VERSION
                    ? `Signed by ${legalAcceptance.name} on ${new Date(legalAcceptance.termsAcceptedAt).toLocaleDateString()}`
                    : 'Not yet signed'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-accent-600 shrink-0">Review</span>
          </button>
          <button
            onClick={onOpenLegal}
            className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
          >
            <div className="flex items-center gap-2 text-left">
              <ShieldCheck size={15} className="text-stone-400 shrink-0" />
              <div>
                <span className="block text-sm font-medium text-stone-700">Confidentiality agreement</span>
                <span className="block text-[11px] text-stone-400">
                  {legalAcceptance?.ndaAcceptedAt !== undefined && legalAcceptance.ndaVersion === NDA_VERSION
                    ? `Signed by ${legalAcceptance.name} on ${new Date(legalAcceptance.ndaAcceptedAt).toLocaleDateString()}`
                    : 'Only needed for team members with code/document access'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-accent-600 shrink-0">Review</span>
          </button>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-2">About your business</span>
          <button
            onClick={onOpenBusinessProfile}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
          >
            <div className="flex items-center gap-2 text-left">
              <Sparkles size={15} className="text-stone-400 shrink-0" />
              <div>
                <span className="block text-sm font-medium text-stone-700">Your notes &amp; profile</span>
                <span className="block text-[11px] text-stone-400">
                  {hasBusinessProfileContent(businessProfile)
                    ? 'Saved — stays on this device only'
                    : 'Optional — helps Tuvara feel more like it\'s made for you'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-accent-600 shrink-0">
              {hasBusinessProfileContent(businessProfile) ? 'Edit' : 'Add'}
            </span>
          </button>
        </div>

        <div className="pt-2 border-t border-stone-100">
          <span className="block text-xs font-medium text-stone-500 mb-2">
            {t('settingsBackupHeading')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={exportTenantData}
              className="flex-1 h-10 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <Download size={14} /> {t('settingsExportData')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-10 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <Upload size={14} /> {t('settingsImportData')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          {importStatus === 'error' && (
            <p className="mt-1.5 text-[11px] text-red-500">
              Couldn't read that file — make sure it's a backup exported from this app.
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-stone-400 leading-snug">
            Save a backup file to move your stock, bookings and settings to another phone or
            browser — no account needed.
          </p>
        </div>

        <div className="pt-2 border-t border-stone-100">
          {/* Demo pilots never write to localStorage in the first place (see
              usePersistentState.ts) — clearTenantStorage() is a no-op for
              them, and the reload is what actually "resets" by re-fetching
              the current admin-configured cloud baseline from scratch (see
              useDemoCloudBaseline.ts). Kept as one shared handler with real
              pilots' storage-clearing reset since the end result (confirm,
              then reload to a clean starting state) is the same either way. */}
          <button
            onClick={() => {
              const isDemo = isDemoPilot(PILOT_SLUG);
              const message = isDemo
                ? 'Reset this demo back to its starting example data? Any changes made during this walkthrough will be lost.'
                : 'Reset all test data on this device? This cannot be undone.';
              if (confirm(message)) {
                clearTenantStorage();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-red-500 transition"
          >
            <RotateCcw size={13} />
            {isDemoPilot(PILOT_SLUG) ? 'Reset to demo data' : 'Reset all test data on this device'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

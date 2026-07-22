import { useState, useRef } from 'react';
import { Plus, Trash2, RotateCcw, Download, Upload } from 'lucide-react';
import { Sheet } from './Sheet';
import { clearTenantStorage, exportTenantData, importTenantData } from '../usePersistentState';
import type { AppSettings, TeamUser } from '../types';
import { REFERENCE_CURRENCIES, daysSinceUpdate, isRateStale, type CurrencyCode } from '../exchangeRates';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  team: TeamUser[];
  onTeamChange: (team: TeamUser[]) => void;
}

const CURRENCIES = ['kr', '£', '$', '৳', '€'];
const LANGUAGES = ['English', 'Svenska', 'বাংলা'];

export function SettingsSheet({
  open,
  onClose,
  settings,
  onChange,
  team,
  onTeamChange,
}: SettingsSheetProps) {
  const [newUserName, setNewUserName] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addUser = () => {
    if (!newUserName.trim()) return;
    onTeamChange([
      ...team,
      { id: Math.random().toString(36).slice(2, 9), name: newUserName.trim(), role: 'Staff' },
    ]);
    setNewUserName('');
  };

  const removeUser = (id: string) => onTeamChange(team.filter((u) => u.id !== id));

  const toggleRole = (id: string) =>
    onTeamChange(
      team.map((u) =>
        u.id === id ? { ...u, role: u.role === 'Owner' ? 'Staff' : 'Owner' } : u
      )
    );

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">Currency</span>
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
            <span className="block text-xs font-medium text-stone-500 mb-1">Language</span>
            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value })}
              className="input"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Business name</span>
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

        <div>
          <span className="block text-xs font-medium text-stone-500 mb-2">
            Team & roles
          </span>
          <div className="space-y-1.5">
            {team.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
              >
                <span className="text-sm font-semibold text-stone-800">{u.name}</span>
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
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Add team member name"
              className="input flex-1"
            />
            <button
              onClick={addUser}
              disabled={!newUserName.trim()}
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
            Backup &amp; transfer
          </span>
          <div className="flex gap-2">
            <button
              onClick={exportTenantData}
              className="flex-1 h-10 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <Download size={14} /> Export data
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-10 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <Upload size={14} /> Import data
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
          <button
            onClick={() => {
              if (confirm('Reset all test data on this device? This cannot be undone.')) {
                clearTenantStorage();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-red-500 transition"
          >
            <RotateCcw size={13} /> Reset all test data on this device
          </button>
        </div>
      </div>
    </Sheet>
  );
}

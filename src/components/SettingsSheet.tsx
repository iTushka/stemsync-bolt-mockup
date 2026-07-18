import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';
import type { AppSettings, TeamUser } from '../types';

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

  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

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
      </div>
    </Sheet>
  );
}

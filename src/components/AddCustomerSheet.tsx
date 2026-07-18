import { useState } from 'react';
import { Sparkles, Check as CheckIcon } from 'lucide-react';
import { Sheet } from './Sheet';
import { parseCustomerMessage } from '../customerParse';
import type { Customer } from '../types';

interface AddCustomerSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'addedAt'>) => void;
}

export function AddCustomerSheet({ open, onClose, onSave }: AddCustomerSheetProps) {
  const [raw, setRaw] = useState('');
  const [name, setName] = useState('');
  const [consented, setConsented] = useState(false);
  const [parsed, setParsed] = useState(false);

  const reset = () => {
    setRaw('');
    setName('');
    setConsented(false);
    setParsed(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleParse = () => {
    const result = parseCustomerMessage(raw);
    setName(result.name ?? '');
    setConsented(result.consented);
    setParsed(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), consented });
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Add a customer from WhatsApp</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
        {!parsed ? (
          <>
            <label className="block">
              <span className="block text-xs font-medium text-stone-500 mb-1">
                Paste the WhatsApp message you received
              </span>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={5}
                placeholder="Hi! I'd like to be remembered for future updates..."
                className="w-full p-3.5 rounded-xl bg-cream-50 border border-stone-200 text-sm text-stone-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition resize-none"
              />
            </label>
            <button
              onClick={handleParse}
              disabled={!raw.trim()}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
            >
              <Sparkles size={17} /> Interpret
            </button>
          </>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3.5">
            {!name && (
              <p className="text-xs text-stone-500">
                Couldn't find a name automatically — fill it in below.
              </p>
            )}
            <label className="block">
              <span className="block text-xs font-medium text-stone-500 mb-1">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                className="input"
              />
            </label>
            <button
              onClick={() => setConsented((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
            >
              <span className="text-sm font-medium text-stone-700">
                Agreed to WhatsApp updates
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                  consented
                    ? 'border-accent-500 bg-accent-500 text-white'
                    : 'border-stone-300 bg-white'
                }`}
              >
                {consented ? <CheckIcon size={13} /> : null}
              </span>
            </button>
          </div>
        )}
      </div>

      {parsed && (
        <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
          >
            Save customer
          </button>
        </div>
      )}
    </Sheet>
  );
}

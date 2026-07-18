import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { Sheet } from './Sheet';

interface WhatsAppCardSheetProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_MESSAGE =
  "Hi! I'd like to be remembered for future updates \uD83D\uDE42\n" +
  'My name: ___\n' +
  'I agree to occasional WhatsApp messages about new stock (reply STOP anytime to opt out).';

export function WhatsAppCardSheet({ open, onClose }: WhatsAppCardSheetProps) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [copied, setCopied] = useState(false);

  const digitsOnly = phone.replace(/[^\d]/g, '');
  const link = digitsOnly
    ? `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
    : '';

  const handleCopyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silently ignore, the link is still visible to select manually
    }
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Get my WhatsApp card</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Business WhatsApp number
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +44 7700 900123"
            className="input"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Pre-filled message
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full p-3.5 rounded-xl bg-cream-50 border border-stone-200 text-sm text-stone-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition resize-none"
          />
        </label>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-6">
          {link ? (
            <QRCodeSVG value={link} size={180} />
          ) : (
            <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-cream-100 text-center text-xs text-stone-400 px-4">
              Add a WhatsApp number above to generate the code
            </div>
          )}
          <p className="text-center text-xs text-stone-500 leading-snug">
            Customers scan this once. After that, you'll recognise them
            automatically next time they buy.
          </p>
        </div>

        <button
          onClick={handleCopyLink}
          disabled={!link}
          className={`w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 ${
            copied
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-white border border-stone-200 text-stone-700 hover:border-accent-300'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Link copied!' : 'Copy link instead'}
        </button>
      </div>
    </Sheet>
  );
}

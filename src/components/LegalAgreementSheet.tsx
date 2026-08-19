import { useState } from 'react';
import { X, Check, ShieldCheck } from 'lucide-react';
import { Sheet } from './Sheet';
import type { LegalAcceptance } from '../types';
import {
  TERMS_VERSION,
  TERMS_TITLE,
  TERMS_PARAGRAPHS,
  NDA_VERSION,
  NDA_TITLE,
  NDA_INTRO,
  NDA_PARAGRAPHS,
  LEGAL_SIGNATURE_DISCLAIMER,
} from '../legalText';

interface LegalAgreementSheetProps {
  open: boolean;
  onClose: () => void;
  acceptance: LegalAcceptance | null;
  onAccept: (acceptance: LegalAcceptance) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Lets someone read and "sign" (type name + tap Agree) the Terms of Use
 * and, separately, the Confidentiality agreement — see legalText.ts for
 * the actual wording and LEGAL_SIGNATURE_DISCLAIMER for what this is and
 * isn't. Two independent acceptances rather than one combined flag: every
 * seller needs the Terms, but the Confidentiality agreement only applies
 * to someone with deeper access (developer, intern, agent) — see
 * NDA_INTRO. Re-signing is required if the stored acceptance's version
 * doesn't match the current *_VERSION, so a past signature never silently
 * counts as agreement to wording the signer never saw.
 */
export function LegalAgreementSheet({ open, onClose, acceptance, onAccept }: LegalAgreementSheetProps) {
  const [name, setName] = useState(acceptance?.name ?? '');

  const termsSigned = acceptance?.termsAcceptedAt !== undefined && acceptance.termsVersion === TERMS_VERSION;
  const ndaSigned = acceptance?.ndaAcceptedAt !== undefined && acceptance.ndaVersion === NDA_VERSION;

  const handleAcceptTerms = () => {
    if (!name.trim()) return;
    onAccept({
      ...(acceptance ?? {}),
      name: name.trim(),
      termsAcceptedAt: Date.now(),
      termsVersion: TERMS_VERSION,
    });
  };

  const handleAcceptNda = () => {
    if (!name.trim()) return;
    onAccept({
      ...(acceptance ?? {}),
      name: name.trim(),
      ndaAcceptedAt: Date.now(),
      ndaVersion: NDA_VERSION,
    });
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">Terms &amp; confidentiality</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 active:scale-95 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-6">
        <p className="text-[11px] text-stone-400 leading-snug">{LEGAL_SIGNATURE_DISCLAIMER}</p>

        {/* Name — shared by both signatures below */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Your full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name to sign"
            className="input w-full"
          />
        </div>

        {/* Terms of Use */}
        <section>
          <h3 className="text-sm font-bold text-stone-900 mb-2">{TERMS_TITLE}</h3>
          <div className="space-y-2 mb-3">
            {TERMS_PARAGRAPHS.map((p, i) => (
              <p key={i} className="text-xs text-stone-600 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
          {termsSigned ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check size={14} /> Signed by {acceptance!.name} on {formatDate(acceptance!.termsAcceptedAt!)}
            </div>
          ) : (
            <button
              onClick={handleAcceptTerms}
              disabled={!name.trim()}
              className="w-full h-11 rounded-full bg-accent-500 text-white font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition"
            >
              I agree to the Terms of Use
            </button>
          )}
        </section>

        {/* Confidentiality / NDA */}
        <section className="pt-4 border-t border-stone-100">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck size={15} className="text-stone-500" />
            <h3 className="text-sm font-bold text-stone-900">{NDA_TITLE}</h3>
          </div>
          <p className="text-xs text-stone-400 leading-snug mb-3">{NDA_INTRO}</p>
          <div className="space-y-2 mb-3">
            {NDA_PARAGRAPHS.map((p, i) => (
              <p key={i} className="text-xs text-stone-600 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
          {ndaSigned ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check size={14} /> Signed by {acceptance!.name} on {formatDate(acceptance!.ndaAcceptedAt!)}
            </div>
          ) : (
            <button
              onClick={handleAcceptNda}
              disabled={!name.trim()}
              className="w-full h-11 rounded-full bg-white border border-stone-300 text-stone-700 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition"
            >
              I agree to the Confidentiality agreement
            </button>
          )}
        </section>
      </div>
    </Sheet>
  );
}

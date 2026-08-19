import { X, FileCheck } from 'lucide-react';
import { usePersistentState } from '../usePersistentState';

interface LegalAcceptanceHintProps {
  termsSigned: boolean;
  onOpenLegal: () => void;
}

/**
 * Same dismissible-hint pattern as ShareAccountHint — surfaced once on the
 * tab everyone lands on rather than buried in Settings, but genuinely
 * dismissible (not a hard gate): consistent with the rest of the app never
 * forcing a new mental model on someone who hasn't asked for it. Settings'
 * "Terms & confidentiality" row stays the permanent way to sign later,
 * dismissed or not — see SettingsSheet.tsx.
 */
export function LegalAcceptanceHint({ termsSigned, onOpenLegal }: LegalAcceptanceHintProps) {
  const [dismissed, setDismissed] = usePersistentState('legalHintDismissed', false);

  if (dismissed || termsSigned) return null;

  return (
    <div className="px-4 pb-2.5 animate-fadeIn">
      <div className="flex items-start gap-2.5 rounded-2xl bg-stone-100 px-3.5 py-3">
        <FileCheck size={18} className="text-stone-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-600 leading-snug">
            Please review and accept Tuvara's Terms of Use.
          </p>
          <button
            onClick={onOpenLegal}
            className="mt-1.5 text-xs font-semibold text-stone-700 underline underline-offset-2"
          >
            Review &amp; sign
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 p-1 -m-1 text-stone-400 hover:text-stone-600 transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

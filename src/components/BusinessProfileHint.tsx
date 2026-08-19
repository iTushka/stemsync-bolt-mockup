import { X, Sparkles } from 'lucide-react';
import { usePersistentState } from '../usePersistentState';

interface BusinessProfileHintProps {
  hasContent: boolean;
  onOpenProfile: () => void;
}

/**
 * Same dismissible-hint pattern as ShareAccountHint / LegalAcceptanceHint —
 * surfaced once on the tab everyone lands on, genuinely dismissible (not a
 * gate), never blocking use of the app. Settings' "About your business"
 * row stays the permanent way to open it later, dismissed or not.
 *
 * Copy grounded in tuvara-konkurrensstrategi-marknadsinsikter-analys.md's
 * "1.3" finding (Cambridge, peer-reviewed): solo entrepreneurs' personal
 * and business identity are inseparable ("I am my business") — the hint
 * names that directly rather than implying it's just a settings tweak.
 */
export function BusinessProfileHint({ hasContent, onOpenProfile }: BusinessProfileHintProps) {
  const [dismissed, setDismissed] = usePersistentState('businessProfileHintDismissed', false);

  if (dismissed || hasContent) return null;

  return (
    <div className="px-4 pb-2.5 animate-fadeIn">
      <div className="flex items-start gap-2.5 rounded-2xl bg-accent-50 px-3.5 py-3">
        <Sparkles size={18} className="text-accent-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-800 leading-snug">
            You and your business aren't really separate things — that's normal for a business
            of one. Want to tell Tuvara a bit about both? Entirely optional, just for you.
          </p>
          <button
            onClick={onOpenProfile}
            className="mt-1.5 text-xs font-semibold text-accent-700 underline underline-offset-2"
          >
            About your business
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 p-1 -m-1 text-accent-400 hover:text-accent-600 transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

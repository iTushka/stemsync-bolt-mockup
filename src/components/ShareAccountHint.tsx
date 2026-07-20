import { X, Users } from 'lucide-react';
import { usePersistentState } from '../usePersistentState';

interface ShareAccountHintProps {
  teamSize: number;
  onOpenSettings: () => void;
}

/**
 * Local research (Bangladesh, both Hazimul's and Coco Green's businesses)
 * shows a repeated pattern: the digital storefront is often run by a
 * younger family member, not the business owner. Surfacing "you can share
 * this account" early — on the tab everyone lands on — instead of burying
 * it in Settings matches that reality rather than assuming one user.
 */
export function ShareAccountHint({ teamSize, onOpenSettings }: ShareAccountHintProps) {
  const [dismissed, setDismissed] = usePersistentState('shareAccountHintDismissed', false);

  if (dismissed || teamSize > 1) return null;

  return (
    <div className="px-4 pb-2.5 animate-fadeIn">
      <div className="flex items-start gap-2.5 rounded-2xl bg-accent-50 px-3.5 py-3">
        <Users size={18} className="text-accent-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-800 leading-snug">
            Someone else handling your Facebook or WhatsApp page? They can use this account too.
          </p>
          <button
            onClick={onOpenSettings}
            className="mt-1.5 text-xs font-semibold text-accent-700 underline underline-offset-2"
          >
            Add them in Settings
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

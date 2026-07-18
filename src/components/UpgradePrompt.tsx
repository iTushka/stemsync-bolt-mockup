import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface UpgradePromptProps {
  /** What they're being invited to do — kept concrete, not vague. */
  title: string;
  description: string;
  onSeePlans?: () => void;
}

/**
 * A non-blocking, inviting card shown in place of a locked action —
 * never a dead-end. The person can always dismiss it and keep using
 * whatever's already unlocked; nothing else in the app freezes because
 * of it.
 */
export function UpgradePrompt({ title, description, onSeePlans }: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative rounded-2xl border border-accent-200 bg-accent-50/60 p-4 pr-9">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:bg-white/60 hover:text-stone-600 transition"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-1.5 text-accent-700 text-xs font-bold uppercase tracking-wide mb-1">
        <Sparkles size={13} /> Free plan
      </div>
      <p className="text-sm font-semibold text-stone-800 leading-snug">{title}</p>
      <p className="mt-0.5 text-xs text-stone-500 leading-snug">{description}</p>
      <button
        onClick={onSeePlans}
        className="mt-2.5 h-8 px-3.5 rounded-full bg-accent-500 text-white text-xs font-semibold hover:bg-accent-600 active:scale-[0.97] transition"
      >
        See plans
      </button>
    </div>
  );
}

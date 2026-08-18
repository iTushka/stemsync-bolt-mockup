import type { InsightChip, InsightTone } from '../insights';

interface InsightBarProps {
  chips: InsightChip[];
}

const TONE_CLASSES: Record<InsightTone, string> = {
  positive: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-accent-50 text-accent-700',
};

/**
 * A slim, horizontally scrollable strip of glanceable facts — modelled on a
 * weather app's condition row or a taskbar stock ticker rather than a
 * dashboard. Sits right under the tab title on every tab; renders nothing
 * when there's nothing worth surfacing, so it never becomes noise.
 */
export function InsightBar({ chips }: InsightBarProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5 animate-fadeIn"
      role="status"
      aria-live="polite"
    >
      {chips.map((chip) => {
        const Icon = chip.icon;
        const content = (
          <>
            <Icon size={13} />
            {chip.label}
          </>
        );
        // Chips with a real target (a filtered view, or the one item they
        // name) render as buttons; the rest stay plain, read-only badges —
        // see InsightChip.onClick's doc comment in insights.ts.
        return chip.onClick ? (
          <button
            key={chip.id}
            onClick={chip.onClick}
            className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition hover:brightness-95 active:scale-95 ${TONE_CLASSES[chip.tone]}`}
          >
            {content}
          </button>
        ) : (
          <span
            key={chip.id}
            className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${TONE_CLASSES[chip.tone]}`}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

import { Sparkles } from 'lucide-react';

interface AiBadgeProps {
  text: string;
}

/**
 * A small, consistent label for anything the app has drafted automatically
 * (parsed stock details, ad copy, booking suggestions). This exists as its
 * own component rather than inline markup so the "you decide" framing is
 * applied the same way everywhere an AI/heuristic suggestion is shown —
 * see the Blocket competitive analysis: their equivalent copy is literally
 * "(if you want!)" next to every AI-drafted field, which is the same
 * principle behind this app's stated vision ("a better basis for the
 * decision, not a replacement for it") made visible in the UI itself.
 */
export function AiBadge({ text }: AiBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-50 text-accent-700 text-xs font-medium">
      <Sparkles size={14} className="shrink-0" />
      <span className="leading-snug">{text}</span>
    </div>
  );
}

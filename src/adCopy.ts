import type { SalesChannel } from './types';

interface AdCopyInput {
  name: string;
  quantity: number;
  salePrice: number;
  tags: string[];
}

/**
 * Builds ready-to-paste ad copy for a stock item. If a channel is passed, the
 * price shown reflects that channel's own price (falling back to the base
 * sale price when the channel didn't set one) — this is the "channel-aware"
 * piece: the same item can read slightly differently depending on where
 * you're about to post it, without you having to rewrite it by hand.
 */
export function buildAdCopy(item: AdCopyInput, channel?: SalesChannel): string {
  const price = channel?.price ?? item.salePrice;
  const lines: string[] = [
    `✨ NEW: ${item.name} ✨`,
    '',
    `Available now — ${item.quantity} in stock`,
    `💰 ${price} kr${channel ? ` · ${channel.name}` : ''}`,
  ];

  if (item.tags.length > 0) {
    lines.push('', item.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '));
  }

  lines.push('', 'Message me to order! 📩');
  return lines.join('\n');
}

/** Copy text to the clipboard with a best-effort legacy fallback. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy approach
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

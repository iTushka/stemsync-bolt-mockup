import type { SalesChannel, Category } from './types';

interface AdCopyInput {
  name: string;
  quantity: number;
  salePrice: number;
  tags: string[];
  category?: Category;
}

type Style = 'general' | 'social';

function styleForChannel(channel?: SalesChannel): Style {
  if (!channel) return 'general';
  return /instagram|tiktok/i.test(channel.name) ? 'social' : 'general';
}

/**
 * Builds ready-to-paste ad copy for a stock item — automatically adapting
 * tone depending on which channel it's for. "General" and marketplace-style
 * channels (Facebook Marketplace, Gumtree, WhatsApp, physical market) get a
 * plain, factual listing. Instagram/TikTok get a short, hashtag-forward
 * caption instead, since that's what actually performs on those platforms —
 * same underlying data, no rewriting by hand.
 */
export function buildAdCopy(item: AdCopyInput, channel?: SalesChannel): string {
  const price = channel?.price ?? item.salePrice;
  const style = styleForChannel(channel);

  const hashtags = [
    ...(item.category ? [item.category] : []),
    ...item.tags,
  ].map((t) => `#${t.replace(/\s+/g, '')}`);

  if (style === 'social') {
    const lines: string[] = [`✨ ${item.name} ✨`, '', `${price} kr — DM to grab yours! 📩`];
    if (hashtags.length > 0) {
      lines.push('', hashtags.join(' '));
    }
    return lines.join('\n');
  }

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

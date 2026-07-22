import type { SalesChannel, Category } from './types';
import type { TenantId } from './config';
import { TENANT } from './config';

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

interface AdCopyText {
  newLabel: string;
  stockLine: (quantity: number) => string;
  orderCta: string;
  socialOrderCta: string;
}

/**
 * Wording only — not a translation layer. `jhums` (Jhum Fashion, Dhaka) gets
 * the casual, code-switched Bangla-English register small Bangladeshi
 * sellers actually post in on Facebook/WhatsApp (English loanwords like
 * "Stock"/"Order" kept as-is, not translated), instead of stiff, formally
 * translated Bangla. `general` stays English because that tenant also
 * covers non-Bangla pilots (e.g. Moja/Berlin).
 */
const AD_COPY_TEXT_BY_TENANT: Record<TenantId, AdCopyText> = {
  flowertot: {
    newLabel: 'NEW: ',
    stockLine: (q) => `Available now — ${q} in stock`,
    orderCta: 'Message me to order!',
    socialOrderCta: 'DM to grab yours!',
  },
  jhums: {
    newLabel: 'New Stock: ',
    stockLine: (q) => `Stock e ache — ${q} pcs`,
    orderCta: 'Order korte message din!',
    socialOrderCta: 'Order korte DM din!',
  },
  general: {
    newLabel: 'NEW: ',
    stockLine: (q) => `Available now — ${q} in stock`,
    orderCta: 'Message me to order!',
    socialOrderCta: 'DM to grab yours!',
  },
};

/**
 * Builds ready-to-paste ad copy for a stock item — automatically adapting
 * tone depending on which channel it's for. "General" and marketplace-style
 * channels (Facebook Marketplace, Gumtree, WhatsApp, physical market) get a
 * plain, factual listing. Instagram/TikTok get a short, hashtag-forward
 * caption instead, since that's what actually performs on those platforms —
 * same underlying data, no rewriting by hand.
 */
export function buildAdCopy(item: AdCopyInput, channel?: SalesChannel, currencySymbol = 'kr'): string {
  const price = channel?.price ?? item.salePrice;
  const style = styleForChannel(channel);
  const text = AD_COPY_TEXT_BY_TENANT[TENANT];

  const hashtags = [
    ...(item.category ? [item.category] : []),
    ...item.tags,
  ].map((t) => `#${t.replace(/\s+/g, '')}`);

  if (style === 'social') {
    const lines: string[] = [`✨ ${item.name} ✨`, '', `${price} ${currencySymbol} — ${text.socialOrderCta} 📩`];
    if (hashtags.length > 0) {
      lines.push('', hashtags.join(' '));
    }
    return lines.join('\n');
  }

  const lines: string[] = [
    `✨ ${text.newLabel}${item.name} ✨`,
    '',
    text.stockLine(item.quantity),
    `💰 ${price} ${currencySymbol}${channel ? ` · ${channel.name}` : ''}`,
  ];

  if (item.tags.length > 0) {
    lines.push('', item.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '));
  }

  lines.push('', `${text.orderCta} 📩`);
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

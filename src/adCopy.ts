import type { SalesChannel, Category } from './types';
import type { Lang } from './strings';

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
 * Fixed template phrases for the two ad-copy styles, per language — same
 * "hand-written templates, no per-generation AI/LLM call" principle as
 * debtReminders.ts. Only the surrounding boilerplate is translated; the
 * seller's own item name and tags are never machine-translated (that would
 * risk silently changing what she actually wrote — see "never guess
 * silently"). IMPORTANT: the Bangla lines below have NOT been reviewed by a
 * native speaker, same caveat as every other piece of Bangla copy in this
 * project (strings.ts, debtReminders.ts) — verify with Ru/Tumpa before this
 * is ever sent to a real customer.
 */
const AD_COPY_PHRASES: Record<
  Lang,
  { dmToGrab: string; newLabel: string; availableNow: (qty: number) => string; messageToOrder: string }
> = {
  en: {
    dmToGrab: 'DM to grab yours!',
    newLabel: 'NEW',
    availableNow: (qty) => `Available now — ${qty} in stock`,
    messageToOrder: 'Message me to order!',
  },
  bn: {
    dmToGrab: 'নিতে চাইলে মেসেজ দিন!',
    newLabel: 'নতুন',
    availableNow: (qty) => `এখন আছে — স্টকে ${qty} টা`,
    messageToOrder: 'অর্ডার করতে মেসেজ দিন!',
  },
};

/**
 * Builds ready-to-paste ad copy for a stock item — automatically adapting
 * tone depending on which channel it's for. "General" and marketplace-style
 * channels (Facebook Marketplace, Gumtree, WhatsApp, physical market) get a
 * plain, factual listing. Instagram/TikTok get a short, hashtag-forward
 * caption instead, since that's what actually performs on those platforms —
 * same underlying data, no rewriting by hand.
 *
 * `lang` picks which language the surrounding template phrases are written
 * in (see AD_COPY_PHRASES) — independent of the app's own UI language,
 * since who a seller is posting to isn't always who she reads the app in.
 * Defaults to English so every existing caller keeps working unchanged.
 */
export function buildAdCopy(
  item: AdCopyInput,
  channel?: SalesChannel,
  currencySymbol = 'kr',
  lang: Lang = 'en'
): string {
  const price = channel?.price ?? item.salePrice;
  const style = styleForChannel(channel);
  const phrases = AD_COPY_PHRASES[lang];

  const hashtags = [
    ...(item.category ? [item.category] : []),
    ...item.tags,
  ].map((t) => `#${t.replace(/\s+/g, '')}`);

  if (style === 'social') {
    const lines: string[] = [`✨ ${item.name} ✨`, '', `${price} ${currencySymbol} — ${phrases.dmToGrab} 📩`];
    if (hashtags.length > 0) {
      lines.push('', hashtags.join(' '));
    }
    return lines.join('\n');
  }

  const lines: string[] = [
    `✨ ${phrases.newLabel}: ${item.name} ✨`,
    '',
    phrases.availableNow(item.quantity),
    `💰 ${price} ${currencySymbol}${channel ? ` · ${channel.name}` : ''}`,
  ];

  if (item.tags.length > 0) {
    lines.push('', item.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '));
  }

  lines.push('', `${phrases.messageToOrder} 📩`);
  return lines.join('\n');
}

interface BundleAdCopyInput {
  name: string;
  includedNames: string[];
  bundlePrice: number;
  /** Individual-price-total minus bundlePrice — 0 or less is omitted from
   *  the copy rather than shown as a non-saving. */
  savings: number;
}

const BUNDLE_PHRASES: Record<Lang, { dealLabel: string; includes: string; save: (amt: number, sym: string) => string }> = {
  en: {
    dealLabel: 'DEAL',
    includes: 'Includes',
    save: (amt, sym) => `save ${amt} ${sym}`,
  },
  bn: {
    dealLabel: 'অফার',
    includes: 'যা যা আছে',
    save: (amt, sym) => `${amt} ${sym} বাঁচবে`,
  },
};

/**
 * Bundle equivalent of buildAdCopy — see tuvara-offers-analys.md P1 item 6.
 * Same local heuristic and general/social styling split, not a new AI call;
 * kept as a separate function rather than widening AdCopyInput because a
 * Bundle has no quantity/tags/category to build the item version's listing
 * style from. Same `lang` parameter and same "template phrases only, never
 * machine-translate the seller's own bundle/item names" discipline as
 * buildAdCopy above.
 */
export function buildBundleAdCopy(
  bundle: BundleAdCopyInput,
  channel?: SalesChannel,
  currencySymbol = 'kr',
  lang: Lang = 'en'
): string {
  const price = channel?.price ?? bundle.bundlePrice;
  const style = styleForChannel(channel);
  const adPhrases = AD_COPY_PHRASES[lang];
  const bundlePhrases = BUNDLE_PHRASES[lang];
  const savingsSuffix = bundle.savings > 0 ? ` (${bundlePhrases.save(bundle.savings, currencySymbol)})` : '';

  if (style === 'social') {
    return [
      `✨ ${bundle.name} ✨`,
      '',
      `${price} ${currencySymbol}${savingsSuffix} — ${adPhrases.dmToGrab} 📩`,
    ].join('\n');
  }

  return [
    `✨ ${bundlePhrases.dealLabel}: ${bundle.name} ✨`,
    '',
    `${bundlePhrases.includes}: ${bundle.includedNames.join(', ')}`,
    `💰 ${price} ${currencySymbol}${savingsSuffix}${channel ? ` · ${channel.name}` : ''}`,
    '',
    `${adPhrases.messageToOrder} 📩`,
  ].join('\n');
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

/**
 * Central string catalog for the app's EN/BN toggle — see useLanguage()
 * in LanguageContext.tsx and the P1 write-up in
 * tuvara-ux-intuitivitet-analys.md ("Implementera en riktig EN/BN-
 * språkväxling i själva appen").
 *
 * Bangla values here are drafted from tuvara_vernacular_ui_glossary_english.md
 * (everyday spoken terms, not formal/bookkeeping Bangla — e.g. "মাল" for
 * stock, "কেনা দাম" for purchase price) — the same source the marketing
 * pages' Bangla already uses. A few keys (marked below) have no glossary
 * entry and are my own draft.
 *
 * IMPORTANT — same caveat as every other piece of Bangla text in this
 * project: NOT YET REVIEWED BY A NATIVE SPEAKER (Ru/Tumpa). Treat as a
 * first draft, not final copy — matches the disclaimer already on
 * feature-reference.html and the glossary doc itself.
 *
 * Coverage note: this is a "Phase 1" catalog covering the highest-traffic
 * surfaces (navigation, stock list, the Add Item essentials card, Settings)
 * — not every string in the app yet. Anything not in here has no Bangla
 * translation and simply stays in English when the language is switched
 * (see t() fallback in LanguageContext.tsx). Extend this file rather than
 * hardcoding new strings elsewhere as more screens get covered.
 */

export type Lang = 'en' | 'bn';

interface StringEntry {
  en: string;
  bn: string;
}

export const STRINGS = {
  // --- Bottom navigation ---
  navStock: { en: 'Stock', bn: 'মাল' },
  navSell: { en: 'Sell', bn: 'বেচা' },
  // No glossary entry for "Offers" — draft loanword, not yet reviewed.
  navOffers: { en: 'Offers', bn: 'অফার' },

  // --- Stock list ---
  stockTitle: { en: 'Stock', bn: 'মাল' },
  stockSearchPlaceholder: { en: 'Search stock...', bn: 'মাল খুঁজুন...' },
  stockFilter: { en: 'Filter', bn: 'ছাঁকুন' },
  stockEmptyNoMatch: { en: 'No items match your filters', bn: 'কোনো কিছু মিলছে না' },

  // --- Add item: essentials card ---
  addItemTitle: { en: 'Add item', bn: 'নতুন মাল যোগ করুন' },
  addItemNameLabel: { en: 'Name', bn: 'নাম' },
  addItemImageLabel: { en: 'Image', bn: 'ছবি' },
  addItemUploadImage: { en: 'Upload image', bn: 'ছবি দিন' },
  addItemChangePhoto: { en: 'Change photo', bn: 'ছবি পাল্টান' },
  addItemQuantityLabel: { en: 'Quantity', bn: 'কতগুলো' },
  addItemPurchasePriceLabel: { en: 'Purchase price', bn: 'কেনা দাম' },
  addItemMarkupLabel: { en: 'Markup (× cost)', bn: 'কত গুণ দামে বেচবেন' },
  addItemMarkupHint: { en: 'Typical range', bn: 'সাধারণত এই রেঞ্জে' },
  addItemSuggestedPriceLabel: { en: 'Suggested sale price', bn: 'বেচা দাম (পরামর্শ)' },
  addItemSave: { en: 'Save', bn: 'সেভ করুন' },
  addItemSaveChanges: { en: 'Save changes', bn: 'বদল সেভ করুন' },
  addItemEditTitle: { en: 'Edit item', bn: 'মাল বদলান' },
  addItemBatchToggleOn: { en: '− Bought as a single item instead', bn: '− না, একটাই কিনেছি' },
  addItemBatchToggleOff: { en: 'Bought as a batch or tray?', bn: 'একসাথে/পাল্লা ধরে কিনেছেন?' },
  addItemMoreDetailsOpen: { en: '− Fewer details', bn: '− কম তথ্য' },
  addItemMoreDetailsClosed: { en: '+ More details', bn: '+ আরও তথ্য' },
  addItemPricingOptionsOpen: { en: '− Fewer ways to set the price', bn: '− দাম ঠিক করার কম উপায়' },
  addItemPricingOptionsClosed: {
    en: 'Bought as a batch, paid in another currency, or built from parts?',
    bn: 'একসাথে কিনেছেন, অন্য মুদ্রায় দাম দিয়েছেন, নাকি কয়েকটা খরচ যোগ করে দাম হয়েছে?',
  },

  // --- Settings ---
  settingsTitle: { en: 'Settings', bn: 'সেটিংস' },
  settingsCurrencyLabel: { en: 'Currency', bn: 'মুদ্রা' },
  settingsLanguageLabel: { en: 'Language', bn: 'ভাষা' },
  settingsBusinessNameLabel: { en: 'Business name', bn: 'ব্যবসার নাম' },
  settingsBackupHeading: { en: 'Backup & transfer', bn: 'ব্যাকআপ ও স্থানান্তর' },
  settingsExportData: { en: 'Export data', bn: 'ডেটা এক্সপোর্ট করুন' },
  settingsImportData: { en: 'Import data', bn: 'ডেটা ইমপোর্ট করুন' },

  // --- Header icon buttons (P1.5 — icon-only buttons got a visible label;
  // see tuvara-ux-intuitivitet-analys.md). "headerCustomers" is the label
  // for what used to be a bare QR-code icon hiding two customer-related
  // actions — no glossary entry, my own draft. ---
  headerCustomers: { en: 'Customers', bn: 'ক্রেতা' },
  headerShareCard: { en: 'Share my card', bn: 'আমার কার্ড শেয়ার করুন' },
  headerAddCustomer: { en: 'Add a customer', bn: 'নতুন ক্রেতা যোগ করুন' },
  headerSettings: { en: 'Settings', bn: 'সেটিংস' },
  headerMore: { en: 'More', bn: 'আরও' },

  // --- First-run intro (P1.6) — content is not new copy, it's the
  // already-vetted "3 rules" (pocket.html) and "5 things you can do"
  // (tuvara_walkthrough_shoilee.pdf) condensed into 4 in-app screens, so a
  // prospect exploring alone (which the walkthrough PDF explicitly
  // encourages — "your own pace, your own time") isn't left with only the
  // complex Add-item card and no orientation. Bangla lines here are new
  // drafts, same unreviewed-by-native-speaker caveat as the rest of the
  // file. ---
  introStep1Title: { en: 'Three things worth knowing', bn: 'শুরুর আগে তিনটে কথা' },
  introStep1Money: { en: 'It never touches your money', bn: 'কখনো আপনার টাকা ছোঁয় না' },
  introStep1Shop: { en: 'It never builds you a new shop', bn: 'কখনো নতুন দোকান বানায় না' },
  introStep1Guess: { en: 'It never decides silently', bn: 'কখনো চুপচাপ সিদ্ধান্ত নেয় না' },
  introStep2Title: { en: 'Add a piece', bn: 'নতুন মাল যোগ করুন' },
  introStep2Body: {
    en: 'Tap the + button. Snap a photo, or just describe it out loud or in writing — no form to fill in first.',
    bn: '+ বাটনে চাপুন। একটা ছবি তুলুন, বা মুখে বলুন বা লিখুন — আগে কোনো ফর্ম পূরণ করতে হবে না।',
  },
  introStep3Title: { en: 'Fair price, ready-to-post text', bn: 'ন্যায্য দাম, রেডি ক্যাপশন' },
  introStep3Body: {
    en: "Tuvara suggests a price for each item and writes a caption ready to copy into WhatsApp, Facebook or Instagram. You can always adjust it.",
    bn: 'টুভারা প্রতিটা জিনিসের জন্য একটা দাম আর হোয়াটসঅ্যাপ/ফেসবুক/ইনস্টাগ্রামে দেওয়ার মতো একটা লেখা তৈরি করে দেয়। আপনি সবসময় বদলাতে পারবেন।',
  },
  introStep4Title: { en: "See what's selling", bn: 'কী বিক্রি হচ্ছে দেখুন' },
  introStep4Body: {
    en: "A quick picture of what's sold and what's sitting unsold. If someone buys now and pays later, track that here too.",
    bn: 'কী বিক্রি হয়েছে আর কী পড়ে আছে, তার একটা সহজ ছবি। কেউ এখন কিনে পরে দাম দিলে, সেটাও এখানে রাখতে পারবেন।',
  },
  introSkip: { en: 'Skip', bn: 'বাদ দিন' },
  introNext: { en: 'Next', bn: 'পরের' },
  introBack: { en: 'Back', bn: 'আগের' },
  introDone: { en: "Got it, let's go", bn: 'বুঝেছি, শুরু করি' },
} as const satisfies Record<string, StringEntry>;

export type StringKey = keyof typeof STRINGS;

import type { Customer, CustomerDebt } from './types';

/**
 * Fixed, hand-written বাকি reminder templates — no AI/LLM call, same
 * "template strings, no per-message cost, works offline" principle as
 * adCopy.ts. Picks a softer or firmer tone based on how many reminders
 * have already been sent for this specific debt.
 *
 * IMPORTANT: these exact Bangla sentences have NOT been reviewed by a
 * native speaker. Do not send any of these to a real customer until Ru or
 * Tumpa has confirmed the wording and tone are right — this is placeholder
 * copy for the mockup, not vetted communication.
 */

function buildMessage(customer: Customer, debt: CustomerDebt, currencySymbol: string): string {
  const amountLine = `${debt.amount} ${currencySymbol}`;

  if (debt.reminderCount <= 0) {
    return (
      `আসসালামু আলাইকুম ${customer.name}, আশা করি ভালো আছেন। ` +
      `একটা ছোট রিমাইন্ডার — আপনার কাছে ${amountLine} বাকি আছে আমাদের কাছে। ` +
      `সময় করে দেখবেন, ধন্যবাদ! 🙂`
    );
  }

  if (debt.reminderCount === 1) {
    return (
      `আসসালামু আলাইকুম ${customer.name}, আবার একটু মনে করিয়ে দিচ্ছি — ` +
      `আপনার কাছে ${amountLine} বাকি এখনো রয়ে গেছে। ` +
      `যদি সুবিধামতো সময়ে পরিশোধ করতে পারেন তাহলে খুব ভালো হয়। ধন্যবাদ।`
    );
  }

  return (
    `${customer.name}, এটা ${amountLine} বাকির ব্যাপারে তৃতীয়বার মনে করিয়ে দিচ্ছি। ` +
    `এই সপ্তাহের মধ্যে পরিশোধ করার একটা সময় ঠিক করে জানালে ভালো হয়। ধন্যবাদ।`
  );
}

/** Builds the wa.me link with the right template pre-filled — same
 *  digits-only + encodeURIComponent pattern already used in
 *  WhatsAppCardSheet.tsx. Returns undefined if the customer has no phone
 *  number saved yet, since there's nowhere to send it. */
export function buildDebtReminderLink(
  customer: Customer,
  debt: CustomerDebt,
  currencySymbol: string
): string | undefined {
  const digitsOnly = (customer.phone ?? '').replace(/[^\d]/g, '');
  if (!digitsOnly) return undefined;
  const message = buildMessage(customer, debt, currencySymbol);
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

/** Exposed separately from the link builder so the sheet can show a preview
 *  of the message text even before a phone number is on file. */
export function previewDebtReminderMessage(
  customer: Customer,
  debt: CustomerDebt,
  currencySymbol: string
): string {
  return buildMessage(customer, debt, currencySymbol);
}

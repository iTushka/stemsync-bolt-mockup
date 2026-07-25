import type { Customer, CustomerDebt } from './types';

function formatICSDate(ts: number): string {
  return new Date(ts).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Builds a downloadable .ics file for a বাকি follow-up — opens the phone's
 *  own calendar app with the event prefilled. Same pattern as the separate
 *  tuvara-faltagent repo's follow-up reminder (no shared import possible,
 *  two standalone codebases, but no reason to invent this twice). Deliberately
 *  not a push notification: no permission dialog, no service worker, behaves
 *  the same on iOS and Android. */
export function downloadDebtFollowUp(customer: Customer, debt: CustomerDebt, currencySymbol: string): void {
  if (!debt.followUpDate) return;

  const start = formatICSDate(debt.followUpDate);
  const end = formatICSDate(debt.followUpDate + 30 * 60 * 1000);
  const summary = `Följ upp বাকি: ${customer.name}, ${debt.amount} ${currencySymbol}`;
  const description = debt.note ? debt.note : `Skuld hos ${customer.name}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stemsync//SV',
    'BEGIN:VEVENT',
    `UID:${debt.id}@stemsync`,
    `DTSTAMP:${formatICSDate(Date.now())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foljupp-baki-${customer.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedCustomerMessage {
  name?: string;
  consented: boolean;
}

/**
 * Extracts a name and a consent flag from a pasted WhatsApp reply. Built to
 * match the pre-filled message template from the QR card ("My name: ___" /
 * an "agree"/"consent" line), but tolerant of minor edits — customers often
 * rewrite the message a little before sending.
 */
export function parseCustomerMessage(text: string): ParsedCustomerMessage {
  const cleaned = text.trim();

  const nameMatch = cleaned.match(/my name[:\s]+([^\n]+)/i);
  const name = nameMatch
    ? nameMatch[1].trim().replace(/[.!]+$/, '')
    : undefined;

  const consented = /\b(agree|consent|yes|ok(ay)?)\b/i.test(cleaned);

  return { name, consented };
}

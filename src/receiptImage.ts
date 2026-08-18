import { toBlob } from 'html-to-image';

/** Renders a DOM node (the offscreen ReceiptLayout instance) to a PNG blob
 *  and shares/downloads it. Used by the "Image" button in QuoteCard.tsx —
 *  see tuvara-perioder-analys.md-style reasoning: a raster image can never
 *  have a clickable link inside it, so the real contact/social links are
 *  also passed as `shareText` and travel as plain text, which WhatsApp and
 *  most messaging apps auto-linkify on their own.
 *
 * Prefers the Web Share API's file-sharing (Level 2) so one tap opens the
 * phone's normal share sheet with the image already attached — the same
 * "share directly into WhatsApp" flow already used for the QR business
 * card (WhatsAppCardSheet.tsx uses a link instead since it has no image to
 * attach). Falls back to a plain download when file-sharing isn't
 * supported (most desktop browsers, some older mobile browsers) — the
 * image still ends up on the device, just not pre-attached to a chat.
 */
export async function shareReceiptImage(
  node: HTMLElement,
  fileName: string,
  shareText: string
): Promise<'shared' | 'downloaded' | 'failed'> {
  let blob: Blob | null;
  try {
    blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
  } catch {
    return 'failed';
  }
  if (!blob) return 'failed';

  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], text: shareText });
      return 'shared';
    } catch {
      // user cancelled the share sheet — not an error, don't fall through to download
      return 'shared';
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

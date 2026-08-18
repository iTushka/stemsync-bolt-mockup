import type { PrintFormat } from './types';

/** One CSS config per supported paper format. Widths/font sizes are tuned
 *  for common thermal receipt-printer rolls (58mm/80mm), leaving a small
 *  margin inside the physical roll width so nothing gets clipped by the
 *  printer's own unprintable edge. A4 uses generous margins since it's a
 *  full sheet, not a continuous roll. */
interface PrintFormatConfig {
  label: string;
  pageSize: string;
  pageMargin: string;
  contentWidth: string;
  fontSize: string;
}

export const PRINT_FORMATS: Record<PrintFormat, PrintFormatConfig> = {
  a4: {
    label: 'A4 (regular printer)',
    pageSize: 'A4',
    pageMargin: '15mm',
    contentWidth: '100%',
    fontSize: '14px',
  },
  thermal80: {
    label: 'Receipt printer — 80mm',
    pageSize: '80mm auto',
    pageMargin: '3mm',
    contentWidth: '74mm',
    fontSize: '12px',
  },
  thermal58: {
    label: 'Receipt printer — 58mm',
    pageSize: '58mm auto',
    pageMargin: '2mm',
    contentWidth: '52mm',
    fontSize: '10px',
  },
};

const STYLE_TAG_ID = 'tuvara-print-page-style';

/** Injects (or replaces) a single <style> tag with the @page rule and
 *  content width/font-size for the chosen format, right before
 *  window.print() is called. @page can't be scoped to a class selector
 *  reliably across browsers, so this rewrites the whole tag per print
 *  instead — the standard workaround for variable-width receipt-printer
 *  support in a web app. */
export function applyPrintFormat(format: PrintFormat): void {
  const cfg = PRINT_FORMATS[format];
  let styleEl = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_TAG_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @page { size: ${cfg.pageSize}; margin: ${cfg.pageMargin}; }
    @media print {
      .receipt-print-root {
        width: ${cfg.contentWidth} !important;
        font-size: ${cfg.fontSize} !important;
      }
    }
  `;
}

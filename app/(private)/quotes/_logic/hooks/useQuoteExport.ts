"use client";

import { useState, useCallback } from "react";
import { downloadQuotePdf } from "../services/downloadQuotePdf";
import type { QuoteDetail } from "../types/domain";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useQuoteExport() {
  const [isExporting, setIsExporting] = useState(false);

  const downloadPdf = useCallback(async (quote: QuoteDetail) => {
    setIsExporting(true);
    try {
      const blob = await downloadQuotePdf(quote.id);
      const folioLabel = quote.folioPrefix ? `${quote.folioPrefix}-${quote.folioNumber}` : String(quote.folioNumber);
      triggerDownload(blob, `cotizacion-${folioLabel}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, downloadPdf };
}

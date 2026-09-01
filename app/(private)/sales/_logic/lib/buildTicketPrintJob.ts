import type { SaleDetail } from "../types/domain";
import type { TicketSettingsDto } from "../../../settings/_logic/types/api";
import type { TicketPrintJob } from "../types/ticketPrintJob";
import { resolveTicketConditionsLine } from "./resolveTicketConditionsLine";

const DEFAULT_LOGO_PATH = "/logo.png";

/**
 * Pure builder for the ESC/POS print job payload — same content/order as
 * `PrintableTicket.tsx`'s HTML rendering, so both mechanisms stay in sync.
 * Takes no DOM/window dependency beyond resolving a relative logo path against
 * an explicit origin, so it can run identically in the browser or in tests.
 */
export function buildTicketPrintJob(sale: SaleDetail, ticketSettings: TicketSettingsDto | null, origin: string): TicketPrintJob {
  const ivaTotal = sale.items.reduce((sum, item) => sum + item.lineIva, 0);
  const iepsTotal = sale.items.reduce((sum, item) => sum + item.lineIeps, 0);

  const logoPath = ticketSettings?.logoUrl ?? DEFAULT_LOGO_PATH;
  const logoUrl = logoPath.startsWith("http") ? logoPath : `${origin}${logoPath}`;

  return {
    paperWidth: ticketSettings?.paperWidth ?? "80mm",
    logoUrl,
    business: {
      name: ticketSettings?.businessName ?? null,
      rfc: ticketSettings?.businessRfc ?? null,
      address: ticketSettings?.businessAddress ?? null,
      phone: ticketSettings?.businessPhone ?? null,
      taxRegime: ticketSettings?.businessTaxRegime ?? null,
    },
    meta: {
      folioCode: sale.folioCode,
      date: sale.createdAt.toISOString(),
      cashierName: sale.cashierName ?? sale.cashierId.slice(0, 8),
      branchName: sale.branchName ?? "—",
      paymentMethodName: sale.paymentMethodName ?? "—",
    },
    customer: sale.customerId
      ? {
          rfc: sale.customerRfc ?? "—",
          name: sale.customerName ?? "—",
          address: sale.customerAddress ?? "—",
        }
      : null,
    conditionsLine: resolveTicketConditionsLine(sale),
    items: sale.items.map((item) => ({
      name: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    totals: {
      subtotal: sale.subtotal,
      iva: ivaTotal,
      ieps: iepsTotal,
      total: sale.total,
    },
    footerText: ticketSettings?.footerText ?? null,
    legendText: ticketSettings?.legendText ?? null,
  };
}

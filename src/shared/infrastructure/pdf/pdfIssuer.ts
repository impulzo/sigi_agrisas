import type { TicketSettings } from "@/modules/settings/domain/entities/TicketSettings";

export interface PdfIssuer {
  businessName: string | null;
  businessRfc: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  logoUrl: string | null;
}

export function toPdfIssuer(settings: TicketSettings): PdfIssuer {
  return {
    businessName: settings.businessName,
    businessRfc: settings.businessRfc,
    businessAddress: settings.businessAddress,
    businessPhone: settings.businessPhone,
    logoUrl: settings.logoUrl,
  };
}

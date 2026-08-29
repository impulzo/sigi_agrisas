export type PaperWidthDto = "58mm" | "80mm";

export interface TicketSettingsDto {
  logoUrl: string | null;
  footerText: string | null;
  paperWidth: PaperWidthDto;
  businessName: string | null;
  businessRfc: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessTaxRegime: string | null;
  businessZipCode: string | null;
  legendText: string | null;
}

export interface UpdateTicketSettingsBody {
  footerText?: string | null;
  paperWidth?: PaperWidthDto;
  businessName?: string | null;
  businessRfc?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessTaxRegime?: string | null;
  businessZipCode?: string | null;
  legendText?: string | null;
}

export interface PricingSettingsDto {
  dosificationSurchargePct: number;
}

export interface UpdatePricingSettingsBody {
  dosificationSurchargePct: number;
}

export interface InventoryNotificationSettingsDto {
  expirationNotificationEmail: string | null;
}

export interface UpdateInventoryNotificationSettingsBody {
  expirationNotificationEmail: string | null;
}

import type { PrinterConfig } from "../../domain/entities/PrinterConfig";

export interface UpdatePrinterConfigData {
  printMode?: "browser" | "escpos";
  agentUrl?: string | null;
  printerHost?: string | null;
  printerPort?: number | null;
}

export interface PrinterConfigRepository {
  getByBranchId(branchId: string): Promise<PrinterConfig>;
  upsert(branchId: string, data: UpdatePrinterConfigData): Promise<PrinterConfig>;
}

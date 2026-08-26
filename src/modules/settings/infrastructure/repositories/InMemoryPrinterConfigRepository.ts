import type { PrinterConfigRepository, UpdatePrinterConfigData } from "../../application/ports/PrinterConfigRepository";
import { DEFAULT_PRINTER_CONFIG, type PrinterConfig } from "../../domain/entities/PrinterConfig";

export class InMemoryPrinterConfigRepository implements PrinterConfigRepository {
  private byBranchId = new Map<string, PrinterConfig>();

  async getByBranchId(branchId: string): Promise<PrinterConfig> {
    return this.byBranchId.get(branchId) ?? DEFAULT_PRINTER_CONFIG;
  }

  async upsert(branchId: string, data: UpdatePrinterConfigData): Promise<PrinterConfig> {
    const base = this.byBranchId.get(branchId) ?? DEFAULT_PRINTER_CONFIG;
    const updated: PrinterConfig = {
      printMode: data.printMode ?? base.printMode,
      agentUrl: data.agentUrl !== undefined ? data.agentUrl : base.agentUrl,
      printerHost: data.printerHost !== undefined ? data.printerHost : base.printerHost,
      printerPort: data.printerPort !== undefined ? data.printerPort : base.printerPort,
    };
    this.byBranchId.set(branchId, updated);
    return updated;
  }
}

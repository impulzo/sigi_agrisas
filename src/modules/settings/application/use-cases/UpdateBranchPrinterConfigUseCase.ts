import type { PrinterConfigRepository, UpdatePrinterConfigData } from "../ports/PrinterConfigRepository";
import type { PrinterConfig } from "../../domain/entities/PrinterConfig";

export class IncompletePrinterConfigError extends Error {
  constructor() {
    super("printMode 'escpos' requires both agentUrl and printerHost");
    this.name = "IncompletePrinterConfigError";
  }
}

export class UpdateBranchPrinterConfigUseCase {
  constructor(private readonly repo: PrinterConfigRepository) {}

  async execute(branchId: string, data: UpdatePrinterConfigData): Promise<PrinterConfig> {
    const current = await this.repo.getByBranchId(branchId);
    const merged: PrinterConfig = {
      printMode: data.printMode ?? current.printMode,
      agentUrl: data.agentUrl !== undefined ? data.agentUrl : current.agentUrl,
      printerHost: data.printerHost !== undefined ? data.printerHost : current.printerHost,
      printerPort: data.printerPort !== undefined ? data.printerPort : current.printerPort,
    };
    if (merged.printMode === "escpos" && (!merged.agentUrl || !merged.printerHost)) {
      throw new IncompletePrinterConfigError();
    }
    return this.repo.upsert(branchId, data);
  }
}

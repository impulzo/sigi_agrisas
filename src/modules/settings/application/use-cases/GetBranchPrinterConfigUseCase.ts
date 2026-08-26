import type { PrinterConfigRepository } from "../ports/PrinterConfigRepository";
import type { PrinterConfig } from "../../domain/entities/PrinterConfig";

export class GetBranchPrinterConfigUseCase {
  constructor(private readonly repo: PrinterConfigRepository) {}

  async execute(branchId: string): Promise<PrinterConfig> {
    return this.repo.getByBranchId(branchId);
  }
}

import { PrismaClient } from "@prisma/client";
import type { PrinterConfigRepository, UpdatePrinterConfigData } from "../../application/ports/PrinterConfigRepository";
import { DEFAULT_PRINTER_CONFIG, type PrinterConfig, type PrintMode } from "../../domain/entities/PrinterConfig";

function toEntity(row: { printMode: string; agentUrl: string | null; printerHost: string | null; printerPort: number | null }): PrinterConfig {
  return {
    printMode: row.printMode as PrintMode,
    agentUrl: row.agentUrl,
    printerHost: row.printerHost,
    printerPort: row.printerPort,
  };
}

export class PrismaPrinterConfigRepository implements PrinterConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByBranchId(branchId: string): Promise<PrinterConfig> {
    const row = await this.prisma.branchPrinterConfig.findUnique({ where: { branchId } });
    return row ? toEntity(row) : DEFAULT_PRINTER_CONFIG;
  }

  async upsert(branchId: string, data: UpdatePrinterConfigData): Promise<PrinterConfig> {
    const current = await this.prisma.branchPrinterConfig.findUnique({ where: { branchId } });
    const row = await this.prisma.branchPrinterConfig.upsert({
      where: { branchId },
      create: {
        branchId,
        printMode: data.printMode ?? DEFAULT_PRINTER_CONFIG.printMode,
        agentUrl: data.agentUrl ?? DEFAULT_PRINTER_CONFIG.agentUrl,
        printerHost: data.printerHost ?? DEFAULT_PRINTER_CONFIG.printerHost,
        printerPort: data.printerPort ?? current?.printerPort ?? 9100,
      },
      update: {
        ...(data.printMode !== undefined ? { printMode: data.printMode } : {}),
        ...(data.agentUrl !== undefined ? { agentUrl: data.agentUrl } : {}),
        ...(data.printerHost !== undefined ? { printerHost: data.printerHost } : {}),
        ...(data.printerPort !== undefined ? { printerPort: data.printerPort } : {}),
      },
    });
    return toEntity(row);
  }
}

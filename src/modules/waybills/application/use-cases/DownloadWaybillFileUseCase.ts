import { WaybillRepository } from "../ports/WaybillRepository";
import { WaybillFacturamaGateway, WaybillDownloadResult } from "../ports/WaybillFacturamaGateway";
import { WaybillNotFoundError, WaybillNotStampedError } from "../../domain/errors";

export class DownloadWaybillFileUseCase {
  constructor(
    private readonly waybillRepo: WaybillRepository,
    private readonly gateway: WaybillFacturamaGateway
  ) {}

  async execute(id: string, format: "pdf" | "xml"): Promise<WaybillDownloadResult & { filename: string }> {
    const waybill = await this.waybillRepo.findById(id);
    if (!waybill) throw new WaybillNotFoundError(id);
    if (!waybill.facturamaCfdiId) throw new WaybillNotStampedError(id);

    const result = await this.gateway.download(format, waybill.facturamaCfdiId);
    return {
      ...result,
      filename: `carta-porte-${waybill.cfdiUuid ?? waybill.id}.${format}`,
    };
  }
}

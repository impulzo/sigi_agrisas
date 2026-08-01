import { WaybillRepository } from "../ports/WaybillRepository";
import { WaybillFacturamaGateway } from "../ports/WaybillFacturamaGateway";
import { Waybill } from "../../domain/entities/Waybill";
import { WaybillNotFoundError, WaybillAlreadyCancelledError } from "../../domain/errors";

export class CancelWaybillUseCase {
  constructor(
    private readonly waybillRepo: WaybillRepository,
    private readonly gateway: WaybillFacturamaGateway
  ) {}

  async execute(id: string, cancelledBy: string, cancellationReason: string): Promise<Waybill> {
    const existing = await this.waybillRepo.findById(id);
    if (!existing) throw new WaybillNotFoundError(id);
    if (existing.isCancelled()) throw new WaybillAlreadyCancelledError(id);

    const cancelStamp = existing.facturamaCfdiId
      ? async () => {
          await this.gateway.cancel(existing.facturamaCfdiId!, "01");
        }
      : null;

    return this.waybillRepo.markCancelled(id, cancelledBy, cancellationReason, cancelStamp);
  }
}

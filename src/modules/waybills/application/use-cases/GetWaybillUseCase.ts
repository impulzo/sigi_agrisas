import { WaybillRepository } from "../ports/WaybillRepository";
import { Waybill } from "../../domain/entities/Waybill";
import { WaybillNotFoundError } from "../../domain/errors";

export class GetWaybillUseCase {
  constructor(private readonly waybillRepo: WaybillRepository) {}

  async execute(id: string): Promise<Waybill> {
    const waybill = await this.waybillRepo.findById(id);
    if (!waybill) throw new WaybillNotFoundError(id);
    return waybill;
  }
}

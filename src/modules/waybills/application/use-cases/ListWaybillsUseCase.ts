import { WaybillRepository, ListWaybillsOptions, ListWaybillsResult } from "../ports/WaybillRepository";

export class ListWaybillsUseCase {
  constructor(private readonly waybillRepo: WaybillRepository) {}

  async execute(options: ListWaybillsOptions): Promise<ListWaybillsResult> {
    return this.waybillRepo.list(options);
  }
}

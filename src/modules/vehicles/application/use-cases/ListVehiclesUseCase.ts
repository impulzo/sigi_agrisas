import { VehicleRepository } from "../ports/VehicleRepository";
import { ListVehiclesRequest } from "../dto/ListVehiclesRequest";
import { ListVehiclesResponse } from "../dto/ListVehiclesResponse";
import { toVehicleDto } from "../mappers/toVehicleDto";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export class ListVehiclesUseCase {
  constructor(private readonly repo: VehicleRepository) {}

  async execute(req: ListVehiclesRequest): Promise<ListVehiclesResponse> {
    const page = Math.max(1, req.page);
    const pageSize = Math.min(req.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { items, total } = await this.repo.findAll({
      page,
      pageSize,
      includeInactive: req.includeInactive,
      search: req.search,
    });

    return {
      items: items.map(toVehicleDto),
      total,
      page,
      pageSize,
    };
  }
}

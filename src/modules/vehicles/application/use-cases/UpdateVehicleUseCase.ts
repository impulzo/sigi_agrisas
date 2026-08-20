import { VehicleRepository } from "../ports/VehicleRepository";
import { UpdateVehicleRequest } from "../dto/UpdateVehicleRequest";
import { VehicleDto } from "../dto/VehicleDto";
import { toVehicleDto } from "../mappers/toVehicleDto";

export class UpdateVehicleUseCase {
  constructor(private readonly repo: VehicleRepository) {}

  async execute(id: string, req: UpdateVehicleRequest): Promise<VehicleDto> {
    const vehicle = await this.repo.update(id, req);
    return toVehicleDto(vehicle);
  }
}

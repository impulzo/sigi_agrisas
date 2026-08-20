import { VehicleRepository } from "../ports/VehicleRepository";
import { CreateVehicleRequest } from "../dto/CreateVehicleRequest";
import { VehicleDto } from "../dto/VehicleDto";
import { toVehicleDto } from "../mappers/toVehicleDto";

export class CreateVehicleUseCase {
  constructor(private readonly repo: VehicleRepository) {}

  async execute(req: CreateVehicleRequest): Promise<VehicleDto> {
    const vehicle = await this.repo.create(req);
    return toVehicleDto(vehicle);
  }
}

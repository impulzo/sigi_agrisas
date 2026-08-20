import { VehicleRepository } from "../ports/VehicleRepository";
import { VehicleDto } from "../dto/VehicleDto";
import { toVehicleDto } from "../mappers/toVehicleDto";
import { VehicleNotFoundError } from "../../domain/errors/VehicleNotFoundError";

export class GetVehicleUseCase {
  constructor(private readonly repo: VehicleRepository) {}

  async execute(id: string): Promise<VehicleDto> {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) throw new VehicleNotFoundError(id);
    return toVehicleDto(vehicle);
  }
}

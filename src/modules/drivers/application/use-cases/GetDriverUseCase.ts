import { DriverRepository } from "../ports/DriverRepository";
import { DriverDto } from "../dto/DriverDto";
import { toDriverDto } from "../mappers/toDriverDto";
import { DriverNotFoundError } from "../../domain/errors/DriverNotFoundError";

export class GetDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: string): Promise<DriverDto> {
    const driver = await this.repo.findById(id);
    if (!driver) throw new DriverNotFoundError(id);
    return toDriverDto(driver);
  }
}

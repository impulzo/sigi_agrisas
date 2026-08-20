import { DriverRepository } from "../ports/DriverRepository";
import { UpdateDriverRequest } from "../dto/UpdateDriverRequest";
import { DriverDto } from "../dto/DriverDto";
import { toDriverDto } from "../mappers/toDriverDto";

export class UpdateDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: string, req: UpdateDriverRequest): Promise<DriverDto> {
    const driver = await this.repo.update(id, req);
    return toDriverDto(driver);
  }
}

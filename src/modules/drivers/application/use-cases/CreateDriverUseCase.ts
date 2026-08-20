import { DriverRepository } from "../ports/DriverRepository";
import { CreateDriverRequest } from "../dto/CreateDriverRequest";
import { DriverDto } from "../dto/DriverDto";
import { toDriverDto } from "../mappers/toDriverDto";

export class CreateDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(req: CreateDriverRequest): Promise<DriverDto> {
    const driver = await this.repo.create(req);
    return toDriverDto(driver);
  }
}

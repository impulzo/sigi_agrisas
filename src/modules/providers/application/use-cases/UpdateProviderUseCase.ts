import { ProviderRepository } from "../ports/ProviderRepository";
import { UpdateProviderRequest } from "../dto/UpdateProviderRequest";
import { ProviderDto } from "../dto/ProviderDto";
import { toProviderDto } from "../mappers/toProviderDto";

export class UpdateProviderUseCase {
  constructor(private readonly repo: ProviderRepository) {}

  async execute(id: string, req: UpdateProviderRequest): Promise<ProviderDto> {
    const provider = await this.repo.update(id, req);
    return toProviderDto(provider);
  }
}

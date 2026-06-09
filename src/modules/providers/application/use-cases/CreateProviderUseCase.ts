import { ProviderRepository } from "../ports/ProviderRepository";
import { CreateProviderRequest } from "../dto/CreateProviderRequest";
import { ProviderDto } from "../dto/ProviderDto";
import { toProviderDto } from "../mappers/toProviderDto";

export class CreateProviderUseCase {
  constructor(private readonly repo: ProviderRepository) {}

  async execute(req: CreateProviderRequest): Promise<ProviderDto> {
    const provider = await this.repo.create(req);
    return toProviderDto(provider);
  }
}

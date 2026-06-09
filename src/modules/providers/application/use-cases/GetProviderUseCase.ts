import { ProviderRepository } from "../ports/ProviderRepository";
import { ProviderDto } from "../dto/ProviderDto";
import { toProviderDto } from "../mappers/toProviderDto";
import { ProviderNotFoundError } from "../../domain/errors/ProviderNotFoundError";

export class GetProviderUseCase {
  constructor(private readonly repo: ProviderRepository) {}

  async execute(id: string): Promise<ProviderDto> {
    const provider = await this.repo.findById(id);
    if (!provider) throw new ProviderNotFoundError(id);
    return toProviderDto(provider);
  }
}

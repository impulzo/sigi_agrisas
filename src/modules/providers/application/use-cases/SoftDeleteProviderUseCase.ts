import { ProviderRepository } from "../ports/ProviderRepository";

export class SoftDeleteProviderUseCase {
  constructor(private readonly repo: ProviderRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}

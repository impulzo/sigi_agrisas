import { ProviderRepository } from "../ports/ProviderRepository";
import { ProviderHasDepartmentsError } from "../../domain/errors/ProviderHasDepartmentsError";

export class SoftDeleteProviderUseCase {
  constructor(private readonly repo: ProviderRepository) {}

  async execute(id: string): Promise<void> {
    const count = await this.repo.countActiveDepartmentsByProvider(id);
    if (count > 0) throw new ProviderHasDepartmentsError(count);
    await this.repo.softDelete(id);
  }
}

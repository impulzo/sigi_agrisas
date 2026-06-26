import { DepartmentRepository, CreateDepartmentData } from "@/modules/departments/application/ports/DepartmentRepository";
import { DepartmentDto, toDepartmentDto } from "@/modules/departments/application/dto/DepartmentDto";
import { ProviderRepository } from "@/modules/providers/application/ports/ProviderRepository";
import { ProviderNotFoundOrInactiveError } from "@/modules/departments/domain/errors/ProviderNotFoundOrInactiveError";

export class CreateDepartmentUseCase {
  constructor(
    private readonly repo: DepartmentRepository,
    private readonly providerRepo: ProviderRepository,
  ) {}

  async execute(data: CreateDepartmentData): Promise<DepartmentDto> {
    if (data.providerId) {
      const provider = await this.providerRepo.findById(data.providerId);
      if (!provider || !provider.isActive) throw new ProviderNotFoundOrInactiveError();
    }
    return toDepartmentDto(await this.repo.create(data));
  }
}

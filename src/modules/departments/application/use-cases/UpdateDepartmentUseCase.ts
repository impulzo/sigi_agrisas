import { DepartmentRepository, UpdateDepartmentData } from "@/modules/departments/application/ports/DepartmentRepository";
import { DepartmentDto, toDepartmentDto } from "@/modules/departments/application/dto/DepartmentDto";
import { ProviderRepository } from "@/modules/providers/application/ports/ProviderRepository";
import { ProviderNotFoundOrInactiveError } from "@/modules/departments/domain/errors/ProviderNotFoundOrInactiveError";

export interface UpdateDepartmentRequest extends UpdateDepartmentData { id: string; }

export class UpdateDepartmentUseCase {
  constructor(
    private readonly repo: DepartmentRepository,
    private readonly providerRepo: ProviderRepository,
  ) {}

  async execute(req: UpdateDepartmentRequest): Promise<DepartmentDto> {
    const { id, ...data } = req;
    if (data.providerId) {
      const provider = await this.providerRepo.findById(data.providerId);
      if (!provider || !provider.isActive) throw new ProviderNotFoundOrInactiveError();
    }
    return toDepartmentDto(await this.repo.update(id, data));
  }
}

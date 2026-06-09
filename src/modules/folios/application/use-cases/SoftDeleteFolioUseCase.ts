import { FolioRepository } from "@/modules/folios/application/ports/FolioRepository";

export class SoftDeleteFolioUseCase {
  constructor(private readonly repo: FolioRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}

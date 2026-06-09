import { FolioRepository } from "@/modules/folios/application/ports/FolioRepository";
import { FolioDto, toFolioDto } from "@/modules/folios/application/dto/FolioDto";
import { FolioNotFoundError } from "@/modules/folios/domain/errors/FolioNotFoundError";

export class GetFolioUseCase {
  constructor(private readonly repo: FolioRepository) {}

  async execute(id: string): Promise<FolioDto> {
    const f = await this.repo.findById(id);
    if (!f) throw new FolioNotFoundError();
    return toFolioDto(f);
  }
}

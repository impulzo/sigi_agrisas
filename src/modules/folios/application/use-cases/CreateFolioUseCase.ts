import { FolioRepository, CreateFolioData } from "@/modules/folios/application/ports/FolioRepository";
import { FolioDto, toFolioDto } from "@/modules/folios/application/dto/FolioDto";

export class CreateFolioUseCase {
  constructor(private readonly repo: FolioRepository) {}

  async execute(data: CreateFolioData): Promise<FolioDto> {
    const f = await this.repo.create(data);
    return toFolioDto(f);
  }
}

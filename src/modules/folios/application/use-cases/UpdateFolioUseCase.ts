import { FolioRepository, UpdateFolioData } from "@/modules/folios/application/ports/FolioRepository";
import { FolioDto, toFolioDto } from "@/modules/folios/application/dto/FolioDto";

export interface UpdateFolioRequest extends UpdateFolioData {
  id: string;
}

export class UpdateFolioUseCase {
  constructor(private readonly repo: FolioRepository) {}

  async execute(req: UpdateFolioRequest): Promise<FolioDto> {
    const { id, ...data } = req;
    const f = await this.repo.update(id, data);
    return toFolioDto(f);
  }
}

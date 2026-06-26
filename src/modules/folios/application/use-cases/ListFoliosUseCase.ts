import { FolioRepository } from "@/modules/folios/application/ports/FolioRepository";
import { FolioDto, toFolioDto } from "@/modules/folios/application/dto/FolioDto";
import { FolioScope } from "@/shared/domain/types/FolioScope";

export interface ListFoliosRequest {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  scope?: FolioScope;
}

export interface ListFoliosResponse {
  items: FolioDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListFoliosUseCase {
  constructor(private readonly repo: FolioRepository) {}

  async execute(req: ListFoliosRequest): Promise<ListFoliosResponse> {
    const { items, total } = await this.repo.findAll(req);
    return { items: items.map(toFolioDto), total, page: req.page, pageSize: req.pageSize };
  }
}

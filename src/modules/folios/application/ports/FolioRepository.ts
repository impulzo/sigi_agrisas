import { Folio } from "@/modules/folios/domain/entities/Folio";

export interface FindAllFoliosOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
}

export interface CreateFolioData {
  code: string;
  name: string;
  prefix?: string | null;
  currentNumber?: number;
  isActive?: boolean;
}

export interface UpdateFolioData {
  name?: string;
  prefix?: string | null;
  currentNumber?: number;
  isActive?: boolean;
}

export interface FolioRepository {
  findAll(opts: FindAllFoliosOptions): Promise<{ items: Folio[]; total: number }>;
  findById(id: string): Promise<Folio | null>;
  create(data: CreateFolioData): Promise<Folio>;
  update(id: string, data: UpdateFolioData): Promise<Folio>;
  softDelete(id: string): Promise<void>;
}

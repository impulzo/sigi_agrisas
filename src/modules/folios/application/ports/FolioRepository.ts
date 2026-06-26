import { Folio } from "@/modules/folios/domain/entities/Folio";
import { FolioScope } from "@/shared/domain/types/FolioScope";
import { AuditSequenceRaw } from "@/modules/folios/application/dto/FolioAuditDto";

export interface FindAllFoliosOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  scope?: FolioScope;
}

export interface CreateFolioData {
  code: string;
  name: string;
  scope: FolioScope;
  prefix?: string | null;
  currentNumber?: number;
  isActive?: boolean;
}

export interface UpdateFolioData {
  name?: string;
  prefix?: string | null;
  scope?: FolioScope;
  currentNumber?: number;
  isActive?: boolean;
}

export interface AuditCounts {
  withFolioNumber: number;
  withoutFolioNumber: number;
}

export interface FolioRepository {
  findAll(opts: FindAllFoliosOptions): Promise<{ items: Folio[]; total: number }>;
  findById(id: string): Promise<Folio | null>;
  create(data: CreateFolioData): Promise<Folio>;
  update(id: string, data: UpdateFolioData): Promise<Folio>;
  softDelete(id: string): Promise<void>;
  findAuditSequence(folioId: string): Promise<AuditSequenceRaw[]>;
  getAuditCounts(folioId: string): Promise<AuditCounts>;
}

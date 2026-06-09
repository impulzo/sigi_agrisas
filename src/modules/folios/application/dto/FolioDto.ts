import { Folio } from "@/modules/folios/domain/entities/Folio";

export interface FolioDto {
  id: string;
  code: string;
  name: string;
  prefix: string | null;
  currentNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toFolioDto(f: Folio): FolioDto {
  return {
    id: f.id,
    code: f.code,
    name: f.name,
    prefix: f.prefix,
    currentNumber: f.currentNumber,
    isActive: f.isActive,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

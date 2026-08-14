import { InventoryMovementType } from "../../domain/entities/InventoryMovement";

export interface KardexMovementDto {
  movementAt: string;
  branchId: string;
  movementType: InventoryMovementType;
  entrada: number;
  salida: number;
  saldo: number;
  unit: string;
  factor: number;
  serie: string | null;
  unitCost: number | null;
  unitPrice: number | null;
  folioCode: string | null;
  folioNumber: number | null;
  originFolioCode: string | null;
  originFolioNumber: number | null;
  customerId: string | null;
  providerId: string | null;
  status: string;
  notes: string | null;
}

export interface KardexReportResponseDto {
  product: {
    id: string;
    code: string;
    name: string;
    unit: string;
    unitDescription: string | null;
  };
  header: {
    existenciaTotal: number;
    existenciaAlmacen: number;
    saldoAnterior: number;
    saldoFinal: number;
  };
  movements: KardexMovementDto[];
}

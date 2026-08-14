export interface KardexMovementDto {
  movementAt: string;
  branchId: string;
  movementType: string;
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

export interface KardexReportDto {
  product: { id: string; code: string; name: string; unit: string; unitDescription: string | null };
  header: {
    existenciaTotal: number;
    existenciaAlmacen: number;
    saldoAnterior: number;
    saldoFinal: number;
  };
  movements: KardexMovementDto[];
}

export interface RebuildInventoryArticleDto {
  movementsRebuilt: number;
  previousQuantity: number;
  newQuantity: number;
}

export interface ProductOptionDto {
  id: string;
  code: string;
  name: string;
}

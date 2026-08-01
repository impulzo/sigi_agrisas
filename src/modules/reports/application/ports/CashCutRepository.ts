import { CashCutFilters, CashCutRawRow } from "../../domain/value-objects/CashCutFilters";

export interface CashCutRepository {
  findRows(filters: CashCutFilters): Promise<CashCutRawRow[]>;
}

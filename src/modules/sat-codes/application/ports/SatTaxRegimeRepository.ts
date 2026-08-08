import { SatCode } from "./SatCodeRepository";

export interface SatTaxRegimeRepository {
  search(query: string | undefined, limit: number): Promise<SatCode[]>;
}

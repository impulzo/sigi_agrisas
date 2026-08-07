import { SatCode } from "./SatCodeRepository";

export interface SatCfdiUseRepository {
  search(query: string | undefined, limit: number): Promise<SatCode[]>;
}

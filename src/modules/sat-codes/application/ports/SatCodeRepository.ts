export interface SatCode {
  code: string;
  description: string;
}

export interface SatCodeRepository {
  search(query: string | undefined, limit: number): Promise<SatCode[]>;
}

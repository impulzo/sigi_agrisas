export interface SatUnit {
  code: string;
  description: string;
}

export interface SatUnitRepository {
  search(query: string | undefined, limit: number): Promise<SatUnit[]>;
}

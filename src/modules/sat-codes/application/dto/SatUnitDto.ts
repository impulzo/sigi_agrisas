export interface SatUnitDto {
  code: string;
  description: string;
}

export interface SearchSatUnitsResponse {
  items: SatUnitDto[];
}

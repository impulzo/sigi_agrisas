export interface SatCodeDto {
  code: string;
  description: string;
}

export interface SearchSatCodesResponse {
  items: SatCodeDto[];
}

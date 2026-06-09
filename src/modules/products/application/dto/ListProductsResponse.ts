import { ProductDto } from "./ProductDto";

export interface ListProductsResponse {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
}

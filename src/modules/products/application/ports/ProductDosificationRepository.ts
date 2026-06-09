import { ProductDosification } from "../../domain/entities/ProductDosification";

export interface CreateProductDosificationData {
  productId: string;
  name: string;
  numParts: number;
  isActive: boolean;
}

export interface UpdateProductDosificationData {
  name?: string;
  numParts?: number;
  isActive?: boolean;
}

export interface ProductDosificationRepository {
  findByProductId(productId: string): Promise<ProductDosification[]>;
  findById(id: string): Promise<ProductDosification | null>;
  create(data: CreateProductDosificationData): Promise<ProductDosification>;
  update(id: string, data: UpdateProductDosificationData): Promise<ProductDosification>;
  softDelete(id: string): Promise<void>;
}

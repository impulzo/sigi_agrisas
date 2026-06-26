export interface ProductImageStoragePort {
  upload(productId: string, buffer: Buffer, mime: string, ext: string): Promise<string>;
  delete(url: string): Promise<void>;
}

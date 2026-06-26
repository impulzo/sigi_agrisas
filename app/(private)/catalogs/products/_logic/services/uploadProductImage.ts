import { authFetch } from "../../../../../_lib/authFetch";
import { ProductImageTooLargeError, ProductImageInvalidFormatError } from "../errors";

export async function uploadProductImage(
  productId: string,
  file: File,
  fetchImpl: typeof authFetch = authFetch,
): Promise<string> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetchImpl(`/api/v1/admin/products/${productId}/image`, {
    method: "POST",
    body,
  });

  if (res.status === 413) throw new ProductImageTooLargeError();
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    if ((data as { error?: string }).error === "Invalid image format") throw new ProductImageInvalidFormatError();
    throw new Error((data as { error?: string }).error ?? "Upload failed");
  }

  const { imageUrl } = (await res.json()) as { imageUrl: string };
  return imageUrl;
}

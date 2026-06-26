import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { ProductImageStoragePort } from "../../application/ports/ProductImageStoragePort";

const BUCKET = "product-images";

export class SupabaseProductImageStorage implements ProductImageStoragePort {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined");
    this.client = createClient(url, key);
    return this.client;
  }

  async upload(productId: string, buffer: Buffer, mime: string, ext: string): Promise<string> {
    const supabase = this.getClient();
    const key = `products/${productId}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: mime, upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }

  async delete(url: string): Promise<void> {
    const supabase = this.getClient();
    const marker = `/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const key = url.slice(idx + marker.length);
    await supabase.storage.from(BUCKET).remove([key]);
  }
}

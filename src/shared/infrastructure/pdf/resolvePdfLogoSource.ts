import { readFileSync } from "fs";
import { join } from "path";

const DEFAULT_LOGO_PATH = join(process.cwd(), "public", "logo.png");

/** Resuelve la fuente de logo para <Image> de @react-pdf/renderer.
 * Una ruta relativa tipo browser (ej. "/logo.png") no resuelve del lado servidor —
 * por eso el fallback local se lee a Buffer en vez de pasarse como string. */
export function resolvePdfLogoSource(logoUrl: string | null | undefined): string | Buffer {
  if (logoUrl && logoUrl.startsWith("https://")) {
    return logoUrl;
  }
  return readFileSync(DEFAULT_LOGO_PATH);
}

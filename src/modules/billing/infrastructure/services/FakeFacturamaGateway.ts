import { randomUUID } from "crypto";
import {
  FacturamaGateway,
  FacturамаStampInput,
  FacturamaStampResult,
  FacturamaCancelResult,
  FacturamaDownloadResult,
  FacturamaCsdInput,
  FacturamaCsdStatus,
} from "../../application/ports/FacturamaGateway";

const FAKE_PDF_BASE64 =
  "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwgL0xlbmd0aCAzIDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeJxjYGBg+M9QDwAEhAGBCg=="; // minimal PDF stub
const FAKE_XML_BASE64 = Buffer.from(
  '<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" NoCertificado="FAKE"/>'
).toString("base64");

export class FakeFacturamaGateway implements FacturamaGateway {
  private cancelledIds = new Set<string>();

  // Each call returns a fresh random UUID — unique per stamp, not identical across calls.
  async stamp(_input: FacturамаStampInput): Promise<FacturamaStampResult> {
    const cfdiId = randomUUID();
    const uuid = randomUUID().toUpperCase();
    return {
      cfdiId,
      uuid,
      xmlUrl: undefined,
      pdfUrl: undefined,
    };
  }

  async cancel(cfdiId: string, _motive: string, _uuidReplacement?: string | null): Promise<FacturamaCancelResult> {
    this.cancelledIds.add(cfdiId);
    return { success: true };
  }

  async download(format: "pdf" | "xml", _cfdiId: string): Promise<FacturamaDownloadResult> {
    return {
      contentBase64: format === "pdf" ? FAKE_PDF_BASE64 : FAKE_XML_BASE64,
      contentType: format === "pdf" ? "application/pdf" : "application/xml",
    };
  }

  async uploadCsd(_input: FacturamaCsdInput): Promise<FacturamaCsdStatus> {
    return {
      rfc: _input.rfc,
      expiresAt: "2027-01-01T00:00:00",
      isValid: true,
      issuer: "FAKE CSD (mock mode)",
    };
  }

  async getCsdStatus(rfc?: string): Promise<FacturamaCsdStatus> {
    return {
      rfc: rfc ?? "FAKE",
      expiresAt: "2027-01-01T00:00:00",
      isValid: true,
      issuer: "FAKE CSD (mock mode)",
    };
  }
}

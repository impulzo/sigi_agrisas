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

// Minimal but structurally valid single-page PDF (correct xref/trailer/%%EOF) — must open in
// real PDF viewers, not just decode; a merely well-formed-looking stub isn't enough.
const FAKE_PDF_BASE64 =
  "JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMzAwIDE1MF0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNCAwIFIgPj4gPj4gL0NvbnRlbnRzIDUgMCBSID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKNSAwIG9iago8PCAvTGVuZ3RoIDU3ID4+CnN0cmVhbQpCVCAvRjEgMTQgVGYgMjAgMTAwIFRkIChDRkRJIGRlIHBydWViYSAtIG1vZG8gbW9jaykgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTkgMDAwMDAgbiAKMDAwMDAwMDA2OCAwMDAwMCBuIAowMDAwMDAwMTI1IDAwMDAwIG4gCjAwMDAwMDAyNTEgMDAwMDAgbiAKMDAwMDAwMDMyMSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQyOAolJUVPRg==";
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

import { randomUUID } from "crypto";
import {
  WaybillFacturamaGateway,
  StampTrasladoInput,
  StampTrasladoResult,
  WaybillCancelResult,
  WaybillDownloadResult,
} from "../../application/ports/WaybillFacturamaGateway";

const FAKE_PDF_BASE64 =
  "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwgL0xlbmd0aCAzIDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeJxjYGBg+M9QDwAEhAGBCg=="; // minimal PDF stub
const FAKE_XML_BASE64 = Buffer.from(
  '<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" NoCertificado="FAKE"><cfdi:Complemento><cartaporte31:CartaPorte xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31"/></cfdi:Complemento></cfdi:Comprobante>'
).toString("base64");

export class FakeFacturamaGateway implements WaybillFacturamaGateway {
  private cancelledIds = new Set<string>();

  // Each call returns a fresh random UUID — unique per stamp, not identical across calls.
  async stampTraslado(_input: StampTrasladoInput): Promise<StampTrasladoResult> {
    return {
      cfdiId: randomUUID(),
      uuid: randomUUID().toUpperCase(),
      xmlUrl: undefined,
      pdfUrl: undefined,
    };
  }

  async cancel(cfdiId: string, _motive: string): Promise<WaybillCancelResult> {
    this.cancelledIds.add(cfdiId);
    return { success: true };
  }

  async download(format: "pdf" | "xml", _cfdiId: string): Promise<WaybillDownloadResult> {
    return {
      contentBase64: format === "pdf" ? FAKE_PDF_BASE64 : FAKE_XML_BASE64,
      contentType: format === "pdf" ? "application/pdf" : "application/xml",
    };
  }
}

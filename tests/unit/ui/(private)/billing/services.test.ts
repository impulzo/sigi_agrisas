/**
 * @jest-environment jsdom
 */
import { stampInvoice } from "../../../../../app/(private)/billing/_logic/services/stampInvoice";
import { cancelInvoice } from "../../../../../app/(private)/billing/_logic/services/cancelInvoice";
import { downloadInvoiceFile } from "../../../../../app/(private)/billing/_logic/services/downloadInvoiceFile";
import { downloadInvoicePreviewPdf } from "../../../../../app/(private)/billing/_logic/services/downloadInvoicePreviewPdf";
import { uploadCsd } from "../../../../../app/(private)/billing/_logic/services/uploadCsd";
import {
  SaleAlreadyInvoicedError,
  SaleNotInvoiceableError,
  ReceiverFiscalDataIncompleteError,
  FacturamaStampError,
  InvoiceAlreadyCancelledError,
  FacturamaCancelError,
  FacturamaCsdError,
  InvoiceNotStampedError,
  InvoiceFileDownloadFailedError,
  BranchRequiredError,
} from "../../../../../app/(private)/billing/_logic/errors";
import type { InvoiceDto } from "../../../../../app/(private)/billing/_logic/types/api";
import type { InvoicePreviewData } from "../../../../../app/(private)/billing/_logic/types/preview";

function makeInvoiceDto(overrides: Partial<InvoiceDto> = {}): InvoiceDto {
  return {
    id: "inv-1",
    uuid: "AAA-BBB",
    facturamaCfdiId: "cfdi-1",
    status: "stamped",
    cfdiType: "I",
    cfdiUse: "G03",
    paymentForm: "03",
    paymentMethod: "PUE",
    receiverRfc: "XAXX010101000",
    receiverName: "Público General",
    receiverCfdiUse: "G03",
    receiverFiscalRegime: "616",
    receiverTaxZipCode: "01000",
    issuerRfc: null,
    issuerLegalName: null,
    issuerFiscalRegime: null,
    issuerZipCode: null,
    issuerAddress: null,
    issuerEmail: null,
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: null,
    branchId: "b1",
    customerId: null,
    cancellationMotive: null,
    cancelledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function okFetch(body: unknown, status = 201): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob(["data"])),
    headers: new Headers(),
  }) as unknown as typeof fetch;
}

function errFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  }) as unknown as typeof fetch;
}

// ─── stampInvoice ───────────────────────────────────────────────────────────

describe("stampInvoice — error mapping", () => {
  it("409 SaleAlreadyInvoiced → SaleAlreadyInvoicedError with invoiceId", async () => {
    const fetch = errFetch(409, { error: "SaleAlreadyInvoiced", invoiceId: "inv-existing" });
    await expect(stampInvoice({ saleId: "s1" }, fetch)).rejects.toBeInstanceOf(SaleAlreadyInvoicedError);
    await stampInvoice({ saleId: "s1" }, fetch).catch((e: SaleAlreadyInvoicedError) => {
      expect(e.invoiceId).toBe("inv-existing");
    });
  });

  it("409 other → SaleNotInvoiceableError", async () => {
    const fetch = errFetch(409, { error: "SaleNotInvoiceable" });
    await expect(stampInvoice({ saleId: "s1" }, fetch)).rejects.toBeInstanceOf(SaleNotInvoiceableError);
  });

  it("400 ReceiverFiscalDataIncomplete → ReceiverFiscalDataIncompleteError with missingFields", async () => {
    const fetch = errFetch(400, { error: "ReceiverFiscalDataIncomplete", missingFields: ["cfdiUse", "taxZipCode"] });
    await expect(stampInvoice({ saleId: "s1" }, fetch)).rejects.toBeInstanceOf(ReceiverFiscalDataIncompleteError);
    await stampInvoice({ saleId: "s1" }, fetch).catch((e: ReceiverFiscalDataIncompleteError) => {
      expect(e.missingFields).toEqual(["cfdiUse", "taxZipCode"]);
    });
  });

  it("422 → FacturamaStampError with detail", async () => {
    const fetch = errFetch(422, { error: "FacturamaStampError", detail: "RFC inválido" });
    await expect(stampInvoice({ saleId: "s1" }, fetch)).rejects.toBeInstanceOf(FacturamaStampError);
    await stampInvoice({ saleId: "s1" }, fetch).catch((e: FacturamaStampError) => {
      expect(e.detail).toBe("RFC inválido");
    });
  });

  it("400 BranchRequired → BranchRequiredError, not a generic NetworkError", async () => {
    const fetch = errFetch(400, { error: "BranchRequired" });
    await expect(stampInvoice({ saleId: "s1" }, fetch)).rejects.toBeInstanceOf(BranchRequiredError);
  });

  it("400 unrecognized Zod fieldErrors → readable Error, not NetworkError", async () => {
    const fetch = errFetch(400, {
      error: { fieldErrors: { satProductCode: ["Invalid"] }, formErrors: [] },
    });
    await expect(stampInvoice({ saleId: "s1" }, fetch)).rejects.toThrow("Invalid");
  });

  it("201 success → returns Invoice with id", async () => {
    const dto = makeInvoiceDto();
    const fetch = okFetch(dto);
    const result = await stampInvoice({ saleId: "s1" }, fetch);
    expect(result.id).toBe("inv-1");
    expect(result.status).toBe("stamped");
  });

  it("fetchImpl injection used instead of authFetch", async () => {
    const mockFetch = okFetch(makeInvoiceDto());
    await stampInvoice({ saleId: "s1" }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ─── downloadInvoicePreviewPdf ─────────────────────────────────────────────

describe("downloadInvoicePreviewPdf — error mapping", () => {
  const previewData: InvoicePreviewData = {
    issuer: { name: "Agrisas" },
    receiver: { rfc: "XAXX010101000", name: "Cliente", cfdiUse: "G03", fiscalRegime: "601", taxZipCode: "45010" },
    lines: [],
    paymentForm: "03",
    paymentMethod: "PUE",
    subtotal: 0,
    taxTotal: 0,
    total: 0,
    currency: "MXN",
  };

  beforeEach(() => {
    Object.defineProperty(window.URL, "createObjectURL", { value: jest.fn().mockReturnValue("blob:test"), writable: true });
    Object.defineProperty(window.URL, "revokeObjectURL", { value: jest.fn(), writable: true });
  });

  it("400 with structured error → readable Error, not generic NetworkError", async () => {
    const fetch = errFetch(400, { error: { fieldErrors: { discountPct: ["Expected number, received null"] }, formErrors: [] } });
    await expect(downloadInvoicePreviewPdf(previewData, fetch)).rejects.toThrow("Expected number, received null");
  });

  it("200 success → triggers a download without throwing", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(["pdf-data"])),
    }) as unknown as typeof fetch;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await expect(downloadInvoicePreviewPdf(previewData, fetchImpl)).resolves.toBeUndefined();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});

// ─── cancelInvoice ──────────────────────────────────────────────────────────

describe("cancelInvoice — error mapping", () => {
  it("409 → InvoiceAlreadyCancelledError", async () => {
    const fetch = errFetch(409, { error: "InvoiceAlreadyCancelled" });
    await expect(cancelInvoice("inv-1", { motive: "02" }, fetch)).rejects.toBeInstanceOf(InvoiceAlreadyCancelledError);
  });

  it("422 → FacturamaCancelError with detail", async () => {
    const fetch = errFetch(422, { error: "FacturamaCancelError", detail: "CFDI no cancelable" });
    await expect(cancelInvoice("inv-1", { motive: "02" }, fetch)).rejects.toBeInstanceOf(FacturamaCancelError);
    await cancelInvoice("inv-1", { motive: "02" }, fetch).catch((e: FacturamaCancelError) => {
      expect(e.detail).toBe("CFDI no cancelable");
    });
  });

  it("200 success → returns updated Invoice", async () => {
    const dto = makeInvoiceDto({ status: "cancelled" });
    const fetch = okFetch(dto, 200);
    const result = await cancelInvoice("inv-1", { motive: "02" }, fetch);
    expect(result.status).toBe("cancelled");
  });
});

// ─── downloadInvoiceFile ────────────────────────────────────────────────────

describe("downloadInvoiceFile — filename derivation", () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    createObjectURL = jest.fn().mockReturnValue("blob:test");
    revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, "createObjectURL", { value: createObjectURL, writable: true });
    Object.defineProperty(window.URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });
    jest.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    jest.spyOn(document.body, "removeChild").mockImplementation((el) => el);
  });

  afterEach(() => jest.restoreAllMocks());

  function makeFetchWithDisposition(disposition: string): typeof fetch {
    return jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(["pdf-data"])),
      headers: new Headers({ "Content-Disposition": disposition }),
    }) as unknown as typeof fetch;
  }

  it("derives filename from Content-Disposition", async () => {
    const fetch = makeFetchWithDisposition('attachment; filename="factura-ABC.pdf"');
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadInvoiceFile("inv-1", "pdf", fetch);
    const lastCall = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(lastCall.download).toBe("factura-ABC.pdf");
  });

  it("fallback filename when no Content-Disposition", async () => {
    const fetchImpl: typeof globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(["xml-data"])),
      headers: new Headers(),
    }) as unknown as typeof globalThis.fetch;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadInvoiceFile("inv-abcdefgh", "xml", fetchImpl);
    const lastCall = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(lastCall.download).toMatch(/factura-.*\.xml$/);
  });

  it("400 Invoice has not been stamped → InvoiceNotStampedError, no download triggered", async () => {
    const fetch = errFetch(400, { error: "Invoice has not been stamped" });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await expect(downloadInvoiceFile("inv-1", "pdf", fetch)).rejects.toBeInstanceOf(InvoiceNotStampedError);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("502 → InvoiceFileDownloadFailedError", async () => {
    const fetch = errFetch(502, { error: "Failed to download invoice file" });
    await expect(downloadInvoiceFile("inv-1", "pdf", fetch)).rejects.toBeInstanceOf(InvoiceFileDownloadFailedError);
  });

  it("200 with empty blob → InvoiceNotStampedError (defensa adicional)", async () => {
    const fetchImpl: typeof globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob([])),
      headers: new Headers(),
    }) as unknown as typeof globalThis.fetch;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await expect(downloadInvoiceFile("inv-1", "pdf", fetchImpl)).rejects.toBeInstanceOf(InvoiceNotStampedError);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

// ─── uploadCsd ──────────────────────────────────────────────────────────────

describe("uploadCsd — error mapping", () => {
  it("422 → FacturamaCsdError with detail", async () => {
    const fetch = errFetch(422, { error: "FacturamaCsdError", detail: "Certificado expirado" });
    await expect(
      uploadCsd({ rfc: "RFC", certificateBase64: "a", privateKeyBase64: "b", privateKeyPassword: "pw" }, fetch)
    ).rejects.toBeInstanceOf(FacturamaCsdError);
    await uploadCsd({ rfc: "RFC", certificateBase64: "a", privateKeyBase64: "b", privateKeyPassword: "pw" }, fetch).catch((e: FacturamaCsdError) => {
      expect(e.detail).toBe("Certificado expirado");
    });
  });

  it("200 success → returns status body", async () => {
    const statusBody = { rfc: "XAXX010101000", uploadedAt: new Date().toISOString() };
    const fetch = okFetch(statusBody, 200);
    const result = await uploadCsd({ rfc: "XAXX010101000", certificateBase64: "a", privateKeyBase64: "b", privateKeyPassword: "pw" }, fetch);
    expect(result).toMatchObject({ rfc: "XAXX010101000" });
  });
});

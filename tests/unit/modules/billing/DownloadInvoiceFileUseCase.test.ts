import { DownloadInvoiceFileUseCase } from "@/modules/billing/application/use-cases/DownloadInvoiceFileUseCase";
import { Invoice } from "@/modules/billing/domain/entities/Invoice";
import { InvoiceNotFoundError, InvoiceNotStampedError, InvoiceFileDownloadFailedError } from "@/modules/billing/domain/errors";
import type { InvoiceRepository } from "@/modules/billing/application/ports/InvoiceRepository";
import type { FacturamaGateway } from "@/modules/billing/application/ports/FacturamaGateway";

const INVOICE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function makeInvoice(overrides: Partial<{ facturamaCfdiId: string | null; uuid: string | null }> = {}): Invoice {
  return Invoice.create({
    id: INVOICE_ID,
    uuid: overrides.uuid !== undefined ? overrides.uuid : "UUID-1234",
    facturamaCfdiId: overrides.facturamaCfdiId !== undefined ? overrides.facturamaCfdiId : "cfdi-1",
    status: "stamped",
    cfdiType: "I",
    cfdiUse: "G03",
    paymentForm: "01",
    paymentMethod: "PUE",
    receiverRfc: "XAXX010101000",
    receiverName: "Cliente",
    receiverCfdiUse: "G03",
    receiverFiscalRegime: "601",
    receiverTaxZipCode: "45010",
    issuerRfc: null,
    issuerLegalName: null,
    issuerFiscalRegime: null,
    issuerZipCode: null,
    issuerAddress: null,
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: null,
    branchId: "branch-1",
    customerId: null,
    creatorId: "user-1",
    cancellationMotive: null,
    uuidReplacement: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  });
}

function makeInvoiceRepo(invoice: Invoice | null): InvoiceRepository {
  return {
    findById: jest.fn().mockResolvedValue(invoice),
    findByIdWithItems: jest.fn().mockResolvedValue(invoice),
  } as unknown as InvoiceRepository;
}

function makeGateway(overrides: Partial<FacturamaGateway> = {}): FacturamaGateway {
  return {
    stamp: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn().mockResolvedValue({ contentBase64: "AAAA", contentType: "application/pdf" }),
    uploadCsd: jest.fn(),
    getCsdStatus: jest.fn(),
    ...overrides,
  };
}

describe("DownloadInvoiceFileUseCase", () => {
  it("throws InvoiceNotFoundError when the invoice does not exist", async () => {
    const repo = makeInvoiceRepo(null);
    const uc = new DownloadInvoiceFileUseCase(repo, makeGateway());

    await expect(uc.execute(INVOICE_ID, "pdf")).rejects.toThrow(InvoiceNotFoundError);
  });

  it("throws InvoiceNotStampedError when facturamaCfdiId is null", async () => {
    const invoice = makeInvoice({ facturamaCfdiId: null });
    const repo = makeInvoiceRepo(invoice);
    const gateway = makeGateway();
    const uc = new DownloadInvoiceFileUseCase(repo, gateway);

    await expect(uc.execute(INVOICE_ID, "pdf")).rejects.toThrow(InvoiceNotStampedError);
    expect(gateway.download).not.toHaveBeenCalled();
  });

  it("returns the file content and derived filename when stamped", async () => {
    const invoice = makeInvoice({ uuid: "UUID-1234" });
    const repo = makeInvoiceRepo(invoice);
    const gateway = makeGateway();
    const uc = new DownloadInvoiceFileUseCase(repo, gateway);

    const result = await uc.execute(INVOICE_ID, "pdf");

    expect(gateway.download).toHaveBeenCalledWith(
      "pdf",
      "cfdi-1",
      expect.objectContaining({
        uuid: "UUID-1234",
        receiver: expect.objectContaining({ rfc: "XAXX010101000" }),
      })
    );
    expect(result).toEqual({
      contentBase64: "AAAA",
      contentType: "application/pdf",
      filename: "UUID-1234.pdf",
    });
  });

  it("passes the invoice's own persisted data as the download snapshot — never the gateway's own state", async () => {
    const invoice = makeInvoice({ uuid: "UUID-1234" });
    const repo = makeInvoiceRepo(invoice);
    const gateway = makeGateway();
    const uc = new DownloadInvoiceFileUseCase(repo, gateway);

    await uc.execute(INVOICE_ID, "pdf");

    const [, , snapshot] = (gateway.download as jest.Mock).mock.calls[0];
    expect(snapshot).toEqual({
      uuid: "UUID-1234",
      issuer: { rfc: null, legalName: null, fiscalRegime: null, zipCode: null, address: null, branchName: null },
      receiver: {
        rfc: "XAXX010101000",
        name: "Cliente",
        cfdiUse: "G03",
        fiscalRegime: "601",
        taxZipCode: "45010",
      },
      items: [],
      paymentForm: "01",
      paymentMethod: "PUE",
      currency: "MXN",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
    });
  });

  it("falls back to the invoice id for the filename when uuid is null", async () => {
    const invoice = makeInvoice({ uuid: null });
    const repo = makeInvoiceRepo(invoice);
    const uc = new DownloadInvoiceFileUseCase(repo, makeGateway());

    const result = await uc.execute(INVOICE_ID, "xml");

    expect(result.filename).toBe(`${INVOICE_ID}.xml`);
  });

  it("rethrows gateway failures as InvoiceFileDownloadFailedError", async () => {
    const invoice = makeInvoice();
    const repo = makeInvoiceRepo(invoice);
    const gateway = makeGateway({ download: jest.fn().mockRejectedValue(new Error("Facturama timeout")) });
    const uc = new DownloadInvoiceFileUseCase(repo, gateway);

    await expect(uc.execute(INVOICE_ID, "pdf")).rejects.toThrow(InvoiceFileDownloadFailedError);
  });
});

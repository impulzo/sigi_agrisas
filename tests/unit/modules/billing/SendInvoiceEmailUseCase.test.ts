import { SendInvoiceEmailUseCase } from "@/modules/billing/application/use-cases/SendInvoiceEmailUseCase";
import { DownloadInvoiceFileUseCase } from "@/modules/billing/application/use-cases/DownloadInvoiceFileUseCase";
import { Invoice } from "@/modules/billing/domain/entities/Invoice";
import { InvoiceNotFoundError, InvoiceNoEmailError, InvoiceNotStampedError, InvoiceEmailSendFailedError } from "@/modules/billing/domain/errors";
import type { InvoiceRepository } from "@/modules/billing/application/ports/InvoiceRepository";
import type { BillingLookupService } from "@/modules/billing/application/ports/BillingLookupService";
import type { FacturamaGateway } from "@/modules/billing/application/ports/FacturamaGateway";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

const INVOICE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CUSTOMER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function makeInvoice(overrides: Partial<{ facturamaCfdiId: string | null; customerId: string | null }> = {}): Invoice {
  return Invoice.create({
    id: INVOICE_ID,
    uuid: "UUID-1234",
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
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: null,
    branchId: "branch-1",
    customerId: overrides.customerId !== undefined ? overrides.customerId : CUSTOMER_ID,
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

function makeLookup(email: string | null): BillingLookupService {
  return {
    findSaleWithItems: jest.fn(),
    findCustomer: jest.fn().mockResolvedValue({
      id: CUSTOMER_ID,
      name: "Cliente",
      legalName: null,
      rfc: "XAXX010101000",
      taxRegime: "601",
      cfdiUse: "G03",
      taxZipCode: "45010",
      email,
    }),
    findBranch: jest.fn(),
    findHeadquarters: jest.fn(),
  };
}

function makeGateway(): FacturamaGateway {
  return {
    stamp: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn().mockResolvedValue({ contentBase64: "AAAA", contentType: "application/pdf" }),
    uploadCsd: jest.fn(),
    getCsdStatus: jest.fn(),
  };
}

describe("SendInvoiceEmailUseCase", () => {
  it("sends to customer.email when no override is given", async () => {
    const invoice = makeInvoice();
    const repo = makeInvoiceRepo(invoice);
    const lookup = makeLookup("cliente@ejemplo.com");
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, makeGateway());
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const uc = new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer);

    const result = await uc.execute(INVOICE_ID);

    expect(result).toEqual({ sentTo: "cliente@ejemplo.com" });
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@ejemplo.com", attachments: expect.arrayContaining([expect.anything()]) })
    );
  });

  it("sends to the override email instead of customer.email", async () => {
    const invoice = makeInvoice();
    const repo = makeInvoiceRepo(invoice);
    const lookup = makeLookup("cliente@ejemplo.com");
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, makeGateway());
    const mailer: MailerPort = { send: jest.fn().mockResolvedValue(undefined) };
    const uc = new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer);

    const result = await uc.execute(INVOICE_ID, "otra@direccion.com");

    expect(result).toEqual({ sentTo: "otra@direccion.com" });
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: "otra@direccion.com" }));
  });

  it("throws InvoiceNoEmailError when customer has no email and no override given", async () => {
    const invoice = makeInvoice();
    const repo = makeInvoiceRepo(invoice);
    const lookup = makeLookup(null);
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, makeGateway());
    const mailer: MailerPort = { send: jest.fn() };
    const uc = new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer);

    await expect(uc.execute(INVOICE_ID)).rejects.toThrow(InvoiceNoEmailError);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("throws InvoiceNotStampedError when facturamaCfdiId is null", async () => {
    const invoice = makeInvoice({ facturamaCfdiId: null });
    const repo = makeInvoiceRepo(invoice);
    const lookup = makeLookup("cliente@ejemplo.com");
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, makeGateway());
    const mailer: MailerPort = { send: jest.fn() };
    const uc = new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer);

    await expect(uc.execute(INVOICE_ID)).rejects.toThrow(InvoiceNotStampedError);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("throws InvoiceNotFoundError when the invoice does not exist", async () => {
    const repo = makeInvoiceRepo(null);
    const lookup = makeLookup("cliente@ejemplo.com");
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, makeGateway());
    const mailer: MailerPort = { send: jest.fn() };
    const uc = new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer);

    await expect(uc.execute(INVOICE_ID)).rejects.toThrow(InvoiceNotFoundError);
  });

  it("throws InvoiceEmailSendFailedError when the mailer rejects", async () => {
    const invoice = makeInvoice();
    const repo = makeInvoiceRepo(invoice);
    const lookup = makeLookup("cliente@ejemplo.com");
    const downloadUseCase = new DownloadInvoiceFileUseCase(repo, makeGateway());
    const mailer: MailerPort = { send: jest.fn().mockRejectedValue(new Error("SMTP down")) };
    const uc = new SendInvoiceEmailUseCase(repo, lookup, downloadUseCase, mailer);

    await expect(uc.execute(INVOICE_ID)).rejects.toThrow(InvoiceEmailSendFailedError);
  });
});

import { CancelInvoiceUseCase } from "../../../../src/modules/billing/application/use-cases/CancelInvoiceUseCase";
import { InMemoryInvoiceRepository } from "../../../../src/modules/billing/infrastructure/repositories/InMemoryInvoiceRepository";
import { FakeFacturamaGateway } from "../../../../src/modules/billing/infrastructure/services/FakeFacturamaGateway";
import {
  InvoiceNotFoundError,
  InvoiceAlreadyCancelledError,
} from "../../../../src/modules/billing/domain/errors";
import type { CreateInvoiceData } from "../../../../src/modules/billing/application/ports/InvoiceRepository";

const BRANCH_ID = "branch-uuid-1";
const CREATOR_ID = "creator-uuid-1";

function makeInvoiceData(overrides: Partial<CreateInvoiceData> = {}): CreateInvoiceData {
  return {
    id: "inv-uuid-1",
    uuid: "A1B2C3D4-0000-0000-0000-000000000001",
    facturamaCfdiId: "cfdi-fake-id-1",
    status: "stamped",
    cfdiType: "I",
    cfdiUse: "G03",
    paymentForm: "01",
    paymentMethod: "PUE",
    receiverRfc: "CAN850101AAA",
    receiverName: "Cliente SA de CV",
    receiverCfdiUse: "G03",
    receiverFiscalRegime: "601",
    receiverTaxZipCode: "45010",
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: "sale-uuid-1",
    branchId: BRANCH_ID,
    customerId: "customer-uuid-1",
    creatorId: CREATOR_ID,
    items: [],
    ...overrides,
  };
}

describe("CancelInvoiceUseCase", () => {
  it("cancels a stamped invoice — status becomes cancelled", async () => {
    const repo = new InMemoryInvoiceRepository();
    await repo.createStamped(makeInvoiceData());
    const gateway = new FakeFacturamaGateway();
    const uc = new CancelInvoiceUseCase(repo, gateway);

    const result = await uc.execute("inv-uuid-1", "02", CREATOR_ID);

    expect(result.status).toBe("cancelled");
    expect(result.cancellationMotive).toBe("02");
    expect(result.cancelledAt).toBeInstanceOf(Date);
    expect(result.cancelledBy).toBe(CREATOR_ID);
  });

  it("calls gateway.cancel with correct cfdiId and motive", async () => {
    const repo = new InMemoryInvoiceRepository();
    await repo.createStamped(makeInvoiceData());
    const gateway = new FakeFacturamaGateway();
    const cancelSpy = jest.spyOn(gateway, "cancel");
    const uc = new CancelInvoiceUseCase(repo, gateway);

    await uc.execute("inv-uuid-1", "03", CREATOR_ID);

    expect(cancelSpy).toHaveBeenCalledWith("cfdi-fake-id-1", "03", undefined);
  });

  it("passes uuidReplacement when provided", async () => {
    const repo = new InMemoryInvoiceRepository();
    await repo.createStamped(makeInvoiceData());
    const gateway = new FakeFacturamaGateway();
    const cancelSpy = jest.spyOn(gateway, "cancel");
    const uc = new CancelInvoiceUseCase(repo, gateway);

    await uc.execute("inv-uuid-1", "01", CREATOR_ID, "REPLACEMENT-UUID");

    expect(cancelSpy).toHaveBeenCalledWith("cfdi-fake-id-1", "01", "REPLACEMENT-UUID");
  });

  it("throws InvoiceNotFoundError when invoice does not exist", async () => {
    const repo = new InMemoryInvoiceRepository();
    const gateway = new FakeFacturamaGateway();
    const uc = new CancelInvoiceUseCase(repo, gateway);

    await expect(uc.execute("nonexistent-id", "02", CREATOR_ID)).rejects.toThrow(
      InvoiceNotFoundError
    );
  });

  it("throws InvoiceAlreadyCancelledError when already cancelled", async () => {
    const repo = new InMemoryInvoiceRepository();
    await repo.createStamped(makeInvoiceData({ status: "cancelled" }));
    const gateway = new FakeFacturamaGateway();
    const uc = new CancelInvoiceUseCase(repo, gateway);

    await expect(uc.execute("inv-uuid-1", "02", CREATOR_ID)).rejects.toThrow(
      InvoiceAlreadyCancelledError
    );
  });
});

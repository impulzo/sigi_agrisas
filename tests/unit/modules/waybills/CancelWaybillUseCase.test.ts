import { CreateWaybillUseCase } from "../../../../src/modules/waybills/application/use-cases/CreateWaybillUseCase";
import { CancelWaybillUseCase } from "../../../../src/modules/waybills/application/use-cases/CancelWaybillUseCase";
import { InMemoryWaybillRepository } from "../../../../src/modules/waybills/infrastructure/repositories/InMemoryWaybillRepository";
import {
  WaybillFacturamaGateway,
  StampTrasladoInput,
  StampTrasladoResult,
  WaybillCancelResult,
  WaybillDownloadResult,
} from "../../../../src/modules/waybills/application/ports/WaybillFacturamaGateway";
import {
  WaybillLookupService,
  BranchForWaybill,
  CustomerForWaybill,
  ProductForWaybill,
  FolioForWaybill,
  SaleForWaybill,
} from "../../../../src/modules/waybills/application/ports/WaybillLookupService";
import { WaybillAlreadyCancelledError } from "../../../../src/modules/waybills/domain/errors";
import { CreateWaybillRequest } from "../../../../src/modules/waybills/application/dto/WaybillDto";

const ORIGIN_ID = "11111111-1111-1111-1111-111111111111";
const DEST_ID = "22222222-2222-2222-2222-222222222222";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const CREATOR_ID = "44444444-4444-4444-4444-444444444444";
const CUSTOMER_ID = "55555555-5555-5555-5555-555555555555";
const SALE_ID = "66666666-6666-6666-6666-666666666666";

function completeBranch(id: string, name: string): BranchForWaybill {
  return {
    id,
    name,
    isActive: true,
    addressStreet: "Calle 1",
    addressExteriorNumber: "100",
    addressInteriorNumber: null,
    addressNeighborhood: "Centro",
    addressMunicipality: "Hermosillo",
    addressState: "SON",
    addressCountry: "MEX",
    addressZipCode: "83000",
  };
}

function completeCustomer(id: string, name: string): CustomerForWaybill {
  return {
    id,
    name,
    code: "CUST01",
    isActive: true,
    addressStreet: "Calle 2",
    addressExteriorNumber: "200",
    addressInteriorNumber: null,
    addressNeighborhood: "Centro",
    addressMunicipality: "Hermosillo",
    addressState: "SON",
    addressCountry: "MEX",
    addressZipCode: "83001",
  };
}

class FakeLookupService implements WaybillLookupService {
  branches = new Map<string, BranchForWaybill>();
  customers = new Map<string, CustomerForWaybill>();
  sales = new Map<string, SaleForWaybill>();
  products = new Map<string, ProductForWaybill>();
  folio: FolioForWaybill | null = { id: "folio-ts", isActive: true };

  async findBranch(branchId: string): Promise<BranchForWaybill | null> {
    return this.branches.get(branchId) ?? null;
  }
  async findProduct(productId: string): Promise<ProductForWaybill | null> {
    return this.products.get(productId) ?? null;
  }
  async findFolioByCode(_code: string): Promise<FolioForWaybill | null> {
    return this.folio;
  }
  async findSale(saleId: string): Promise<SaleForWaybill | null> {
    return this.sales.get(saleId) ?? null;
  }
  async findCustomer(customerId: string): Promise<CustomerForWaybill | null> {
    return this.customers.get(customerId) ?? null;
  }
}

class FakeGateway implements WaybillFacturamaGateway {
  cancelCalls: Array<{ cfdiId: string; motive: string }> = [];

  async stampTraslado(_input: StampTrasladoInput): Promise<StampTrasladoResult> {
    return { cfdiId: "cfdi-1", uuid: "UUID-1" };
  }
  async cancel(cfdiId: string, motive: string): Promise<WaybillCancelResult> {
    this.cancelCalls.push({ cfdiId, motive });
    return { success: true };
  }
  async download(): Promise<WaybillDownloadResult> {
    return { contentBase64: "", contentType: "application/pdf" };
  }
}

function request(): CreateWaybillRequest {
  return {
    type: "carta_porte",
    saleId: SALE_ID,
    vehicle: {
      plate: "ABC1234",
      config: "C2",
      permitType: "TPAF01",
      permitNumber: "SCT-123",
      insuranceCompany: "Aseguradora SA",
      insurancePolicy: "POL-1",
    },
    driver: { name: "Juan Perez", licenseNumber: "LIC-1" },
    distanceKm: 50,
    departureAt: "2026-08-01T08:00:00.000Z",
    arrivalAt: "2026-08-01T12:00:00.000Z",
    items: [
      {
        productId: PRODUCT_ID,
        description: "Fertilizante",
        satBienesTranspCode: "10161500",
        satUnitCode: "KGM",
        quantity: 10,
        weightKg: 100,
      },
    ],
  };
}

function simpleRequest(): CreateWaybillRequest {
  return {
    type: "simple",
    originBranchId: ORIGIN_ID,
    destinationBranchId: DEST_ID,
    transferDate: "2026-08-01T08:00:00.000Z",
    items: [{ productId: PRODUCT_ID, description: "Fertilizante", quantity: 10 }],
  };
}

async function setupWithCompletedWaybill() {
  const repo = new InMemoryWaybillRepository();
  const gateway = new FakeGateway();
  const lookup = new FakeLookupService();
  lookup.branches.set(ORIGIN_ID, completeBranch(ORIGIN_ID, "Origen"));
  lookup.customers.set(CUSTOMER_ID, completeCustomer(CUSTOMER_ID, "Cliente Uno"));
  lookup.sales.set(SALE_ID, {
    id: SALE_ID,
    branchId: ORIGIN_ID,
    customerId: CUSTOMER_ID,
    status: "completed",
    items: [{ productId: PRODUCT_ID, quantity: 10, productNameSnapshot: "Fertilizante" }],
  });
  lookup.products.set(PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true });
  lookup.folio = { id: "folio-ts", isActive: true };
  repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

  const createUseCase = new CreateWaybillUseCase(repo, gateway, lookup);
  const cancelUseCase = new CancelWaybillUseCase(repo, gateway);
  const waybill = await createUseCase.execute(request(), CREATOR_ID);

  return { repo, gateway, cancelUseCase, waybill };
}

async function setupWithCompletedSimpleWaybill() {
  const repo = new InMemoryWaybillRepository();
  const gateway = new FakeGateway();
  const lookup = new FakeLookupService();
  lookup.branches.set(ORIGIN_ID, completeBranch(ORIGIN_ID, "Origen"));
  lookup.branches.set(DEST_ID, completeBranch(DEST_ID, "Destino"));
  lookup.products.set(PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true });
  lookup.folio = { id: "folio-tri", isActive: true };
  repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

  const createUseCase = new CreateWaybillUseCase(repo, gateway, lookup);
  const cancelUseCase = new CancelWaybillUseCase(repo, gateway);
  const waybill = await createUseCase.execute(simpleRequest(), CREATOR_ID);

  return { repo, gateway, cancelUseCase, waybill };
}

describe("CancelWaybillUseCase", () => {
  it("cancels a completed carta_porte waybill, cancels the CFDI, and never touches branch_inventory", async () => {
    const { repo, gateway, cancelUseCase, waybill } = await setupWithCompletedWaybill();
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(50);

    const cancelled = await cancelUseCase.execute(waybill.id, CREATOR_ID, "Error de captura");

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("Error de captura");
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(50);
    expect(gateway.cancelCalls).toHaveLength(1);
    expect(gateway.cancelCalls[0].cfdiId).toBe("cfdi-1");
  });

  it("rejects a second cancellation with WaybillAlreadyCancelledError", async () => {
    const { cancelUseCase, waybill } = await setupWithCompletedWaybill();
    await cancelUseCase.execute(waybill.id, CREATOR_ID, "primer motivo");

    await expect(cancelUseCase.execute(waybill.id, CREATOR_ID, "segundo intento")).rejects.toThrow(
      WaybillAlreadyCancelledError
    );
  });

  it("cancels a simple waybill without invoking the gateway, and reverses inventory (may go negative downstream)", async () => {
    const { repo, gateway, cancelUseCase, waybill } = await setupWithCompletedSimpleWaybill();
    expect(waybill.facturamaCfdiId).toBeNull();
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(40);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(10);
    // Simulate the destination branch having already re-consumed the transferred stock.
    repo.setStock(DEST_ID, PRODUCT_ID, 2);

    const cancelled = await cancelUseCase.execute(waybill.id, CREATOR_ID, "Error de captura");

    expect(cancelled.status).toBe("cancelled");
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(50);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(-8);
    expect(gateway.cancelCalls).toHaveLength(0);
  });
});

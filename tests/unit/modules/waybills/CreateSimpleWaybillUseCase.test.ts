import { CreateWaybillUseCase } from "../../../../src/modules/waybills/application/use-cases/CreateWaybillUseCase";
import { InMemoryWaybillRepository } from "../../../../src/modules/waybills/infrastructure/repositories/InMemoryWaybillRepository";
import { InMemoryVehicleRepository } from "../../../../src/modules/vehicles/infrastructure/repositories/InMemoryVehicleRepository";
import { InMemoryDriverRepository } from "../../../../src/modules/drivers/infrastructure/repositories/InMemoryDriverRepository";
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
import {
  InvalidBranchPairError,
  ProductRequiredForSimpleTransferError,
  ProductNotFoundForTransferError,
  InsufficientStockAtOriginError,
} from "../../../../src/modules/waybills/domain/errors";
import { CreateSimpleWaybillRequest, CreateSimpleWaybillItemRequest } from "../../../../src/modules/waybills/application/dto/WaybillDto";

const ORIGIN_ID = "11111111-1111-1111-1111-111111111111";
const DEST_ID = "22222222-2222-2222-2222-222222222222";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const CREATOR_ID = "44444444-4444-4444-4444-444444444444";

function incompleteBranch(id: string, name: string): BranchForWaybill {
  // Deliberately missing every structured address field — a simple transfer must not require it.
  return {
    id,
    name,
    isActive: true,
    addressStreet: null,
    addressExteriorNumber: null,
    addressInteriorNumber: null,
    addressNeighborhood: null,
    addressMunicipality: null,
    addressState: null,
    addressCountry: null,
    addressZipCode: null,
  };
}

class FakeLookupService implements WaybillLookupService {
  branches = new Map<string, BranchForWaybill>();
  products = new Map<string, ProductForWaybill>();
  folio: FolioForWaybill | null = { id: "folio-tri", isActive: true };

  async findBranch(branchId: string): Promise<BranchForWaybill | null> {
    return this.branches.get(branchId) ?? null;
  }
  async findProduct(productId: string): Promise<ProductForWaybill | null> {
    return this.products.get(productId) ?? null;
  }
  async findFolioByCode(_code: string): Promise<FolioForWaybill | null> {
    return this.folio;
  }
  async findSale(_saleId: string): Promise<SaleForWaybill | null> {
    return null;
  }
  async findCustomer(_customerId: string): Promise<CustomerForWaybill | null> {
    return null;
  }
}

class FakeGateway implements WaybillFacturamaGateway {
  calls: StampTrasladoInput[] = [];
  async stampTraslado(input: StampTrasladoInput): Promise<StampTrasladoResult> {
    this.calls.push(input);
    return { cfdiId: "cfdi-1", uuid: "UUID-1" };
  }
  async cancel(): Promise<WaybillCancelResult> {
    return { success: true };
  }
  async download(): Promise<WaybillDownloadResult> {
    return { contentBase64: "", contentType: "application/pdf" };
  }
}

function baseRequest(
  items: CreateSimpleWaybillItemRequest[] = [{ productId: PRODUCT_ID, description: "Fertilizante", quantity: 10 }]
): CreateSimpleWaybillRequest {
  return {
    type: "simple",
    originBranchId: ORIGIN_ID,
    destinationBranchId: DEST_ID,
    transferDate: "2026-08-01T08:00:00.000Z",
    notes: "Reabasto interno",
    items,
  };
}

function setup() {
  const repo = new InMemoryWaybillRepository();
  const gateway = new FakeGateway();
  const lookup = new FakeLookupService();
  lookup.branches.set(ORIGIN_ID, incompleteBranch(ORIGIN_ID, "Origen"));
  lookup.branches.set(DEST_ID, incompleteBranch(DEST_ID, "Destino"));
  lookup.products.set(PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true });
  const useCase = new CreateWaybillUseCase(repo, gateway, lookup, new InMemoryVehicleRepository(), new InMemoryDriverRepository());
  return { repo, gateway, lookup, useCase };
}

describe("CreateWaybillUseCase — type: simple", () => {
  it("creates a completed simple waybill via folio TRI without calling Facturama", async () => {
    const { repo, gateway, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

    const waybill = await useCase.execute(baseRequest(), CREATOR_ID);

    expect(waybill.status).toBe("completed");
    expect(waybill.type).toBe("simple");
    expect(waybill.folioCode).toMatch(/^TRI-/);
    expect(waybill.cfdiUuid).toBeNull();
    expect(waybill.facturamaCfdiId).toBeNull();
    expect(waybill.vehiclePlate).toBeNull();
    expect(waybill.originAddress).toBeNull();
    expect(gateway.calls).toHaveLength(0);
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(40);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(10);
  });

  it("does not require structured branch address (unlike carta_porte)", async () => {
    const { repo, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).resolves.toBeDefined();
  });

  it("rejects a line without productId with ProductRequiredForSimpleTransferError", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(baseRequest([{ productId: "", description: "Sin producto", quantity: 1 }]), CREATOR_ID)
    ).rejects.toThrow(ProductRequiredForSimpleTransferError);
  });

  it("rejects a productId that does not resolve to a catalog product", async () => {
    const { useCase } = setup();
    const unknownProductId = "99999999-9999-9999-9999-999999999999";

    await expect(
      useCase.execute(baseRequest([{ productId: unknownProductId, description: "Desconocido", quantity: 1 }]), CREATOR_ID)
    ).rejects.toThrow(ProductNotFoundForTransferError);
  });

  it("rejects origin === destination", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ ...baseRequest(), destinationBranchId: ORIGIN_ID }, CREATOR_ID)
    ).rejects.toThrow(InvalidBranchPairError);
  });

  it("rejects an inactive branch", async () => {
    const { lookup, useCase } = setup();
    lookup.branches.set(DEST_ID, { ...incompleteBranch(DEST_ID, "Destino"), isActive: false });

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(InvalidBranchPairError);
  });

  it("propagates InsufficientStockAtOriginError without moving inventory", async () => {
    const { repo, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 3);

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(InsufficientStockAtOriginError);
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(3);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(0);
  });

  it("persists items with null SAT/weight fields", async () => {
    const { repo, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

    const waybill = await useCase.execute(baseRequest(), CREATOR_ID);

    expect(waybill.items[0].satBienesTranspCode).toBeNull();
    expect(waybill.items[0].satUnitCode).toBeNull();
    expect(waybill.items[0].weightKg).toBeNull();
  });
});

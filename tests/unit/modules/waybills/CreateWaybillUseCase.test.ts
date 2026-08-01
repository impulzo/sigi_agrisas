import { CreateWaybillUseCase } from "../../../../src/modules/waybills/application/use-cases/CreateWaybillUseCase";
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
  ProductForWaybill,
  FolioForWaybill,
} from "../../../../src/modules/waybills/application/ports/WaybillLookupService";
import {
  InvalidBranchPairError,
  BranchAddressIncompleteError,
  InsufficientStockAtOriginError,
  FacturamaStampError,
} from "../../../../src/modules/waybills/domain/errors";
import { CreateWaybillRequest } from "../../../../src/modules/waybills/application/dto/WaybillDto";

const ORIGIN_ID = "11111111-1111-1111-1111-111111111111";
const DEST_ID = "22222222-2222-2222-2222-222222222222";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const CREATOR_ID = "44444444-4444-4444-4444-444444444444";

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

class FakeLookupService implements WaybillLookupService {
  branches = new Map<string, BranchForWaybill>();
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
}

class FakeGateway implements WaybillFacturamaGateway {
  shouldFail = false;
  calls: StampTrasladoInput[] = [];

  async stampTraslado(input: StampTrasladoInput): Promise<StampTrasladoResult> {
    this.calls.push(input);
    if (this.shouldFail) throw new FacturamaStampError("rejected by SAT");
    return { cfdiId: "cfdi-1", uuid: "UUID-1" };
  }
  async cancel(): Promise<WaybillCancelResult> {
    return { success: true };
  }
  async download(): Promise<WaybillDownloadResult> {
    return { contentBase64: "", contentType: "application/pdf" };
  }
}

function baseRequest(overrides: Partial<CreateWaybillRequest> = {}): CreateWaybillRequest {
  return {
    originBranchId: ORIGIN_ID,
    destinationBranchId: DEST_ID,
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
    ...overrides,
  };
}

function setup() {
  const repo = new InMemoryWaybillRepository();
  const gateway = new FakeGateway();
  const lookup = new FakeLookupService();
  lookup.branches.set(ORIGIN_ID, completeBranch(ORIGIN_ID, "Origen"));
  lookup.branches.set(DEST_ID, completeBranch(DEST_ID, "Destino"));
  lookup.products.set(PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true });
  const useCase = new CreateWaybillUseCase(repo, gateway, lookup);
  return { repo, gateway, lookup, useCase };
}

describe("CreateWaybillUseCase", () => {
  it("creates a completed waybill and moves inventory when stock is sufficient", async () => {
    const { repo, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

    const waybill = await useCase.execute(baseRequest(), CREATOR_ID);

    expect(waybill.status).toBe("completed");
    expect(waybill.facturamaCfdiId).toBe("cfdi-1");
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(40);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(10);
  });

  it("rejects with InsufficientStockAtOriginError and does not move inventory", async () => {
    const { repo, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 5);

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(InsufficientStockAtOriginError);
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(5);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(0);
  });

  it("rejects same branch as origin and destination before touching inventory or Facturama", async () => {
    const { repo, gateway, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);

    await expect(
      useCase.execute(baseRequest({ destinationBranchId: ORIGIN_ID }), CREATOR_ID)
    ).rejects.toThrow(InvalidBranchPairError);
    expect(gateway.calls).toHaveLength(0);
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(50);
  });

  it("rejects when destination branch has incomplete address", async () => {
    const { lookup, useCase } = setup();
    lookup.branches.set(DEST_ID, { ...completeBranch(DEST_ID, "Destino"), addressZipCode: null });

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(BranchAddressIncompleteError);
  });

  it("rolls back nothing already-committed when Facturama rejects the stamp", async () => {
    const { repo, gateway, useCase } = setup();
    repo.setStock(ORIGIN_ID, PRODUCT_ID, 50);
    gateway.shouldFail = true;

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(FacturamaStampError);
    expect(repo.getStock(ORIGIN_ID, PRODUCT_ID)).toBe(50);
    expect(repo.getStock(DEST_ID, PRODUCT_ID)).toBe(0);
  });

  it("skips stock validation for lines without productId", async () => {
    const { repo, useCase } = setup();
    // No stock set for origin at all — a catalog-less free-text line must not be blocked.
    const waybill = await useCase.execute(
      baseRequest({
        items: [
          {
            description: "Materia prima sin catálogo",
            satBienesTranspCode: "10161500",
            satUnitCode: "KGM",
            quantity: 5,
            weightKg: 20,
          },
        ],
      }),
      CREATOR_ID
    );

    expect(waybill.status).toBe("completed");
    expect(waybill.items[0].productId).toBeNull();
  });
});

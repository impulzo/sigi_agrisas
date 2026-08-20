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
  BranchAddressIncompleteError,
  CustomerAddressIncompleteError,
  CustomerNotFoundForWaybillError,
  FacturamaStampError,
  SaleHasNoCustomerError,
  SaleNotCompletedError,
  WaybillSaleNotFoundError,
  VehicleNotFoundForWaybillError,
  DriverNotFoundForWaybillError,
} from "../../../../src/modules/waybills/domain/errors";
import { CreateWaybillRequest, CreateCartaPorteWaybillRequest } from "../../../../src/modules/waybills/application/dto/WaybillDto";

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const CUSTOMER_ID = "22222222-2222-2222-2222-222222222222";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const CREATOR_ID = "44444444-4444-4444-4444-444444444444";
const SALE_ID = "55555555-5555-5555-5555-555555555555";

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

function completedSale(overrides: Partial<SaleForWaybill> = {}): SaleForWaybill {
  return {
    id: SALE_ID,
    branchId: BRANCH_ID,
    customerId: CUSTOMER_ID,
    status: "completed",
    items: [{ productId: PRODUCT_ID, quantity: 10, productNameSnapshot: "Fertilizante" }],
    ...overrides,
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

function baseRequest(
  overrides: Partial<Omit<CreateCartaPorteWaybillRequest, "type">> = {}
): CreateWaybillRequest {
  return {
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
    ...overrides,
    type: "carta_porte",
  };
}

function setup() {
  const repo = new InMemoryWaybillRepository();
  const gateway = new FakeGateway();
  const lookup = new FakeLookupService();
  lookup.branches.set(BRANCH_ID, completeBranch(BRANCH_ID, "Origen"));
  lookup.customers.set(CUSTOMER_ID, completeCustomer(CUSTOMER_ID, "Cliente Uno"));
  lookup.sales.set(SALE_ID, completedSale());
  lookup.products.set(PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true });
  const vehicleRepo = new InMemoryVehicleRepository();
  const driverRepo = new InMemoryDriverRepository();
  const useCase = new CreateWaybillUseCase(repo, gateway, lookup, vehicleRepo, driverRepo);
  return { repo, gateway, lookup, vehicleRepo, driverRepo, useCase };
}

describe("CreateWaybillUseCase — type: carta_porte (from sale)", () => {
  it("creates a completed waybill linked to the sale/customer, without moving inventory", async () => {
    const { repo, useCase } = setup();
    repo.setStock(BRANCH_ID, PRODUCT_ID, 50);

    const waybill = await useCase.execute(baseRequest(), CREATOR_ID);

    expect(waybill.status).toBe("completed");
    expect(waybill.facturamaCfdiId).toBe("cfdi-1");
    expect(waybill.originBranchId).toBe(BRANCH_ID);
    expect(waybill.destinationBranchId).toBeNull();
    expect(waybill.destinationCustomerId).toBe(CUSTOMER_ID);
    expect(waybill.saleId).toBe(SALE_ID);
    // No inventory movement — the sale already decremented origin stock (design.md D5).
    expect(repo.getStock(BRANCH_ID, PRODUCT_ID)).toBe(50);
  });

  it("rejects when the sale does not exist", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(baseRequest({ saleId: "99999999-9999-9999-9999-999999999999" }), CREATOR_ID)
    ).rejects.toThrow(WaybillSaleNotFoundError);
  });

  it("rejects when the sale is not completed", async () => {
    const { lookup, useCase } = setup();
    lookup.sales.set(SALE_ID, completedSale({ status: "cancelled" }));

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(SaleNotCompletedError);
  });

  it("rejects when the sale has no customer", async () => {
    const { lookup, useCase } = setup();
    lookup.sales.set(SALE_ID, completedSale({ customerId: null }));

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(SaleHasNoCustomerError);
  });

  it("rejects when the customer is not found or inactive", async () => {
    const { lookup, useCase } = setup();
    lookup.customers.delete(CUSTOMER_ID);

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(CustomerNotFoundForWaybillError);
  });

  it("rejects when the customer has an incomplete address", async () => {
    const { lookup, useCase } = setup();
    lookup.customers.set(CUSTOMER_ID, { ...completeCustomer(CUSTOMER_ID, "Cliente Uno"), addressZipCode: null });

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(CustomerAddressIncompleteError);
  });

  it("rejects when the origin branch has an incomplete address", async () => {
    const { lookup, useCase } = setup();
    lookup.branches.set(BRANCH_ID, { ...completeBranch(BRANCH_ID, "Origen"), addressZipCode: null });

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(BranchAddressIncompleteError);
  });

  it("rolls back nothing already-committed when Facturama rejects the stamp", async () => {
    const { repo, gateway, useCase } = setup();
    repo.setStock(BRANCH_ID, PRODUCT_ID, 50);
    gateway.shouldFail = true;

    await expect(useCase.execute(baseRequest(), CREATOR_ID)).rejects.toThrow(FacturamaStampError);
    expect(repo.getStock(BRANCH_ID, PRODUCT_ID)).toBe(50);
  });

  it("skips stock validation for lines without productId (free-text)", async () => {
    const { useCase } = setup();

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

  it("persists vehicleId/driverId when both resolve to existing catalog entries", async () => {
    const { useCase, vehicleRepo, driverRepo } = setup();
    const vehicle = await vehicleRepo.create({
      code: "VEH01",
      plate: "XYZ999",
      vehicleConfig: "C2",
      permitType: "TPAF01",
      permitNumber: "SCT-999",
      insuranceCompany: "Aseguradora SA",
      insurancePolicy: "POL-9",
    });
    const driver = await driverRepo.create({
      code: "DRV01",
      name: "Pedro Paramo",
      licenseNumber: "LIC-9",
    });

    const waybill = await useCase.execute(
      baseRequest({
        vehicle: {
          vehicleId: vehicle.id,
          plate: "ABC1234",
          config: "C2",
          permitType: "TPAF01",
          permitNumber: "SCT-123",
          insuranceCompany: "Aseguradora SA",
          insurancePolicy: "POL-1",
        },
        driver: { driverId: driver.id, name: "Juan Perez", licenseNumber: "LIC-1" },
      }),
      CREATOR_ID
    );

    expect(waybill.vehicleId).toBe(vehicle.id);
    expect(waybill.driverId).toBe(driver.id);
    // Trace-back IDs never replace the flat snapshot, which stays authoritative.
    expect(waybill.vehiclePlate).toBe("ABC1234");
    expect(waybill.driverName).toBe("Juan Perez");
  });

  it("soft-deleting the referenced vehicle/driver afterward does not alter the waybill's snapshot", async () => {
    const { useCase, repo, vehicleRepo, driverRepo } = setup();
    const vehicle = await vehicleRepo.create({
      code: "VEH02",
      plate: "PAST-001",
      vehicleConfig: "C2",
      permitType: "TPAF01",
      permitNumber: "SCT-999",
      insuranceCompany: "Aseguradora SA",
      insurancePolicy: "POL-9",
    });
    const driver = await driverRepo.create({ code: "DRV02", name: "Pedro Paramo", licenseNumber: "LIC-9" });

    const waybill = await useCase.execute(
      baseRequest({
        vehicle: {
          vehicleId: vehicle.id,
          plate: "ABC1234",
          config: "C2",
          permitType: "TPAF01",
          permitNumber: "SCT-123",
          insuranceCompany: "Aseguradora SA",
          insurancePolicy: "POL-1",
        },
        driver: { driverId: driver.id, name: "Juan Perez", licenseNumber: "LIC-1" },
      }),
      CREATOR_ID
    );

    await vehicleRepo.update(vehicle.id, { isActive: false });
    await driverRepo.update(driver.id, { isActive: false });

    const reloaded = await repo.findById(waybill.id);
    expect(reloaded!.vehiclePlate).toBe("ABC1234");
    expect(reloaded!.vehicleConfig).toBe("C2");
    expect(reloaded!.driverName).toBe("Juan Perez");
    expect(reloaded!.vehicleId).toBe(vehicle.id);
    expect(reloaded!.driverId).toBe(driver.id);
  });

  it("rejects an unknown vehicleId with VehicleNotFoundForWaybillError", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        baseRequest({
          vehicle: {
            vehicleId: "99999999-9999-9999-9999-999999999999",
            plate: "ABC1234",
            config: "C2",
            permitType: "TPAF01",
            permitNumber: "SCT-123",
            insuranceCompany: "Aseguradora SA",
            insurancePolicy: "POL-1",
          },
        }),
        CREATOR_ID
      )
    ).rejects.toThrow(VehicleNotFoundForWaybillError);
  });

  it("rejects an unknown driverId with DriverNotFoundForWaybillError", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        baseRequest({
          driver: { driverId: "99999999-9999-9999-9999-999999999999", name: "Juan Perez", licenseNumber: "LIC-1" },
        }),
        CREATOR_ID
      )
    ).rejects.toThrow(DriverNotFoundForWaybillError);
  });

  it("persists null vehicleId/driverId for manual capture without catalog IDs (regression)", async () => {
    const { useCase } = setup();

    const waybill = await useCase.execute(baseRequest(), CREATOR_ID);

    expect(waybill.vehicleId).toBeNull();
    expect(waybill.driverId).toBeNull();
  });
});

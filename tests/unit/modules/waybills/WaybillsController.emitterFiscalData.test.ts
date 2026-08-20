jest.mock("@/modules/rbac/infrastructure/di/container", () => ({
  rbacContainer: {
    authorizationService: {
      userCan: jest.fn().mockResolvedValue(false),
      listUserPermissions: jest.fn().mockResolvedValue([]),
      invalidate: jest.fn(),
      invalidateByRole: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import { NextRequest } from "next/server";
import { WaybillsController } from "@/modules/waybills/infrastructure/http/WaybillsController";
import { CreateWaybillUseCase } from "@/modules/waybills/application/use-cases/CreateWaybillUseCase";
import { CancelWaybillUseCase } from "@/modules/waybills/application/use-cases/CancelWaybillUseCase";
import { ListWaybillsUseCase } from "@/modules/waybills/application/use-cases/ListWaybillsUseCase";
import { GetWaybillUseCase } from "@/modules/waybills/application/use-cases/GetWaybillUseCase";
import { DownloadWaybillFileUseCase } from "@/modules/waybills/application/use-cases/DownloadWaybillFileUseCase";
import { InMemoryWaybillRepository } from "@/modules/waybills/infrastructure/repositories/InMemoryWaybillRepository";
import { InMemoryVehicleRepository } from "@/modules/vehicles/infrastructure/repositories/InMemoryVehicleRepository";
import { InMemoryDriverRepository } from "@/modules/drivers/infrastructure/repositories/InMemoryDriverRepository";
import { EmitterFiscalDataIncompleteError } from "@/modules/waybills/domain/errors";
import {
  WaybillFacturamaGateway,
  StampTrasladoInput,
  StampTrasladoResult,
  WaybillCancelResult,
  WaybillDownloadResult,
} from "@/modules/waybills/application/ports/WaybillFacturamaGateway";
import {
  WaybillLookupService,
  BranchForWaybill,
  CustomerForWaybill,
  ProductForWaybill,
  FolioForWaybill,
  SaleForWaybill,
} from "@/modules/waybills/application/ports/WaybillLookupService";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const ORIGIN_BRANCH = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "00000000-0000-0000-0000-000000000001";
const CUSTOMER_ID = "44444444-4444-4444-4444-444444444444";
const SALE_ID = "55555555-5555-5555-5555-555555555555";

function completeBranch(id: string): BranchForWaybill {
  return {
    id,
    name: "Sucursal",
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

function completeCustomer(id: string): CustomerForWaybill {
  return {
    id,
    name: "Cliente Uno",
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
  branches = new Map<string, BranchForWaybill>([[ORIGIN_BRANCH, completeBranch(ORIGIN_BRANCH)]]);
  products = new Map<string, ProductForWaybill>([
    [PRODUCT_ID, { id: PRODUCT_ID, code: "FERT01", name: "Fertilizante", isActive: true }],
  ]);
  customers = new Map<string, CustomerForWaybill>([[CUSTOMER_ID, completeCustomer(CUSTOMER_ID)]]);
  sales = new Map<string, SaleForWaybill>([
    [
      SALE_ID,
      {
        id: SALE_ID,
        branchId: ORIGIN_BRANCH,
        customerId: CUSTOMER_ID,
        status: "completed",
        items: [{ productId: PRODUCT_ID, quantity: 10, productNameSnapshot: "Fertilizante" }],
      },
    ],
  ]);
  async findBranch(branchId: string): Promise<BranchForWaybill | null> {
    return this.branches.get(branchId) ?? null;
  }
  async findProduct(productId: string): Promise<ProductForWaybill | null> {
    return this.products.get(productId) ?? null;
  }
  async findFolioByCode(): Promise<FolioForWaybill | null> {
    return { id: "folio-1", isActive: true };
  }
  async findSale(saleId: string): Promise<SaleForWaybill | null> {
    return this.sales.get(saleId) ?? null;
  }
  async findCustomer(customerId: string): Promise<CustomerForWaybill | null> {
    return this.customers.get(customerId) ?? null;
  }
}

/** Simulates FacturamaRestGateway.stampTraslado when EmitterFiscalSettings is incomplete. */
class GatewayWithIncompleteEmitter implements WaybillFacturamaGateway {
  async stampTraslado(_input: StampTrasladoInput): Promise<StampTrasladoResult> {
    throw new EmitterFiscalDataIncompleteError();
  }
  async cancel(): Promise<WaybillCancelResult> {
    return { success: true };
  }
  async download(): Promise<WaybillDownloadResult> {
    return { contentBase64: "", contentType: "application/pdf" };
  }
}

function makeAuthz(granted: string[]): AuthorizationService {
  return {
    userCan: jest.fn().mockImplementation((_userId: string, key: string) => Promise.resolve(granted.includes(key))),
    listUserPermissions: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn(),
    invalidateByRole: jest.fn().mockResolvedValue(undefined),
  };
}

function buildController() {
  const repo = new InMemoryWaybillRepository();
  const gateway = new GatewayWithIncompleteEmitter();
  const controller = new WaybillsController(
    new CreateWaybillUseCase(repo, gateway, new FakeLookupService(), new InMemoryVehicleRepository(), new InMemoryDriverRepository()),
    new CancelWaybillUseCase(repo, gateway),
    new ListWaybillsUseCase(repo),
    new GetWaybillUseCase(repo),
    new DownloadWaybillFileUseCase(repo, gateway),
    makeAuthz(["waybills:write", "waybills:stamp"])
  );
  return controller;
}

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/waybills", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-user-id": USER_ID, "x-user-branch-id": ORIGIN_BRANCH },
  });
}

const cartaPorteBody = {
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

describe("WaybillsController — EmitterFiscalDataIncompleteError mapping", () => {
  it("maps to HTTP 409 EmitterFiscalDataIncomplete on carta_porte creation", async () => {
    const controller = buildController();
    const res = await controller.create(req(cartaPorteBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("EmitterFiscalDataIncomplete");
  });
});

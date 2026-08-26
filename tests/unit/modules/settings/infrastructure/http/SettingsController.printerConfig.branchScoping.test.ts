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
import { SettingsController } from "@/modules/settings/infrastructure/http/SettingsController";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { UpdateTicketSettingsUseCase } from "@/modules/settings/application/use-cases/UpdateTicketSettingsUseCase";
import { UploadTicketLogoUseCase } from "@/modules/settings/application/use-cases/UploadTicketLogoUseCase";
import { DeleteTicketLogoUseCase } from "@/modules/settings/application/use-cases/DeleteTicketLogoUseCase";
import { GetPricingSettingsUseCase } from "@/modules/settings/application/use-cases/GetPricingSettingsUseCase";
import { UpdatePricingSettingsUseCase } from "@/modules/settings/application/use-cases/UpdatePricingSettingsUseCase";
import { GetInventoryNotificationSettingsUseCase } from "@/modules/settings/application/use-cases/GetInventoryNotificationSettingsUseCase";
import { UpdateInventoryNotificationSettingsUseCase } from "@/modules/settings/application/use-cases/UpdateInventoryNotificationSettingsUseCase";
import { GetBranchPrinterConfigUseCase } from "@/modules/settings/application/use-cases/GetBranchPrinterConfigUseCase";
import { UpdateBranchPrinterConfigUseCase } from "@/modules/settings/application/use-cases/UpdateBranchPrinterConfigUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { InMemoryTicketLogoStorage } from "@/modules/settings/infrastructure/services/InMemoryTicketLogoStorage";
import { InMemoryPricingSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryPricingSettingsRepository";
import { InMemoryInventoryNotificationSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryInventoryNotificationSettingsRepository";
import { InMemoryPrinterConfigRepository } from "@/modules/settings/infrastructure/repositories/InMemoryPrinterConfigRepository";

const BRANCH_A = "11111111-1111-1111-1111-111111111111";
const BRANCH_B = "22222222-2222-2222-2222-222222222222";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function buildController() {
  const repo = new InMemoryTicketSettingsRepository();
  const storage = new InMemoryTicketLogoStorage();
  const pricingRepo = new InMemoryPricingSettingsRepository();
  const inventoryNotificationsRepo = new InMemoryInventoryNotificationSettingsRepository();
  const printerConfigRepo = new InMemoryPrinterConfigRepository();
  const controller = new SettingsController(
    new GetTicketSettingsUseCase(repo),
    new UpdateTicketSettingsUseCase(repo),
    new UploadTicketLogoUseCase(repo, storage),
    new DeleteTicketLogoUseCase(repo, storage),
    new GetPricingSettingsUseCase(pricingRepo),
    new UpdatePricingSettingsUseCase(pricingRepo),
    new GetInventoryNotificationSettingsUseCase(inventoryNotificationsRepo),
    new UpdateInventoryNotificationSettingsUseCase(inventoryNotificationsRepo),
    new GetBranchPrinterConfigUseCase(printerConfigRepo),
    new UpdateBranchPrinterConfigUseCase(printerConfigRepo)
  );
  return { controller };
}

function req(method: string, headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest(`http://localhost/api/v1/admin/branches/${BRANCH_A}/printer-config`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("SettingsController printer-config — branch scoping", () => {
  it("GET sin x-user-id retorna 401", async () => {
    const { controller } = buildController();
    const res = await controller.getPrinterConfig(req("GET"), BRANCH_A);
    expect(res.status).toBe(401);
  });

  it("GET con x-user-branch-id distinto y sin bypass retorna 403", async () => {
    const { controller } = buildController();
    const res = await controller.getPrinterConfig(
      req("GET", { "x-user-id": USER_ID, "x-user-branch-id": BRANCH_B }),
      BRANCH_A
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.required).toBe("branches:access_all");
  });

  it("GET con x-user-branch-id igual al recurso retorna 200", async () => {
    const { controller } = buildController();
    const res = await controller.getPrinterConfig(
      req("GET", { "x-user-id": USER_ID, "x-user-branch-id": BRANCH_A }),
      BRANCH_A
    );
    expect(res.status).toBe(200);
  });

  it("PATCH con branchId de formato inválido retorna 400 antes de tocar enforceBranchScope", async () => {
    const { controller } = buildController();
    const res = await controller.updatePrinterConfig(req("PATCH", {}, { printMode: "browser" }), "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("PATCH con x-user-branch-id distinto y sin bypass retorna 403 (no persiste)", async () => {
    const { controller } = buildController();
    const res = await controller.updatePrinterConfig(
      req("PATCH", { "x-user-id": USER_ID, "x-user-branch-id": BRANCH_B }, { printMode: "browser" }),
      BRANCH_A
    );
    expect(res.status).toBe(403);
  });
});

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
  return { controller, repo, storage, pricingRepo, inventoryNotificationsRepo, printerConfigRepo };
}

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/admin/settings/ticket", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("SettingsController", () => {
  describe("getTicket", () => {
    it("returns 200 with defaults when nothing configured", async () => {
      const { controller } = buildController();
      const res = await controller.getTicket();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        logoUrl: null,
        footerText: null,
        paperWidth: "80mm",
        businessName: null,
        businessRfc: null,
        businessAddress: null,
        businessPhone: null,
        businessTaxRegime: null,
        businessZipCode: null,
        legendText: "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra.",
      });
    });
  });

  describe("updateTicket", () => {
    it("returns 200 on a valid partial update", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", { footerText: "Gracias" }));
      expect(res.status).toBe(200);
    });

    it("returns 400 on an empty body", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", {}));
      expect(res.status).toBe(400);
    });

    it("returns 400 on an invalid paperWidth", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", { paperWidth: "40mm" }));
      expect(res.status).toBe(400);
    });

    it("returns 200 on a valid business-fields update", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(
        req("PATCH", { businessAddress: "Ocotlan de Morelos, Oaxaca. CP 71520", businessTaxRegime: "612", legendText: "Leyenda" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.businessAddress).toBe("Ocotlan de Morelos, Oaxaca. CP 71520");
      expect(body.businessTaxRegime).toBe("612");
      expect(body.legendText).toBe("Leyenda");
    });

    it("returns 200 on a valid businessName/businessRfc update", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", { businessName: "Agrisas S.A. de C.V.", businessRfc: "AGR010101AB1" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.businessName).toBe("Agrisas S.A. de C.V.");
      expect(body.businessRfc).toBe("AGR010101AB1");
    });

    it("returns 400 when businessRfc exceeds 13 chars", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", { businessRfc: "AGR010101AB123" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when businessName exceeds 200 chars", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", { businessName: "A".repeat(201) }));
      expect(res.status).toBe(400);
    });

    it("ignores a legacy headerText field in the body without rejecting the request", async () => {
      const { controller } = buildController();
      const res = await controller.updateTicket(req("PATCH", { headerText: "algún texto", footerText: "Gracias" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.footerText).toBe("Gracias");
      expect(body.headerText).toBeUndefined();
    });
  });

  describe("uploadLogo / deleteLogo", () => {
    it("uploadLogo returns 400 when the file field is missing", async () => {
      const { controller } = buildController();
      const formData = new FormData();
      const request = new NextRequest("http://localhost/api/v1/admin/settings/ticket/logo", {
        method: "POST",
        body: formData,
      });
      const res = await controller.uploadLogo(request);
      expect(res.status).toBe(400);
    });

    it("deleteLogo returns 200 even when no logo exists", async () => {
      const { controller } = buildController();
      const res = await controller.deleteLogo();
      expect(res.status).toBe(200);
    });
  });

  describe("getPricing", () => {
    it("returns 200 with default 5% when nothing configured", async () => {
      const { controller } = buildController();
      const res = await controller.getPricing();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ dosificationSurchargePct: 5 });
    });
  });

  describe("updatePricing", () => {
    it("returns 200 on a valid update", async () => {
      const { controller } = buildController();
      const res = await controller.updatePricing(req("PATCH", { dosificationSurchargePct: 8 }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ dosificationSurchargePct: 8 });
    });

    it("returns 400 on an empty body", async () => {
      const { controller } = buildController();
      const res = await controller.updatePricing(req("PATCH", {}));
      expect(res.status).toBe(400);
    });

    it("returns 400 on a negative value", async () => {
      const { controller } = buildController();
      const res = await controller.updatePricing(req("PATCH", { dosificationSurchargePct: -1 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 on a non-numeric value", async () => {
      const { controller } = buildController();
      const res = await controller.updatePricing(req("PATCH", { dosificationSurchargePct: "abc" }));
      expect(res.status).toBe(400);
    });
  });

  describe("getInventoryNotifications", () => {
    it("returns 200 with null email when nothing configured", async () => {
      const { controller } = buildController();
      const res = await controller.getInventoryNotifications();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ expirationNotificationEmail: null });
    });
  });

  describe("updateInventoryNotifications", () => {
    it("returns 200 on a valid update", async () => {
      const { controller } = buildController();
      const res = await controller.updateInventoryNotifications(req("PATCH", { expirationNotificationEmail: "compras@agrisas.mx" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ expirationNotificationEmail: "compras@agrisas.mx" });
    });

    it("returns 200 when clearing the email to null", async () => {
      const { controller } = buildController();
      await controller.updateInventoryNotifications(req("PATCH", { expirationNotificationEmail: "compras@agrisas.mx" }));
      const res = await controller.updateInventoryNotifications(req("PATCH", { expirationNotificationEmail: null }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ expirationNotificationEmail: null });
    });

    it("returns 400 on an empty body", async () => {
      const { controller } = buildController();
      const res = await controller.updateInventoryNotifications(req("PATCH", {}));
      expect(res.status).toBe(400);
    });

    it("returns 400 on an invalid email format", async () => {
      const { controller } = buildController();
      const res = await controller.updateInventoryNotifications(req("PATCH", { expirationNotificationEmail: "no-es-un-correo" }));
      expect(res.status).toBe(400);
    });
  });
});

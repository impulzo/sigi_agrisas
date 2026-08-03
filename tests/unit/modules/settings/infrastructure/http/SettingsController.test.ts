import { NextRequest } from "next/server";
import { SettingsController } from "@/modules/settings/infrastructure/http/SettingsController";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { UpdateTicketSettingsUseCase } from "@/modules/settings/application/use-cases/UpdateTicketSettingsUseCase";
import { UploadTicketLogoUseCase } from "@/modules/settings/application/use-cases/UploadTicketLogoUseCase";
import { DeleteTicketLogoUseCase } from "@/modules/settings/application/use-cases/DeleteTicketLogoUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { InMemoryTicketLogoStorage } from "@/modules/settings/infrastructure/services/InMemoryTicketLogoStorage";

function buildController() {
  const repo = new InMemoryTicketSettingsRepository();
  const storage = new InMemoryTicketLogoStorage();
  const controller = new SettingsController(
    new GetTicketSettingsUseCase(repo),
    new UpdateTicketSettingsUseCase(repo),
    new UploadTicketLogoUseCase(repo, storage),
    new DeleteTicketLogoUseCase(repo, storage)
  );
  return { controller, repo, storage };
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
      expect(body).toEqual({ logoUrl: null, headerText: null, footerText: null, paperWidth: "80mm" });
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
});

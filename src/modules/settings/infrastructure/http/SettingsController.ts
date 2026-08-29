import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GetTicketSettingsUseCase } from "../../application/use-cases/GetTicketSettingsUseCase";
import { UpdateTicketSettingsUseCase, EmptyUpdateError } from "../../application/use-cases/UpdateTicketSettingsUseCase";
import { UploadTicketLogoUseCase } from "../../application/use-cases/UploadTicketLogoUseCase";
import { DeleteTicketLogoUseCase } from "../../application/use-cases/DeleteTicketLogoUseCase";
import { GetPricingSettingsUseCase } from "../../application/use-cases/GetPricingSettingsUseCase";
import { UpdatePricingSettingsUseCase } from "../../application/use-cases/UpdatePricingSettingsUseCase";
import { GetInventoryNotificationSettingsUseCase } from "../../application/use-cases/GetInventoryNotificationSettingsUseCase";
import { UpdateInventoryNotificationSettingsUseCase } from "../../application/use-cases/UpdateInventoryNotificationSettingsUseCase";
import { GetBranchPrinterConfigUseCase } from "../../application/use-cases/GetBranchPrinterConfigUseCase";
import { UpdateBranchPrinterConfigUseCase, IncompletePrinterConfigError } from "../../application/use-cases/UpdateBranchPrinterConfigUseCase";
import { InvalidImageFormatError } from "../../domain/errors/InvalidImageFormatError";
import { ImageTooLargeError } from "../../domain/errors/ImageTooLargeError";
import { enforceBranchScope } from "@/modules/rbac/infrastructure/http/enforceBranchScope";

const branchIdSchema = z.string().uuid("Invalid branch ID format");

const updatePrinterConfigSchema = z.object({
  printMode: z.enum(["browser", "escpos"]).optional(),
  agentUrl: z
    .string()
    .regex(/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/, "agentUrl must be http(s)://localhost:<port> or http(s)://127.0.0.1:<port>")
    .nullable()
    .optional(),
  printerHost: z.string().min(1).max(200).nullable().optional(),
  printerPort: z.number().int().min(1).max(65535).nullable().optional(),
});

const updateTicketSchema = z.object({
  footerText: z.string().max(500).nullable().optional(),
  paperWidth: z.enum(["58mm", "80mm"]).optional(),
  businessName: z.string().max(200).nullable().optional(),
  businessRfc: z.string().max(13).nullable().optional(),
  businessAddress: z.string().max(300).nullable().optional(),
  businessPhone: z.string().max(30).nullable().optional(),
  businessTaxRegime: z.string().max(120).nullable().optional(),
  businessZipCode: z.string().regex(/^\d{5}$/).nullable().optional(),
  legendText: z.string().max(500).nullable().optional(),
});

const updatePricingSchema = z.object({
  dosificationSurchargePct: z.number().finite().min(0),
});

const updateInventoryNotificationsSchema = z.object({
  expirationNotificationEmail: z.string().email("Invalid email format").max(120).nullable().optional(),
});

export class SettingsController {
  constructor(
    private readonly getTicketUseCase: GetTicketSettingsUseCase,
    private readonly updateTicketUseCase: UpdateTicketSettingsUseCase,
    private readonly uploadLogoUseCase: UploadTicketLogoUseCase,
    private readonly deleteLogoUseCase: DeleteTicketLogoUseCase,
    private readonly getPricingUseCase: GetPricingSettingsUseCase,
    private readonly updatePricingUseCase: UpdatePricingSettingsUseCase,
    private readonly getInventoryNotificationsUseCase: GetInventoryNotificationSettingsUseCase,
    private readonly updateInventoryNotificationsUseCase: UpdateInventoryNotificationSettingsUseCase,
    private readonly getPrinterConfigUseCase: GetBranchPrinterConfigUseCase,
    private readonly updatePrinterConfigUseCase: UpdateBranchPrinterConfigUseCase
  ) {}

  async getTicket(): Promise<NextResponse> {
    const settings = await this.getTicketUseCase.execute();
    return NextResponse.json(settings);
  }

  async updateTicket(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const settings = await this.updateTicketUseCase.execute(parsed.data);
      return NextResponse.json(settings);
    } catch (err) {
      if (err instanceof EmptyUpdateError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }

  async uploadLogo(req: NextRequest): Promise<NextResponse> {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const logoUrl = await this.uploadLogoUseCase.execute({
        buffer,
        mime: file.type,
        sizeBytes: buffer.byteLength,
      });
      return NextResponse.json({ logoUrl });
    } catch (err) {
      if (err instanceof InvalidImageFormatError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof ImageTooLargeError) return NextResponse.json({ error: err.message, maxBytes: err.maxBytes }, { status: 413 });
      throw err;
    }
  }

  async deleteLogo(): Promise<NextResponse> {
    await this.deleteLogoUseCase.execute();
    return NextResponse.json({ success: true });
  }

  async getPricing(): Promise<NextResponse> {
    const settings = await this.getPricingUseCase.execute();
    return NextResponse.json(settings);
  }

  async updatePricing(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updatePricingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const settings = await this.updatePricingUseCase.execute(parsed.data);
    return NextResponse.json(settings);
  }

  async getInventoryNotifications(): Promise<NextResponse> {
    const settings = await this.getInventoryNotificationsUseCase.execute();
    return NextResponse.json(settings);
  }

  async updateInventoryNotifications(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateInventoryNotificationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const settings = await this.updateInventoryNotificationsUseCase.execute(parsed.data);
      return NextResponse.json(settings);
    } catch (err) {
      if (err instanceof EmptyUpdateError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }

  async getPrinterConfig(req: NextRequest, branchId: string): Promise<NextResponse> {
    const idParsed = branchIdSchema.safeParse(branchId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, idParsed.data);
    if (scope) return scope;
    const config = await this.getPrinterConfigUseCase.execute(idParsed.data);
    return NextResponse.json(config);
  }

  async updatePrinterConfig(req: NextRequest, branchId: string): Promise<NextResponse> {
    const idParsed = branchIdSchema.safeParse(branchId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updatePrinterConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, idParsed.data);
    if (scope) return scope;
    try {
      const config = await this.updatePrinterConfigUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(config);
    } catch (err) {
      if (err instanceof IncompletePrinterConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }
}

import {
  FacturamaGateway,
  FacturамаStampInput,
  FacturamaStampResult,
  FacturamaCancelResult,
  FacturamaDownloadResult,
  FacturamaCsdInput,
  FacturamaCsdStatus,
  FacturamaItemInput,
} from "../../application/ports/FacturamaGateway";
import { FacturamaStampError, FacturamaCancelError, FacturamaCsdError } from "../../domain/errors";

function buildBasicAuth(user: string, password: string): string {
  return "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
}

function buildCfdiItemPayload(item: FacturamaItemInput) {
  return {
    ProductCode: item.productCode,
    IdentificationNumber: item.identificationNumber,
    Description: item.description,
    Unit: item.unit,
    UnitCode: item.satUnitCode,
    Quantity: item.quantity,
    UnitPrice: item.unitPrice,
    Discount: item.discount,
    Subtotal: item.subtotal,
    TaxObject: item.taxObject,
    Total: item.total,
    Taxes: item.taxes.map((t) => ({
      Total: t.total,
      Name: t.type,
      Base: t.base,
      Rate: t.rate,
      IsRetention: t.isRetention,
    })),
  };
}

export class FacturamaRestGateway implements FacturamaGateway {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;

  constructor(
    opts: {
      baseUrl?: string;
      user?: string;
      password?: string;
      fetchImpl?: typeof fetch;
    } = {}
  ) {
    const user = opts.user ?? process.env.FACTURAMA_USER ?? "";
    const password = opts.password ?? process.env.FACTURAMA_PASSWORD ?? "";
    this.baseUrl = (opts.baseUrl ?? process.env.FACTURAMA_BASE_URL ?? "https://apisandbox.facturama.mx/").replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;

    if (!user || !password) {
      throw new Error(
        "FACTURAMA_USER and FACTURAMA_PASSWORD are required when FACTURAMA_MOCK is false"
      );
    }
    this.authHeader = buildBasicAuth(user, password);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Facturama HTTP ${res.status}: ${text}`);
    }

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }

  async stamp(input: FacturамаStampInput): Promise<FacturamaStampResult> {
    const payload = {
      Serie: input.series ?? undefined,
      Currency: input.currency,
      PaymentForm: input.paymentForm,
      PaymentMethod: input.paymentMethod,
      ExpeditionPlace: input.expeditionPlace,
      CfdiType: input.cfdiType,
      Receiver: {
        Rfc: input.receiver.rfc,
        Name: input.receiver.name,
        CfdiUse: input.receiver.cfdiUse,
        FiscalRegime: input.receiver.fiscalRegime,
        TaxZipCode: input.receiver.taxZipCode,
      },
      Items: input.items.map(buildCfdiItemPayload),
    };

    let data: Record<string, unknown>;
    try {
      data = await this.request<Record<string, unknown>>("POST", "/3/cfdis", payload);
    } catch (err) {
      throw new FacturamaStampError((err as Error).message);
    }

    return {
      cfdiId: String(data.Id ?? ""),
      uuid: String(((data.Complement as Record<string, unknown>)?.TaxStamp as Record<string, unknown>)?.Uuid ?? data.Id ?? ""),
      xmlUrl: data.XmlUrl ? String(data.XmlUrl) : undefined,
      pdfUrl: data.PdfUrl ? String(data.PdfUrl) : undefined,
    };
  }

  async cancel(cfdiId: string, motive: string, uuidReplacement?: string | null): Promise<FacturamaCancelResult> {
    let path = `/cfdi/${cfdiId}?type=issued&motive=${motive}`;
    if (uuidReplacement) path += `&uuidReplacement=${uuidReplacement}`;

    try {
      const data = await this.request<Record<string, unknown>>("DELETE", path);
      return { success: true, acuseBase64: data.Acuse ? String(data.Acuse) : undefined };
    } catch (err) {
      throw new FacturamaCancelError((err as Error).message);
    }
  }

  async download(format: "pdf" | "xml", cfdiId: string): Promise<FacturamaDownloadResult> {
    const facturamaFormat = format === "pdf" ? "pdf" : "xml";
    const path = `/cfdi/${facturamaFormat}/issued/${cfdiId}`;

    try {
      const data = await this.request<Record<string, unknown>>("GET", path);
      const contentBase64 = String(data.Content ?? data.content ?? "");
      const contentType = format === "pdf" ? "application/pdf" : "application/xml";
      return { contentBase64, contentType };
    } catch (err) {
      throw new FacturamaStampError((err as Error).message);
    }
  }

  async uploadCsd(input: FacturamaCsdInput): Promise<FacturamaCsdStatus> {
    const payload = {
      Rfc: input.rfc,
      Certificate: input.certificateBase64,
      PrivateKey: input.privateKeyBase64,
      PrivateKeyPassword: "[REDACTED]",
    };
    // Send real password without logging
    const realPayload = { ...payload, PrivateKeyPassword: input.privateKeyPassword };

    try {
      const data = await this.request<Record<string, unknown>>("POST", "/api/Csd", realPayload);
      return {
        rfc: input.rfc,
        expiresAt: data.ExpirationDate ? String(data.ExpirationDate) : undefined,
        isValid: true,
      };
    } catch (err) {
      throw new FacturamaCsdError((err as Error).message);
    }
  }

  async getCsdStatus(rfc?: string): Promise<FacturamaCsdStatus> {
    const path = rfc ? `/api/Csd/${rfc}` : "/api/Csd";
    try {
      const data = await this.request<Record<string, unknown>>("GET", path);
      return {
        rfc: rfc ?? String(data.Rfc ?? ""),
        expiresAt: data.ExpirationDate ? String(data.ExpirationDate) : undefined,
        isValid: Boolean(data.IsValid ?? true),
      };
    } catch (err) {
      throw new FacturamaCsdError((err as Error).message);
    }
  }
}

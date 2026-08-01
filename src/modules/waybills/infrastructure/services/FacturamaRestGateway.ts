import {
  WaybillFacturamaGateway,
  StampTrasladoInput,
  StampTrasladoResult,
  WaybillCancelResult,
  WaybillDownloadResult,
  WaybillLocationInput,
  WaybillMerchandiseInput,
} from "../../application/ports/WaybillFacturamaGateway";
import { FacturamaStampError, FacturamaCancelError } from "../../domain/errors";

function buildBasicAuth(user: string, password: string): string {
  return "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
}

function buildLocationPayload(loc: WaybillLocationInput) {
  return {
    Street: loc.street,
    ExteriorNumber: loc.exteriorNumber,
    InteriorNumber: loc.interiorNumber ?? undefined,
    Neighborhood: loc.neighborhood,
    Municipality: loc.municipality,
    State: loc.state,
    Country: loc.country,
    ZipCode: loc.zipCode,
  };
}

function buildMerchandisePayload(item: WaybillMerchandiseInput) {
  return {
    BienesTransp: item.satBienesTranspCode,
    Description: item.description,
    Quantity: item.quantity,
    UnitCode: item.satUnitCode,
    Weight: item.weightKg,
    MaterialPeligroso: item.isHazardousMaterial ? "Si" : "No",
    CveMaterialPeligroso: item.hazardousMaterialCode ?? undefined,
  };
}

export class FacturamaRestGateway implements WaybillFacturamaGateway {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;
  private readonly emitterRfc: string;
  private readonly emitterName: string;
  private readonly emitterFiscalRegime: string;
  private readonly emitterZipCode: string;

  constructor(
    opts: {
      baseUrl?: string;
      user?: string;
      password?: string;
      emitterRfc?: string;
      emitterName?: string;
      emitterFiscalRegime?: string;
      emitterZipCode?: string;
      fetchImpl?: typeof fetch;
    } = {}
  ) {
    const user = opts.user ?? process.env.FACTURAMA_USER ?? "";
    const password = opts.password ?? process.env.FACTURAMA_PASSWORD ?? "";
    this.baseUrl = (opts.baseUrl ?? process.env.FACTURAMA_BASE_URL ?? "https://apisandbox.facturama.mx/").replace(
      /\/$/,
      ""
    );
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.emitterRfc = opts.emitterRfc ?? process.env.FACTURAMA_EMITTER_RFC ?? "";
    this.emitterName = opts.emitterName ?? process.env.FACTURAMA_EMITTER_NAME ?? "";
    this.emitterFiscalRegime = opts.emitterFiscalRegime ?? process.env.FACTURAMA_EMITTER_FISCAL_REGIME ?? "";
    this.emitterZipCode = opts.emitterZipCode ?? process.env.FACTURAMA_EMITTER_ZIP_CODE ?? "";

    if (!user || !password) {
      throw new Error("FACTURAMA_USER and FACTURAMA_PASSWORD are required when FACTURAMA_MOCK is false");
    }
    if (!this.emitterRfc || !this.emitterFiscalRegime || !this.emitterZipCode) {
      throw new Error(
        "FACTURAMA_EMITTER_RFC, FACTURAMA_EMITTER_FISCAL_REGIME and FACTURAMA_EMITTER_ZIP_CODE are required when FACTURAMA_MOCK is false"
      );
    }
    this.authHeader = buildBasicAuth(user, password);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
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

  async stampTraslado(input: StampTrasladoInput): Promise<StampTrasladoResult> {
    const payload = {
      CfdiType: "T",
      Currency: "XXX",
      Total: 0,
      ExpeditionPlace: this.emitterZipCode,
      Receiver: {
        Rfc: this.emitterRfc,
        Name: this.emitterName || this.emitterRfc,
        CfdiUse: "S01",
        FiscalRegime: this.emitterFiscalRegime,
        TaxZipCode: this.emitterZipCode,
      },
      Complemento: {
        CartaPorte: {
          TranspInternac: "No",
          Ubicaciones: [
            { TipoUbicacion: "Origen", ...buildLocationPayload(input.origin) },
            { TipoUbicacion: "Destino", ...buildLocationPayload(input.destination) },
          ],
          Mercancias: {
            DistanciaRecorrida: input.distanceKm,
            Mercancia: input.merchandise.map(buildMerchandisePayload),
            Autotransporte: {
              PermSCT: input.autotransporte.permitType,
              NumPermisoSCT: input.autotransporte.permitNumber,
              Placa: input.autotransporte.plate,
              ConfigVehicular: input.autotransporte.config,
              AseguraRespCivil: input.autotransporte.insuranceCompany,
              PolizaRespCivil: input.autotransporte.insurancePolicy,
            },
          },
          FiguraTransporte: [
            {
              TipoFigura: "01",
              RFCFigura: input.figuraTransporte.rfc ?? undefined,
              NombreFigura: input.figuraTransporte.name,
              NumLicencia: input.figuraTransporte.licenseNumber,
            },
          ],
        },
      },
    };

    let data: Record<string, unknown>;
    try {
      data = await this.request<Record<string, unknown>>("POST", "/3/cfdis", payload);
    } catch (err) {
      throw new FacturamaStampError((err as Error).message);
    }

    return {
      cfdiId: String(data.Id ?? ""),
      uuid: String(
        ((data.Complement as Record<string, unknown>)?.TaxStamp as Record<string, unknown>)?.Uuid ?? data.Id ?? ""
      ),
      xmlUrl: data.XmlUrl ? String(data.XmlUrl) : undefined,
      pdfUrl: data.PdfUrl ? String(data.PdfUrl) : undefined,
    };
  }

  async cancel(cfdiId: string, motive: string): Promise<WaybillCancelResult> {
    const path = `/cfdi/${cfdiId}?type=issued&motive=${motive}`;
    try {
      const data = await this.request<Record<string, unknown>>("DELETE", path);
      return { success: true, acuseBase64: data.Acuse ? String(data.Acuse) : undefined };
    } catch (err) {
      throw new FacturamaCancelError((err as Error).message);
    }
  }

  async download(format: "pdf" | "xml", cfdiId: string): Promise<WaybillDownloadResult> {
    const path = `/cfdi/${format}/issued/${cfdiId}`;
    try {
      const data = await this.request<Record<string, unknown>>("GET", path);
      const contentBase64 = String(data.Content ?? data.content ?? "");
      const contentType = format === "pdf" ? "application/pdf" : "application/xml";
      return { contentBase64, contentType };
    } catch (err) {
      throw new FacturamaStampError((err as Error).message);
    }
  }
}

import {
  WaybillFacturamaGateway,
  StampTrasladoInput,
  StampTrasladoResult,
  WaybillCancelResult,
  WaybillDownloadResult,
  WaybillLocationInput,
  WaybillMerchandiseInput,
} from "../../application/ports/WaybillFacturamaGateway";
import { FacturamaStampError, FacturamaCancelError, EmitterFiscalDataIncompleteError } from "../../domain/errors";
import {
  getEmitterFiscalSettings,
  isEmitterFiscalDataComplete,
} from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";
import { FacturamaHttpClient } from "@/shared/infrastructure/facturama/FacturamaHttpClient";

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
  private readonly http: FacturamaHttpClient;

  constructor(
    opts: {
      baseUrl?: string;
      user?: string;
      password?: string;
      fetchImpl?: typeof fetch;
    } = {}
  ) {
    this.http = new FacturamaHttpClient(opts);
  }

  private request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.http.request<T>(method, path, body);
  }

  async stampTraslado(input: StampTrasladoInput): Promise<StampTrasladoResult> {
    const emitter = await getEmitterFiscalSettings();
    if (!isEmitterFiscalDataComplete(emitter)) {
      throw new EmitterFiscalDataIncompleteError();
    }

    const payload = {
      CfdiType: "T",
      Currency: "XXX",
      Total: 0,
      ExpeditionPlace: emitter.zipCode,
      Receiver: {
        Rfc: emitter.rfc,
        Name: emitter.legalName,
        CfdiUse: "S01",
        FiscalRegime: emitter.fiscalRegime,
        TaxZipCode: emitter.zipCode,
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

"use client";

import { XMLParser } from "fast-xml-parser";

export class SatXmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SatXmlParseError";
  }
}

export interface SatTraslado {
  impuesto: string;
  tipoFactor: string | null;
  tasaOCuota: number | null;
  importe: number | null;
}

export interface SatConcepto {
  claveProdServ: string;
  noIdentificacion: string | null;
  cantidad: number;
  claveUnidad: string | null;
  unidad: string | null;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  traslados: SatTraslado[];
}

export interface ParsedSatInvoice {
  version: string;
  serie: string | null;
  folio: string | null;
  fecha: string;
  formaPago: string | null;
  metodoPago: string | null;
  moneda: string | null;
  subTotal: number | null;
  total: number | null;
  tipoDeComprobante: string | null;
  uuid: string | null;
  emisor: { rfc: string; nombre: string | null; regimenFiscal: string | null };
  receptor: { rfc: string | null; nombre: string | null };
  conceptos: SatConcepto[];
  trasladosComprobante: SatTraslado[];
}

type RecordNode = Record<string, unknown>;

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  trimValues: true,
  parseTagValue: false,
});

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): RecordNode {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as RecordNode;
  return {};
}

function toStr(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  return String(value);
}

function toNum(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function parseTraslados(node: unknown): SatTraslado[] {
  const rec = asRecord(node);
  return toArray(rec.Traslado as RecordNode[] | RecordNode | undefined).map((t) => {
    const r = asRecord(t);
    return {
      impuesto: toStr(r.Impuesto) ?? "",
      tipoFactor: toStr(r.TipoFactor),
      tasaOCuota: toNum(r.TasaOCuota),
      importe: toNum(r.Importe),
    };
  });
}

export function parseSatInvoice(xml: string): ParsedSatInvoice {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new SatXmlParseError("El archivo no es un XML válido.");
  }

  const comprobante = asRecord(doc).Comprobante as RecordNode | undefined;
  if (!comprobante) {
    throw new SatXmlParseError("No se encontró el nodo cfdi:Comprobante en el XML.");
  }

  const emisor = asRecord(comprobante.Emisor);
  const receptor = asRecord(comprobante.Receptor);
  const conceptosNode = asRecord(comprobante.Conceptos);
  const conceptoNodes = toArray(conceptosNode.Concepto as RecordNode[] | RecordNode | undefined);

  const conceptos: SatConcepto[] = conceptoNodes.map((c) => {
    const r = asRecord(c);
    const impuestos = asRecord(r.Impuestos);
    return {
      claveProdServ: toStr(r.ClaveProdServ) ?? "",
      noIdentificacion: toStr(r.NoIdentificacion),
      cantidad: toNum(r.Cantidad) ?? 0,
      claveUnidad: toStr(r.ClaveUnidad),
      unidad: toStr(r.Unidad),
      descripcion: toStr(r.Descripcion) ?? "",
      valorUnitario: toNum(r.ValorUnitario) ?? 0,
      importe: toNum(r.Importe) ?? 0,
      traslados: parseTraslados(impuestos.Traslados),
    };
  });

  const complemento = asRecord(comprobante.Complemento);
  const timbre = asRecord(toArray(complemento.TimbreFiscalDigital as RecordNode[] | RecordNode | undefined)[0]);

  return {
    version: toStr(comprobante.Version) ?? "",
    serie: toStr(comprobante.Serie),
    folio: toStr(comprobante.Folio),
    fecha: toStr(comprobante.Fecha) ?? new Date().toISOString(),
    formaPago: toStr(comprobante.FormaPago),
    metodoPago: toStr(comprobante.MetodoPago),
    moneda: toStr(comprobante.Moneda),
    subTotal: toNum(comprobante.SubTotal),
    total: toNum(comprobante.Total),
    tipoDeComprobante: toStr(comprobante.TipoDeComprobante),
    uuid: toStr(timbre.UUID),
    emisor: {
      rfc: toStr(emisor.Rfc) ?? "",
      nombre: toStr(emisor.Nombre),
      regimenFiscal: toStr(emisor.RegimenFiscal),
    },
    receptor: {
      rfc: toStr(receptor.Rfc),
      nombre: toStr(receptor.Nombre),
    },
    conceptos,
    trasladosComprobante: parseTraslados(asRecord(comprobante.Impuestos).Traslados),
  };
}

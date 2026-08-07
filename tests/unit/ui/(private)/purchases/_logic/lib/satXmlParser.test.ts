import { parseSatInvoice, SatXmlParseError } from "../../../../../../../app/(private)/purchases/_logic/lib/satXmlParser";

const CFDI_4 = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="F" Folio="123" Fecha="2026-08-05T09:30:00" Sello="abc" FormaPago="03" NoCertificado="00001000000000000000" Certificado="abc" SubTotal="300.00" Moneda="MXN" Total="348.00" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="64000">
  <cfdi:Emisor Rfc="XYZ010101AAA" Nombre="PROVEEDOR DEMO SA DE CV" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ABC010101ABC" Nombre="RECEPTOR DEMO" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="601" UsoCFDI="G01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="01010101" NoIdentificacion="P001" Cantidad="2" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Producto uno" ValorUnitario="100.00" Importe="200.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="200.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="32.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
    <cfdi:Concepto ClaveProdServ="01010102" NoIdentificacion="P002" Cantidad="1" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Producto dos" ValorUnitario="100.00" Importe="100.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="100.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="48.00">
    <cfdi:Traslados>
      <cfdi:Traslado Base="300.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="48.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv12.xsd" Version="1.1" UUID="123e4567-e89b-12d3-a456-426614174000" FechaTimbrado="2026-08-05T09:31:00" RfcProvCertif="AAA010101AAA" SelloCFD="abc" NoCertificadoSAT="00001000000000000000" SelloSAT="abc"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

describe("parseSatInvoice", () => {
  it("parses emisor, folio, fecha y UUID", () => {
    const parsed = parseSatInvoice(CFDI_4);
    expect(parsed.version).toBe("4.0");
    expect(parsed.serie).toBe("F");
    expect(parsed.folio).toBe("123");
    expect(parsed.fecha).toBe("2026-08-05T09:30:00");
    expect(parsed.formaPago).toBe("03");
    expect(parsed.moneda).toBe("MXN");
    expect(parsed.uuid).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(parsed.emisor).toEqual({ rfc: "XYZ010101AAA", nombre: "PROVEEDOR DEMO SA DE CV", regimenFiscal: "601" });
  });

  it("parses conceptos con cantidades, costos e impuestos", () => {
    const parsed = parseSatInvoice(CFDI_4);
    expect(parsed.conceptos).toHaveLength(2);
    const c = parsed.conceptos[0];
    expect(c.claveProdServ).toBe("01010101");
    expect(c.cantidad).toBe(2);
    expect(c.valorUnitario).toBe(100);
    expect(c.importe).toBe(200);
    expect(c.descripcion).toBe("Producto uno");
    expect(c.traslados).toHaveLength(1);
    expect(c.traslados[0]).toEqual({ impuesto: "002", tipoFactor: "Tasa", tasaOCuota: 0.16, importe: 32 });
  });

  it("throws SatXmlParseError for a document without Comprobante", () => {
    expect(() => parseSatInvoice("<foo><bar/></foo>")).toThrow(SatXmlParseError);
  });
});

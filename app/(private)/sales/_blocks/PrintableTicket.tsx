import type { SaleDetail } from "../_logic/types/domain";
import type { TicketSettingsDto } from "../../settings/_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

// Constantes de altura estimada por sección del ticket (mm), a 10px monospace en ancho térmico.
const BASE_HEIGHT_MM = 120; // logo + header de negocio + meta + totales + footer + leyenda + barcode
const CUSTOMER_SECTION_HEIGHT_MM = 30;
const CREDIT_LINE_HEIGHT_MM = 8;
const PER_ITEM_HEIGHT_MM = 12;
// Margen ampliado (antes 20) para impresoras térmicas cuyo driver puede sustituir el tamaño de
// página custom por uno propio (ej. EPSON TM-T20II) — evita que el auto-cutter corte contenido
// o que el driver agregue una hoja en blanco por subestimar la altura real.
const SAFETY_MARGIN_MM = 35;
// Feed final explícito antes del corte automático, además del margen de seguridad de altura.
const FINAL_FEED_MM = 12;

function computeTicketPageHeightMm(sale: SaleDetail): number {
  return (
    BASE_HEIGHT_MM +
    (sale.customerId ? CUSTOMER_SECTION_HEIGHT_MM : 0) +
    (sale.customerCreditDays != null ? CREDIT_LINE_HEIGHT_MM : 0) +
    sale.items.length * PER_ITEM_HEIGHT_MM +
    SAFETY_MARGIN_MM +
    FINAL_FEED_MM
  );
}

interface PrintableTicketProps {
  sale: SaleDetail;
  ticketSettings: TicketSettingsDto | null;
}

export function PrintableTicket({ sale, ticketSettings }: PrintableTicketProps) {
  const paperWidth = ticketSettings?.paperWidth ?? "80mm";
  const pageHeightMm = computeTicketPageHeightMm(sale);
  const folioLabel = sale.folioCode;
  const ivaTotal = sale.items.reduce((sum, item) => sum + item.lineIva, 0);
  const iepsTotal = sale.items.reduce((sum, item) => sum + item.lineIeps, 0);

  const businessName = ticketSettings?.businessName ?? null;
  const businessRfc = ticketSettings?.businessRfc ?? null;
  const businessAddress = ticketSettings?.businessAddress ?? null;
  const businessPhone = ticketSettings?.businessPhone ?? null;
  const businessTaxRegime = ticketSettings?.businessTaxRegime ?? null;
  const legendText = ticketSettings?.legendText ?? null;

  return (
    <div className="printable-ticket print-area hidden print:block">
      <style>{`
        @page { size: ${paperWidth} ${pageHeightMm}mm; margin: 4mm 3mm; }
        @media print {
          .printable-ticket {
            width: ${paperWidth};
            margin: 0 !important;
            position: absolute !important;
            font-family: monospace, monospace;
            font-size: 10px;
            color: #000000 !important;
            background: #ffffff !important;
            box-sizing: border-box;
          }
          .printable-ticket * { box-sizing: border-box; color: #000000 !important; }
          .printable-ticket img { width: 125px; height: 77px; object-fit: contain; display: block; margin: 0 auto 8px; }
          .printable-ticket table { width: 100%; border-collapse: collapse; }
          .printable-ticket hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
        }
      `}</style>

      {ticketSettings?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ticketSettings.logoUrl} alt="Logo" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo.png" alt="Logo" />
      )}
      <hr />

      {/* Información del negocio */}
      <div style={{ textAlign: "center", whiteSpace: "pre-wrap" }}>
        {businessName && <p style={{ fontWeight: "bold" }}>{businessName}</p>}
        {businessRfc && <p>RFC: {businessRfc}</p>}
        {businessAddress && <p>{businessAddress}</p>}
        {businessPhone && <p>Tel. {businessPhone}</p>}
        {businessTaxRegime && <p>{businessTaxRegime}</p>}
      </div>

      <hr />

      {/* Datos del ticket */}
      <p>Folio: {folioLabel}</p>
      <p>Fecha: {fmtDate(sale.createdAt)}</p>
      <p>Vendedor: {sale.cashierName ?? sale.cashierId.slice(0, 8)}</p>
      <p>Sucursal: {sale.branchName ?? "—"}</p>
      <p style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Pago</span>
        <span>{sale.paymentMethodName ?? "—"}</span>
      </p>

      <hr />

      {/* Cliente */}
      {sale.customerId && (
        <>
          <p style={{ fontWeight: "bold" }}>Cliente</p>
          <p>RFC: {sale.customerRfc ?? "—"}</p>
          <p>Nombre: {sale.customerName ?? "—"}</p>
          <p>Dirección: {sale.customerAddress ?? "—"}</p>
          <hr />
        </>
      )}

      {/* Condiciones de crédito */}
      {sale.customerCreditDays != null && (
        <p style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Condiciones</span>
          <span>Crédito a {sale.customerCreditDays} días</span>
        </p>
      )}

      <table>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td colSpan={2}>{item.productNameSnapshot}</td>
              <td style={{ textAlign: "right" }}>
                {item.quantity} x {fmt(item.unitPrice)} = {fmt(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <p style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Subtotal</span>
        <span>{fmt(sale.subtotal)}</span>
      </p>
      <p style={{ display: "flex", justifyContent: "space-between" }}>
        <span>IVA</span>
        <span>{fmt(ivaTotal)}</span>
      </p>
      <p style={{ display: "flex", justifyContent: "space-between" }}>
        <span>IEPS</span>
        <span>{fmt(iepsTotal)}</span>
      </p>
      <p style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
        <span>Total a pagar</span>
        <span>{fmt(sale.total)}</span>
      </p>
      <hr />

      {ticketSettings?.footerText && (
        <p style={{ textAlign: "center", whiteSpace: "pre-wrap" }}>{ticketSettings.footerText}</p>
      )}

      {legendText && (
        <p style={{ textAlign: "center", whiteSpace: "pre-wrap", marginTop: "4px" }}>{legendText}</p>
      )}

      <div style={{ textAlign: "center", marginTop: "4px" }}>
        <div
          aria-hidden="true"
          style={{
            height: "12px",
            margin: "0 auto",
            maxWidth: "70%",
            backgroundImage: "repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 5px)",
            opacity: 0.7,
          }}
        />
        <p style={{ marginTop: "2px" }}>{folioLabel}</p>
      </div>

      {/* Feed final antes del corte automático — evita que el cutter recorte la última línea */}
      <div aria-hidden="true" style={{ height: `${FINAL_FEED_MM}mm` }} />
    </div>
  );
}

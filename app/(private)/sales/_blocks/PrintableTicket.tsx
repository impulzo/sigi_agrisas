import type { SaleDetail } from "../_logic/types/domain";
import type { TicketSettingsDto } from "../../settings/_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

interface PrintableTicketProps {
  sale: SaleDetail;
  ticketSettings: TicketSettingsDto | null;
}

export function PrintableTicket({ sale, ticketSettings }: PrintableTicketProps) {
  const paperWidth = ticketSettings?.paperWidth ?? "80mm";
  const folioLabel = sale.folioPrefix ? `${sale.folioPrefix}-${sale.folioNumber}` : String(sale.folioNumber);
  const ivaTotal = sale.items.reduce((sum, item) => sum + item.lineIva, 0);
  const iepsTotal = sale.items.reduce((sum, item) => sum + item.lineIeps, 0);

  return (
    <div className="printable-ticket hidden print:block">
      <style>{`
        @media print {
          .printable-ticket { width: ${paperWidth}; font-family: monospace; font-size: 10px; }
          .printable-ticket img { max-width: 100%; display: block; margin: 0 auto 4px; }
          .printable-ticket table { width: 100%; border-collapse: collapse; }
          .printable-ticket hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
        }
      `}</style>

      {ticketSettings?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ticketSettings.logoUrl} alt="Logo" />
      )}
      {ticketSettings?.headerText && (
        <p style={{ textAlign: "center", whiteSpace: "pre-wrap" }}>{ticketSettings.headerText}</p>
      )}

      <hr />
      <p>Folio: {folioLabel}</p>
      <p>Fecha: {fmtDate(sale.createdAt)}</p>
      <p>Cajero: {sale.cashierName ?? sale.cashierId.slice(0, 8)}</p>
      <p>Sucursal: {sale.branchName ?? "—"}</p>
      <hr />

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
        <span>Total</span>
        <span>{fmt(sale.total)}</span>
      </p>
      <hr />

      {ticketSettings?.footerText && (
        <p style={{ textAlign: "center", whiteSpace: "pre-wrap" }}>{ticketSettings.footerText}</p>
      )}
    </div>
  );
}

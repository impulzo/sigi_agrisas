import { SaleRepository } from "../ports/SaleRepository";
import { PosLookupService } from "../ports/PosLookups";
import { toSaleDetailDto } from "../mappers/toSaleDto";
import { SaleNotFoundError } from "../../domain/errors/SaleNotFoundError";
import { SaleNoEmailError } from "../../domain/errors/SaleNoEmailError";
import { SaleEmailSendFailedError } from "../../domain/errors/SaleEmailSendFailedError";
import type { MailerPort } from "@/shared/application/ports/MailerPort";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

export class SendSaleTicketEmailUseCase {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly lookups: PosLookupService,
    private readonly mailer: MailerPort
  ) {}

  async execute(id: string, overrideEmail?: string): Promise<{ sentTo: string }> {
    const summary = await this.saleRepo.findByIdWithItems(id);
    if (!summary) throw new SaleNotFoundError(id);

    let sentTo = overrideEmail;
    if (!sentTo) {
      const customer = summary.sale.customerId ? await this.lookups.getCustomer(summary.sale.customerId) : null;
      sentTo = customer?.email ?? undefined;
    }
    if (!sentTo) throw new SaleNoEmailError();

    const dto = toSaleDetailDto(summary.sale, summary.joined, summary.returnedQuantityBySaleItem ?? {});
    const folioLabel = dto.folioCode;
    const ivaTotal = dto.items.reduce((sum, item) => sum + item.lineIva, 0);
    const iepsTotal = dto.items.reduce((sum, item) => sum + item.lineIeps, 0);

    const itemsHtml = dto.items
      .map(
        (item) =>
          `<tr><td>${item.productNameSnapshot}</td><td style="text-align:right">${item.quantity} x ${MX.format(item.unitPrice)}</td><td style="text-align:right">${MX.format(item.lineTotal)}</td></tr>`
      )
      .join("");

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Ticket de venta — Folio ${folioLabel}</h2>
        <p>Fecha: ${new Date(dto.createdAt).toLocaleString("es-MX")}</p>
        <p>Método de pago: ${dto.paymentMethodName ?? "—"}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr><th style="text-align:left">Producto</th><th style="text-align:right">Cant. x Precio</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <hr />
        <p style="display:flex; justify-content:space-between;">Subtotal: ${MX.format(dto.subtotal)}</p>
        <p style="display:flex; justify-content:space-between;">IVA: ${MX.format(ivaTotal)}</p>
        <p style="display:flex; justify-content:space-between;">IEPS: ${MX.format(iepsTotal)}</p>
        <p style="font-weight:bold;">Total: ${MX.format(dto.total)}</p>
      </div>
    `;

    try {
      await this.mailer.send({
        to: sentTo,
        subject: `Ticket de venta ${folioLabel} — Agrisas`,
        html,
      });
    } catch (err) {
      throw new SaleEmailSendFailedError(err);
    }

    return { sentTo };
  }
}

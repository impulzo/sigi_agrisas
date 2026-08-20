import type { MailerPort } from "@/shared/application/ports/MailerPort";

export interface SaleCancelledNotification {
  folioCode: string;
  total: number;
  cancellationReason: string | null;
  branchName: string;
  cashierName: string;
}

export interface LowStockNotification {
  productName: string;
  productCode: string;
  branchName: string;
  quantity: number;
  reorderPoint: number;
}

export type InventoryExpiryThreshold = "sixMonths" | "threeMonths" | "dayOf";

export interface InventoryExpiryDigestItem {
  productName: string;
  branchName: string;
  lotNumber: string;
  quantity: number;
  expirationDate: Date;
}

const THRESHOLD_LABEL: Record<InventoryExpiryThreshold, string> = {
  sixMonths: "6 meses",
  threeMonths: "3 meses",
  dayOf: "hoy",
};

export class AdminNotificationService {
  constructor(private readonly mailer: MailerPort) {}

  async notifySaleCancelled(sale: SaleCancelledNotification): Promise<void> {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!to) return;
    try {
      await this.mailer.send({
        to,
        subject: `Venta cancelada — folio ${sale.folioCode}`,
        html: `
          <p>Se canceló la venta <strong>${sale.folioCode}</strong>.</p>
          <ul>
            <li>Total: $${sale.total.toFixed(2)}</li>
            <li>Motivo: ${sale.cancellationReason ?? "sin motivo"}</li>
            <li>Sucursal: ${sale.branchName}</li>
            <li>Cajero: ${sale.cashierName}</li>
          </ul>
        `,
      });
    } catch (err) {
      console.error("[AdminNotificationService] Failed to send sale-cancelled notification:", err);
    }
  }

  async notifyLowStock(item: LowStockNotification): Promise<void> {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!to) return;
    try {
      await this.mailer.send({
        to,
        subject: `Stock bajo — ${item.productName}`,
        html: `
          <p>El producto <strong>${item.productName}</strong> (${item.productCode}) cayó por debajo del punto de reorden.</p>
          <ul>
            <li>Sucursal: ${item.branchName}</li>
            <li>Existencia actual: ${item.quantity}</li>
            <li>Punto de reorden: ${item.reorderPoint}</li>
          </ul>
        `,
      });
    } catch (err) {
      console.error("[AdminNotificationService] Failed to send low-stock notification:", err);
    }
  }

  async notifyInventoryExpiryDigest(params: {
    to: string | null;
    threshold: InventoryExpiryThreshold;
    items: InventoryExpiryDigestItem[];
  }): Promise<void> {
    if (!params.to) return;
    const rows = params.items
      .map(
        (item) => `
          <tr>
            <td>${item.productName}</td>
            <td>${item.branchName}</td>
            <td>${item.lotNumber}</td>
            <td>${item.quantity}</td>
            <td>${item.expirationDate.toISOString().slice(0, 10)}</td>
          </tr>`
      )
      .join("");
    try {
      await this.mailer.send({
        to: params.to,
        subject: `Lotes de inventario por vencer — ${THRESHOLD_LABEL[params.threshold]}`,
        html: `
          <p>Los siguientes lotes de inventario vencen en <strong>${THRESHOLD_LABEL[params.threshold]}</strong>:</p>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Sucursal</th>
                <th>Lote</th>
                <th>Cantidad</th>
                <th>Fecha de caducidad</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `,
      });
    } catch (err) {
      console.error("[AdminNotificationService] Failed to send inventory-expiry digest:", err);
    }
  }
}

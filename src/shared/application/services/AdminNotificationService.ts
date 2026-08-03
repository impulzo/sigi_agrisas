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
}

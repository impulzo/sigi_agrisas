import { Prisma, PrismaClient } from "@prisma/client";
import { SalesByProductRepository } from "../../application/ports/SalesByProductRepository";
import {
  SalesByProductFilters,
  SalesByProductAggregates,
  SalesByProductRow,
} from "../../domain/value-objects/SalesByProductFilters";

const ACTIVE_STATUSES = ["completed", "edited"];

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export class PrismaSalesByProductRepository implements SalesByProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getAggregates(filters: SalesByProductFilters): Promise<SalesByProductAggregates> {
    const to = endOfDay(filters.to);
    const from = filters.from;

    // Condiciones SQL compartidas por los queries raw (sale_items JOIN sales JOIN products).
    const conds = (): Prisma.Sql => {
      const parts: Prisma.Sql[] = [
        Prisma.sql`s.status IN ('completed','edited')`,
        Prisma.sql`s.created_at >= ${from}`,
        Prisma.sql`s.created_at <= ${to}`,
      ];
      if (filters.branchId) parts.push(Prisma.sql`s.branch_id = ${filters.branchId}`);
      if (filters.customerId) parts.push(Prisma.sql`s.customer_id = ${filters.customerId}`);
      if (filters.departmentId) parts.push(Prisma.sql`p.department_id = ${filters.departmentId}`);
      return Prisma.join(parts, " AND ");
    };

    const [totalsRows, customerRows, departmentRows, productRows, stockRows] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ ticket_count: number; subtotal: string; tax_total: string; total: string }>
      >`
        SELECT COUNT(DISTINCT si.sale_id)::int AS ticket_count,
               COALESCE(SUM(si.line_subtotal), 0) AS subtotal,
               COALESCE(SUM(si.line_tax), 0) AS tax_total,
               COALESCE(SUM(si.line_total), 0) AS total
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE ${conds()}
      `,
      this.prisma.$queryRaw<
        Array<{
          customer_key: string;
          customer_name: string;
          ticket_count: number;
          subtotal: string;
          tax_total: string;
          total: string;
        }>
      >`
        SELECT COALESCE(s.customer_id::text, 'sin-cliente') AS customer_key,
               COALESCE(c.name, 'Sin cliente') AS customer_name,
               COUNT(DISTINCT si.sale_id)::int AS ticket_count,
               COALESCE(SUM(si.line_subtotal), 0) AS subtotal,
               COALESCE(SUM(si.line_tax), 0) AS tax_total,
               COALESCE(SUM(si.line_total), 0) AS total
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE ${conds()}
        GROUP BY COALESCE(s.customer_id::text, 'sin-cliente'), COALESCE(c.name, 'Sin cliente')
        ORDER BY total DESC
      `,
      this.prisma.$queryRaw<
        Array<{
          department_id: string;
          department_name: string;
          ticket_count: number;
          subtotal: string;
          tax_total: string;
          total: string;
        }>
      >`
        SELECT p.department_id AS department_id,
               d.name AS department_name,
               COUNT(DISTINCT si.sale_id)::int AS ticket_count,
               COALESCE(SUM(si.line_subtotal), 0) AS subtotal,
               COALESCE(SUM(si.line_tax), 0) AS tax_total,
               COALESCE(SUM(si.line_total), 0) AS total
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        JOIN departments d ON d.id = p.department_id
        WHERE ${conds()}
        GROUP BY p.department_id, d.name
        ORDER BY total DESC
      `,
      this.prisma.$queryRaw<
        Array<{
          product_id: string;
          product_code: string;
          product_name: string;
          ticket_count: number;
          quantity_sold: string;
          subtotal: string;
          tax_total: string;
          total: string;
        }>
      >`
        SELECT si.product_id AS product_id,
               p.code AS product_code,
               p.name AS product_name,
               COUNT(DISTINCT si.sale_id)::int AS ticket_count,
               COALESCE(SUM(si.quantity), 0) AS quantity_sold,
               COALESCE(SUM(si.line_subtotal), 0) AS subtotal,
               COALESCE(SUM(si.line_tax), 0) AS tax_total,
               COALESCE(SUM(si.line_total), 0) AS total
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE ${conds()}
        GROUP BY si.product_id, p.code, p.name
        ORDER BY total DESC
      `,
      this.prisma.$queryRaw<Array<{ product_id: string; qty: string }>>`
        SELECT product_id, COALESCE(SUM(quantity), 0) AS qty
        FROM branch_inventory
        WHERE ${filters.branchId ? Prisma.sql`branch_id = ${filters.branchId}` : Prisma.sql`TRUE`}
        GROUP BY product_id
      `,
    ]);

    const stockMap = new Map(stockRows.map((r) => [r.product_id, Number(r.qty)]));

    const byProduct: SalesByProductRow[] = productRows.map((p) => ({
      key: p.product_id,
      label: `${p.product_name} (${p.product_code})`,
      ticketCount: Number(p.ticket_count),
      quantitySold: Number(p.quantity_sold),
      currentStock: stockMap.get(p.product_id) ?? 0,
      subtotal: Number(p.subtotal),
      taxTotal: Number(p.tax_total),
      total: Number(p.total),
    }));

    const t = totalsRows[0];

    return {
      totals: {
        ticketCount: t ? Number(t.ticket_count) : 0,
        subtotal: t ? Number(t.subtotal) : 0,
        taxTotal: t ? Number(t.tax_total) : 0,
        total: t ? Number(t.total) : 0,
      },
      byCustomer: customerRows.map((c) => ({
        key: c.customer_key,
        label: c.customer_name,
        ticketCount: Number(c.ticket_count),
        subtotal: Number(c.subtotal),
        taxTotal: Number(c.tax_total),
        total: Number(c.total),
      })),
      byDepartment: departmentRows.map((d) => ({
        key: d.department_id,
        label: d.department_name,
        ticketCount: Number(d.ticket_count),
        subtotal: Number(d.subtotal),
        taxTotal: Number(d.tax_total),
        total: Number(d.total),
      })),
      byProduct,
    };
  }
}

import { Prisma, PrismaClient } from "@prisma/client";
import { SalesByProductRepository } from "../../application/ports/SalesByProductRepository";
import { SalesByProductFilters, SalesByProductPage } from "../../domain/value-objects/SalesByProductFilters";

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export class PrismaSalesByProductRepository implements SalesByProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getPage(filters: SalesByProductFilters, page: number, pageSize: number): Promise<SalesByProductPage> {
    const to = endOfDay(filters.to);
    const from = filters.from;

    // Condiciones SQL compartidas por los 3 queries raw (sale_items JOIN sales JOIN products).
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

    const offset = (page - 1) * pageSize;

    const [totalsRows, dataRows, countRows] = await Promise.all([
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
          department_id: string;
          department_name: string;
          product_id: string;
          product_code: string;
          product_name: string;
          customer_key: string;
          customer_name: string;
          quantity: string;
          total: string;
        }>
      >`
        SELECT p.department_id AS department_id, d.name AS department_name,
               si.product_id AS product_id, p.code AS product_code, p.name AS product_name,
               COALESCE(s.customer_id::text, 'sin-cliente') AS customer_key,
               COALESCE(c.name, 'Sin cliente') AS customer_name,
               COALESCE(SUM(si.quantity), 0) AS quantity,
               COALESCE(SUM(si.line_total), 0) AS total
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        JOIN departments d ON d.id = p.department_id
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE ${conds()}
        GROUP BY p.department_id, d.name, si.product_id, p.code, p.name,
                 COALESCE(s.customer_id::text, 'sin-cliente'), COALESCE(c.name, 'Sin cliente')
        ORDER BY total DESC, department_name ASC, product_name ASC, customer_name ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count FROM (
          SELECT 1 FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          JOIN products p ON p.id = si.product_id
          WHERE ${conds()}
          GROUP BY p.department_id, si.product_id, s.customer_id
        ) x
      `,
    ]);

    const t = totalsRows[0];

    return {
      totals: {
        ticketCount: t ? Number(t.ticket_count) : 0,
        subtotal: t ? Number(t.subtotal) : 0,
        taxTotal: t ? Number(t.tax_total) : 0,
        total: t ? Number(t.total) : 0,
      },
      rows: dataRows.map((r) => ({
        departmentId: r.department_id,
        departmentName: r.department_name,
        productId: r.product_id,
        productCode: r.product_code,
        productName: r.product_name,
        customerId: r.customer_key === "sin-cliente" ? null : r.customer_key,
        customerName: r.customer_name,
        quantity: Number(r.quantity),
        total: Number(r.total),
      })),
      rowsTotal: countRows[0] ? Number(countRows[0].count) : 0,
    };
  }
}

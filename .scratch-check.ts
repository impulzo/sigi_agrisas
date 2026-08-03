import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const tables = await prisma.$queryRawUnsafe<any[]>(
    `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`
  );
  console.log("TABLES:", tables.length);
  console.log(tables.map((t: any) => `${t.table_schema}.${t.table_name}`).join("\n"));

  const migTable = tables.find((t: any) => t.table_name === "_prisma_migrations");
  if (migTable) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT migration_name, finished_at, rolled_back_at FROM "${(migTable as any).table_schema}"."_prisma_migrations" ORDER BY finished_at`
    );
    console.log("MIGRATIONS RECORDED:", rows.length);
    console.log(rows.map((r: any) => `${r.migration_name} | finished=${r.finished_at} | rolledback=${r.rolled_back_at}`).join("\n"));
  } else {
    console.log("NO _prisma_migrations table found");
  }

  const userCount = await prisma.user.count();
  const saleCount = await prisma.sale.count();
  console.log("users:", userCount, "sales:", saleCount);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

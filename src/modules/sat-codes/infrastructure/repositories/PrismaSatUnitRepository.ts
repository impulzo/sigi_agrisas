import { PrismaClient } from "@prisma/client";
import { SatUnitRepository, SatUnit } from "../../application/ports/SatUnitRepository";

export class PrismaSatUnitRepository implements SatUnitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async search(query: string | undefined, limit: number): Promise<SatUnit[]> {
    const rows = await this.prisma.satUnitOfMeasure.findMany({
      where: query
        ? {
            OR: [
              { code: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { code: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ code: r.code, description: r.description }));
  }
}

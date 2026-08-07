import { PrismaClient } from "@prisma/client";
import { SatCfdiUseRepository } from "../../application/ports/SatCfdiUseRepository";
import { SatCode } from "../../application/ports/SatCodeRepository";

export class PrismaSatCfdiUseRepository implements SatCfdiUseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async search(query: string | undefined, limit: number): Promise<SatCode[]> {
    const rows = await this.prisma.satCfdiUse.findMany({
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

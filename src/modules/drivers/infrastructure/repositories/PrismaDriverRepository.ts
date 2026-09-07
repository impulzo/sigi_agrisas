import { PrismaClient, Driver as PrismaDriver, Prisma } from "@prisma/client";
import { DriverRepository, CreateDriverData, UpdateDriverData, FindAllOptions } from "../../application/ports/DriverRepository";
import { Driver } from "../../domain/entities/Driver";
import { DriverNotFoundError } from "../../domain/errors/DriverNotFoundError";
import { DriverCodeAlreadyInUseError } from "../../domain/errors/DriverCodeAlreadyInUseError";
import { isPrismaUniqueError, isPrismaNotFoundError } from "@/shared/infrastructure/prisma/errors";

function toDriver(row: PrismaDriver): Driver {
  return Driver.create({
    id: row.id,
    code: row.code,
    name: row.name,
    rfc: row.rfc,
    licenseNumber: row.licenseNumber,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class PrismaDriverRepository implements DriverRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Driver[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.DriverWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { rfc: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.driver.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.driver.count({ where }),
    ]);

    return { items: rows.map(toDriver), total };
  }

  async findById(id: string): Promise<Driver | null> {
    const row = await this.prisma.driver.findUnique({ where: { id } });
    return row ? toDriver(row) : null;
  }

  async create(data: CreateDriverData): Promise<Driver> {
    try {
      const row = await this.prisma.driver.create({ data });
      return toDriver(row);
    } catch (err) {
      if (isPrismaUniqueError(err, "code")) throw new DriverCodeAlreadyInUseError(data.code);
      throw err;
    }
  }

  async update(id: string, data: UpdateDriverData): Promise<Driver> {
    try {
      const row = await this.prisma.driver.update({ where: { id }, data });
      return toDriver(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new DriverNotFoundError(id);
      throw err;
    }
  }
}

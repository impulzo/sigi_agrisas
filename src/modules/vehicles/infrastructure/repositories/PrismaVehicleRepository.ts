import { PrismaClient, Vehicle as PrismaVehicle, Prisma } from "@prisma/client";
import { VehicleRepository, CreateVehicleData, UpdateVehicleData, FindAllOptions } from "../../application/ports/VehicleRepository";
import { Vehicle } from "../../domain/entities/Vehicle";
import { VehicleNotFoundError } from "../../domain/errors/VehicleNotFoundError";
import { VehicleCodeAlreadyInUseError } from "../../domain/errors/VehicleCodeAlreadyInUseError";
import { isPrismaUniqueError, isPrismaNotFoundError } from "@/shared/infrastructure/prisma/errors";

function toVehicle(row: PrismaVehicle): Vehicle {
  return Vehicle.create({
    id: row.id,
    code: row.code,
    plate: row.plate,
    vehicleConfig: row.vehicleConfig,
    permitType: row.permitType,
    permitNumber: row.permitNumber,
    insuranceCompany: row.insuranceCompany,
    insurancePolicy: row.insurancePolicy,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Vehicle[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.VehicleWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { plate: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.vehicle.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items: rows.map(toVehicle), total };
  }

  async findById(id: string): Promise<Vehicle | null> {
    const row = await this.prisma.vehicle.findUnique({ where: { id } });
    return row ? toVehicle(row) : null;
  }

  async create(data: CreateVehicleData): Promise<Vehicle> {
    try {
      const row = await this.prisma.vehicle.create({ data });
      return toVehicle(row);
    } catch (err) {
      if (isPrismaUniqueError(err, "code")) throw new VehicleCodeAlreadyInUseError(data.code);
      throw err;
    }
  }

  async update(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    try {
      const row = await this.prisma.vehicle.update({ where: { id }, data });
      return toVehicle(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new VehicleNotFoundError(id);
      throw err;
    }
  }
}

import { PrismaClient, Customer as PrismaCustomer, Prisma } from "@prisma/client";
import {
  CustomerRepository,
  CreateCustomerData,
  UpdateCustomerData,
  FindAllOptions,
} from "../../application/ports/CustomerRepository";
import { Customer } from "../../domain/entities/Customer";
import { CustomerNotFoundError } from "../../domain/errors/CustomerNotFoundError";
import { CustomerCodeAlreadyInUseError } from "../../domain/errors/CustomerCodeAlreadyInUseError";
import { CustomerRfcAlreadyInUseError } from "../../domain/errors/CustomerRfcAlreadyInUseError";

function toCustomer(row: PrismaCustomer): Customer {
  return Customer.create({
    id: row.id,
    code: row.code,
    name: row.name,
    rfc: row.rfc,
    legalName: row.legalName,
    taxRegime: row.taxRegime,
    cfdiUse: row.cfdiUse,
    taxZipCode: row.taxZipCode,
    email: row.email,
    phone: row.phone,
    address: row.address,
    contactName: row.contactName,
    notes: row.notes,
    creditLimit: row.creditLimit ? Number(row.creditLimit) : null,
    currentBalance: Number(row.currentBalance),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function isPrismaUniqueError(err: unknown, target?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e.code !== "P2002") return false;
  if (!target) return true;
  const t = e.meta?.target;
  if (Array.isArray(t)) return t.some((f) => f.includes(target));
  if (typeof t === "string") return t.includes(target);
  return false;
}

function isPrismaNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Customer[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { legalName: { contains: search, mode: "insensitive" } },
              { rfc: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: rows.map(toCustomer), total };
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findUnique({ where: { id } });
    return row ? toCustomer(row) : null;
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    try {
      const row = await this.prisma.customer.create({
        data: {
          code: data.code,
          name: data.name,
          rfc: data.rfc,
          legalName: data.legalName ?? null,
          taxRegime: data.taxRegime ?? null,
          cfdiUse: data.cfdiUse ?? null,
          taxZipCode: data.taxZipCode ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          contactName: data.contactName ?? null,
          notes: data.notes ?? null,
          creditLimit: data.creditLimit ?? null,
          isActive: data.isActive ?? true,
        },
      });
      return toCustomer(row);
    } catch (err) {
      if (isPrismaUniqueError(err, "code")) throw new CustomerCodeAlreadyInUseError(data.code);
      if (isPrismaUniqueError(err, "rfc")) throw new CustomerRfcAlreadyInUseError(data.rfc);
      throw err;
    }
  }

  async update(id: string, data: UpdateCustomerData): Promise<Customer> {
    try {
      const row = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.rfc !== undefined ? { rfc: data.rfc } : {}),
          ...(data.legalName !== undefined ? { legalName: data.legalName } : {}),
          ...(data.taxRegime !== undefined ? { taxRegime: data.taxRegime } : {}),
          ...(data.cfdiUse !== undefined ? { cfdiUse: data.cfdiUse } : {}),
          ...(data.taxZipCode !== undefined ? { taxZipCode: data.taxZipCode } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.contactName !== undefined ? { contactName: data.contactName } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.creditLimit !== undefined ? { creditLimit: data.creditLimit } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
      return toCustomer(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new CustomerNotFoundError(id);
      if (isPrismaUniqueError(err, "rfc")) throw new CustomerRfcAlreadyInUseError(data.rfc ?? "");
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.customer.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new CustomerNotFoundError(id);
      throw err;
    }
  }
}

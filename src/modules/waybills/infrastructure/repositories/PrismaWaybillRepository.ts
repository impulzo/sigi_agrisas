import { PrismaClient, Prisma } from "@prisma/client";
import {
  WaybillRepository,
  ListWaybillsOptions,
  ListWaybillsResult,
  CreateWaybillData,
  StampCallback,
  CancelStampCallback,
} from "../../application/ports/WaybillRepository";
import { Waybill, WaybillAddressSnapshot, WaybillStatus, WaybillType } from "../../domain/entities/Waybill";
import { WaybillItem } from "../../domain/entities/WaybillItem";
import { InsufficientStockAtOriginError } from "../../domain/errors";
import { allocateFolio } from "@/shared/infrastructure/folios/allocateFolio";

type TxClient = Prisma.TransactionClient;

type WaybillRow = Prisma.WaybillGetPayload<{
  include: { items: true; destinationCustomer: { select: { name: true; code: true } } };
}>;

function toNumber(v: Prisma.Decimal | number): number;
function toNumber(v: Prisma.Decimal | number | null): number | null;
function toNumber(v: Prisma.Decimal | number | null): number | null {
  if (v === null) return null;
  return typeof v === "number" ? v : v.toNumber();
}

function toOriginAddress(row: WaybillRow): WaybillAddressSnapshot | null {
  if (row.originAddressStreet === null) return null;
  return {
    street: row.originAddressStreet,
    exteriorNumber: row.originAddressExteriorNumber!,
    interiorNumber: row.originAddressInteriorNumber,
    neighborhood: row.originAddressNeighborhood!,
    municipality: row.originAddressMunicipality!,
    state: row.originAddressState!,
    country: row.originAddressCountry!,
    zipCode: row.originAddressZipCode!,
  };
}

function toDestinationAddress(row: WaybillRow): WaybillAddressSnapshot | null {
  if (row.destinationAddressStreet === null) return null;
  return {
    street: row.destinationAddressStreet,
    exteriorNumber: row.destinationAddressExteriorNumber!,
    interiorNumber: row.destinationAddressInteriorNumber,
    neighborhood: row.destinationAddressNeighborhood!,
    municipality: row.destinationAddressMunicipality!,
    state: row.destinationAddressState!,
    country: row.destinationAddressCountry!,
    zipCode: row.destinationAddressZipCode!,
  };
}

function mapItem(row: WaybillRow["items"][number]): WaybillItem {
  return WaybillItem.create({
    id: row.id,
    waybillId: row.waybillId,
    productId: row.productId,
    productCodeSnapshot: row.productCodeSnapshot,
    productNameSnapshot: row.productNameSnapshot,
    satBienesTranspCode: row.satBienesTranspCode,
    satUnitCode: row.satUnitCode,
    quantity: toNumber(row.quantity),
    weightKg: toNumber(row.weightKg),
    isHazardousMaterial: row.isHazardousMaterial,
    hazardousMaterialCode: row.hazardousMaterialCode,
  });
}

function mapWaybill(row: WaybillRow): Waybill {
  return Waybill.create({
    id: row.id,
    folioId: row.folioId,
    folioNumber: row.folioNumber,
    folioCode: row.folioCode,
    originBranchId: row.originBranchId,
    destinationBranchId: row.destinationBranchId,
    destinationCustomerId: row.destinationCustomerId,
    destinationCustomerName: row.destinationCustomer?.name ?? null,
    destinationCustomerCode: row.destinationCustomer?.code ?? null,
    saleId: row.saleId,
    type: row.type as WaybillType,
    status: row.status as WaybillStatus,
    notes: row.notes,
    originAddress: toOriginAddress(row),
    destinationAddress: toDestinationAddress(row),
    vehiclePlate: row.vehiclePlate,
    vehicleConfig: row.vehicleConfig,
    vehiclePermitType: row.vehiclePermitType,
    vehiclePermitNumber: row.vehiclePermitNumber,
    insuranceCompany: row.insuranceCompany,
    insurancePolicy: row.insurancePolicy,
    driverName: row.driverName,
    driverRfc: row.driverRfc,
    driverLicenseNumber: row.driverLicenseNumber,
    distanceKm: toNumber(row.distanceKm),
    departureAt: row.departureAt,
    arrivalAt: row.arrivalAt,
    cfdiUuid: row.cfdiUuid,
    facturamaCfdiId: row.facturamaCfdiId,
    xmlUrl: row.xmlUrl,
    pdfUrl: row.pdfUrl,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
    creatorId: row.creatorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map(mapItem),
  });
}

/** Strict at origin: rejects if it would go negative. Throws InsufficientStockAtOriginError. */
async function decrementOriginStrict(
  tx: TxClient,
  branchId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  for (const item of items) {
    const affected = await tx.$executeRaw`
      UPDATE branch_inventory
      SET quantity = quantity - ${item.quantity}::numeric, updated_at = NOW()
      WHERE branch_id = ${branchId} AND product_id = ${item.productId} AND quantity - ${item.quantity}::numeric >= 0
    `;
    if (affected === 0) {
      throw new InsufficientStockAtOriginError(item.productId);
    }
  }
}

/** Tolerant: creates the row if absent, always succeeds. */
async function incrementTolerant(
  tx: TxClient,
  branchId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  for (const item of items) {
    const updated = await tx.$executeRaw`
      UPDATE branch_inventory
      SET quantity = quantity + ${item.quantity}::numeric, updated_at = NOW()
      WHERE branch_id = ${branchId} AND product_id = ${item.productId}
    `;
    if (updated === 0) {
      await tx.branchInventory.create({
        data: {
          branchId,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          reservedQuantity: new Prisma.Decimal(0),
          reorderPoint: new Prisma.Decimal(0),
        },
      });
    }
  }
}

/** Tolerant: MAY leave the row negative, creates it if absent. */
async function decrementTolerant(
  tx: TxClient,
  branchId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  for (const item of items) {
    const updated = await tx.$executeRaw`
      UPDATE branch_inventory
      SET quantity = quantity - ${item.quantity}::numeric, updated_at = NOW()
      WHERE branch_id = ${branchId} AND product_id = ${item.productId}
    `;
    if (updated === 0) {
      await tx.branchInventory.create({
        data: {
          branchId,
          productId: item.productId,
          quantity: new Prisma.Decimal(-item.quantity),
          reservedQuantity: new Prisma.Decimal(0),
          reorderPoint: new Prisma.Decimal(0),
        },
      });
    }
  }
}

/** Tolerant: always succeeds, creates the row if absent. */
async function incrementOriginTolerant(
  tx: TxClient,
  branchId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  return incrementTolerant(tx, branchId, items);
}

export class PrismaWaybillRepository implements WaybillRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(options: ListWaybillsOptions): Promise<ListWaybillsResult> {
    const skip = (options.page - 1) * options.pageSize;

    const where: Prisma.WaybillWhereInput = {
      ...(options.branchId
        ? { OR: [{ originBranchId: options.branchId }, { destinationBranchId: options.branchId }] }
        : {}),
      ...(options.statuses && options.statuses.length > 0 ? { status: { in: options.statuses } } : {}),
      ...(options.types && options.types.length > 0 ? { type: { in: options.types } } : {}),
      ...(options.from || options.to
        ? {
            createdAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.waybill.findMany({
        where,
        skip,
        take: options.pageSize,
        orderBy: { createdAt: "desc" },
        include: { destinationCustomer: { select: { name: true, code: true } } },
      }),
      this.prisma.waybill.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        folioCode: row.folioCode,
        originBranchId: row.originBranchId,
        destinationBranchId: row.destinationBranchId,
        destinationCustomerId: row.destinationCustomerId,
        destinationCustomerName: row.destinationCustomer?.name ?? null,
        destinationCustomerCode: row.destinationCustomer?.code ?? null,
        saleId: row.saleId,
        type: row.type as WaybillType,
        status: row.status as WaybillStatus,
        departureAt: row.departureAt,
        arrivalAt: row.arrivalAt,
        createdAt: row.createdAt,
      })),
      total,
    };
  }

  async findById(id: string): Promise<Waybill | null> {
    const row = await this.prisma.waybill.findUnique({
      where: { id },
      include: { items: true, destinationCustomer: { select: { name: true, code: true } } },
    });
    return row ? mapWaybill(row) : null;
  }

  async createCompleted(data: CreateWaybillData, stamp: StampCallback | null): Promise<Waybill> {
    const itemsWithProduct = data.items.filter(
      (item): item is typeof item & { productId: string } => item.productId !== null
    );

    const row = await this.prisma.$transaction(async (tx) => {
      const { folioNumber, folioCode } = await allocateFolio(tx, data.folioId);

      // type='simple': moves branch_inventory (strict at origin, tolerant at destination).
      // type='carta_porte': no inventory movement — the linked sale already decremented
      // origin stock when it completed; the destination is a customer, not a branch.
      if (data.type === "simple") {
        await decrementOriginStrict(
          tx,
          data.originBranchId,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity }))
        );
        await incrementTolerant(
          tx,
          data.destinationBranchId!,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity }))
        );
      }

      const stampResult = stamp ? await stamp() : null;

      return tx.waybill.create({
        data: {
          id: data.id,
          folioId: data.folioId,
          folioNumber,
          folioCode,
          originBranchId: data.originBranchId,
          destinationBranchId: data.destinationBranchId,
          type: data.type,
          status: "completed",
          notes: data.notes,
          ...(data.type === "carta_porte"
            ? {
                destinationCustomerId: data.destinationCustomerId,
                saleId: data.saleId,
                originAddressStreet: data.originAddress.street,
                originAddressExteriorNumber: data.originAddress.exteriorNumber,
                originAddressInteriorNumber: data.originAddress.interiorNumber,
                originAddressNeighborhood: data.originAddress.neighborhood,
                originAddressMunicipality: data.originAddress.municipality,
                originAddressState: data.originAddress.state,
                originAddressCountry: data.originAddress.country,
                originAddressZipCode: data.originAddress.zipCode,
                destinationAddressStreet: data.destinationAddress.street,
                destinationAddressExteriorNumber: data.destinationAddress.exteriorNumber,
                destinationAddressInteriorNumber: data.destinationAddress.interiorNumber,
                destinationAddressNeighborhood: data.destinationAddress.neighborhood,
                destinationAddressMunicipality: data.destinationAddress.municipality,
                destinationAddressState: data.destinationAddress.state,
                destinationAddressCountry: data.destinationAddress.country,
                destinationAddressZipCode: data.destinationAddress.zipCode,
                vehiclePlate: data.vehiclePlate,
                vehicleConfig: data.vehicleConfig,
                vehiclePermitType: data.vehiclePermitType,
                vehiclePermitNumber: data.vehiclePermitNumber,
                insuranceCompany: data.insuranceCompany,
                insurancePolicy: data.insurancePolicy,
                driverName: data.driverName,
                driverRfc: data.driverRfc,
                driverLicenseNumber: data.driverLicenseNumber,
                distanceKm: data.distanceKm,
                arrivalAt: data.arrivalAt,
              }
            : {}),
          departureAt: data.departureAt,
          cfdiUuid: stampResult?.uuid ?? null,
          facturamaCfdiId: stampResult?.cfdiId ?? null,
          xmlUrl: stampResult?.xmlUrl ?? null,
          pdfUrl: stampResult?.pdfUrl ?? null,
          creatorId: data.creatorId,
          items: {
            create: data.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              productCodeSnapshot: item.productCodeSnapshot,
              productNameSnapshot: item.productNameSnapshot,
              satBienesTranspCode: item.satBienesTranspCode,
              satUnitCode: item.satUnitCode,
              quantity: item.quantity,
              weightKg: item.weightKg,
              isHazardousMaterial: item.isHazardousMaterial,
              hazardousMaterialCode: item.hazardousMaterialCode,
            })),
          },
        },
        include: { items: true, destinationCustomer: { select: { name: true, code: true } } },
      });
    });

    return mapWaybill(row);
  }

  async markCancelled(
    id: string,
    cancelledBy: string,
    cancellationReason: string,
    cancelStamp: CancelStampCallback
  ): Promise<Waybill> {
    const existing = await this.prisma.waybill.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    const itemsWithProduct = existing.items.filter((i) => i.productId !== null) as Array<
      typeof existing.items[number] & { productId: string }
    >;

    const row = await this.prisma.$transaction(async (tx) => {
      // type='simple': reverses the inventory movement. type='carta_porte': nothing to
      // reverse — creation never moved inventory (see createCompleted).
      if (existing.type === "simple") {
        await incrementOriginTolerant(
          tx,
          existing.originBranchId,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: toNumber(i.quantity) }))
        );
        await decrementTolerant(
          tx,
          existing.destinationBranchId!,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: toNumber(i.quantity) }))
        );
      }

      if (cancelStamp) {
        await cancelStamp();
      }

      return tx.waybill.update({
        where: { id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy,
          cancellationReason,
        },
        include: { items: true, destinationCustomer: { select: { name: true, code: true } } },
      });
    });

    return mapWaybill(row);
  }
}

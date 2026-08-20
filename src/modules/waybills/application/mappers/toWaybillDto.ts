import { Waybill } from "../../domain/entities/Waybill";
import { WaybillSummary } from "../ports/WaybillRepository";
import { WaybillDto, WaybillSummaryDto, WaybillAddressDto } from "../dto/WaybillDto";

function toAddressDto(a: NonNullable<Waybill["originAddress"]>): WaybillAddressDto {
  return {
    street: a.street,
    exteriorNumber: a.exteriorNumber,
    interiorNumber: a.interiorNumber,
    neighborhood: a.neighborhood,
    municipality: a.municipality,
    state: a.state,
    country: a.country,
    zipCode: a.zipCode,
  };
}

export function toWaybillDto(waybill: Waybill): WaybillDto {
  return {
    id: waybill.id,
    folioCode: waybill.folioCode,
    originBranchId: waybill.originBranchId,
    destinationBranchId: waybill.destinationBranchId,
    destinationCustomerId: waybill.destinationCustomerId,
    destinationCustomerName: waybill.destinationCustomerName ?? undefined,
    destinationCustomerCode: waybill.destinationCustomerCode ?? undefined,
    saleId: waybill.saleId,
    type: waybill.type,
    status: waybill.status,
    notes: waybill.notes,
    originAddress: waybill.originAddress ? toAddressDto(waybill.originAddress) : null,
    destinationAddress: waybill.destinationAddress ? toAddressDto(waybill.destinationAddress) : null,
    vehicleId: waybill.vehicleId,
    driverId: waybill.driverId,
    vehiclePlate: waybill.vehiclePlate,
    vehicleConfig: waybill.vehicleConfig,
    vehiclePermitType: waybill.vehiclePermitType,
    vehiclePermitNumber: waybill.vehiclePermitNumber,
    insuranceCompany: waybill.insuranceCompany,
    insurancePolicy: waybill.insurancePolicy,
    driverName: waybill.driverName,
    driverRfc: waybill.driverRfc,
    driverLicenseNumber: waybill.driverLicenseNumber,
    distanceKm: waybill.distanceKm,
    departureAt: waybill.departureAt.toISOString(),
    arrivalAt: waybill.arrivalAt?.toISOString() ?? null,
    cfdiUuid: waybill.cfdiUuid,
    facturamaCfdiId: waybill.facturamaCfdiId,
    xmlUrl: waybill.xmlUrl,
    pdfUrl: waybill.pdfUrl,
    cancelledAt: waybill.cancelledAt?.toISOString() ?? null,
    cancelledBy: waybill.cancelledBy,
    cancellationReason: waybill.cancellationReason,
    creatorId: waybill.creatorId,
    createdAt: waybill.createdAt.toISOString(),
    updatedAt: waybill.updatedAt.toISOString(),
    items: waybill.items.map((item) => ({
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
  };
}

export function toWaybillSummaryDto(summary: WaybillSummary): WaybillSummaryDto {
  return {
    id: summary.id,
    folioCode: summary.folioCode,
    originBranchId: summary.originBranchId,
    destinationBranchId: summary.destinationBranchId,
    destinationCustomerId: summary.destinationCustomerId,
    destinationCustomerName: summary.destinationCustomerName ?? undefined,
    destinationCustomerCode: summary.destinationCustomerCode ?? undefined,
    saleId: summary.saleId,
    type: summary.type,
    status: summary.status,
    departureAt: summary.departureAt.toISOString(),
    arrivalAt: summary.arrivalAt?.toISOString() ?? null,
    createdAt: summary.createdAt.toISOString(),
  };
}

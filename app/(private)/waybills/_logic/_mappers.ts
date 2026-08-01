import type { WaybillDto, WaybillSummaryDto } from "./types/api";
import type { WaybillDetail, WaybillSummary } from "./types/domain";

function mapWaybillBase(dto: WaybillDto) {
  return {
    ...dto,
    departureAt: new Date(dto.departureAt),
    arrivalAt: dto.arrivalAt ? new Date(dto.arrivalAt) : null,
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function mapWaybillDetailDto(dto: WaybillDto): WaybillDetail {
  return {
    ...mapWaybillBase(dto),
    items: dto.items ?? [],
  };
}

export function mapWaybillSummaryDto(dto: WaybillSummaryDto): WaybillSummary {
  return {
    id: dto.id,
    folioCode: dto.folioCode,
    originBranchId: dto.originBranchId,
    destinationBranchId: dto.destinationBranchId,
    type: dto.type,
    status: dto.status,
    departureAt: new Date(dto.departureAt),
    arrivalAt: dto.arrivalAt ? new Date(dto.arrivalAt) : null,
    createdAt: new Date(dto.createdAt),
  };
}

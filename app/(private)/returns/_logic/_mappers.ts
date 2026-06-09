import type { ReturnDto, ReturnDetailDto } from "./types/api";
import type { Return, ReturnDetail } from "./types/domain";

function mapReturnDto(dto: ReturnDto): Return {
  return {
    ...dto,
    returnedAt: new Date(dto.returnedAt),
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

function mapReturnDetailDto(dto: ReturnDetailDto): ReturnDetail {
  return {
    ...mapReturnDto(dto),
    items: dto.items,
  };
}

export { mapReturnDto, mapReturnDetailDto };

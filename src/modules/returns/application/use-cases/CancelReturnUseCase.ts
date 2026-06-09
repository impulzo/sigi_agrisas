import { ReturnRepository } from "../ports/ReturnRepository";
import { CancelReturnRequest, ReturnDetailDto } from "../dto/ReturnDto";
import { toReturnDetailDto } from "../mappers/toReturnDto";
import { ReturnNotFoundError } from "../../domain/errors/ReturnNotFoundError";
import { ReturnAlreadyCancelledError } from "../../domain/errors/ReturnAlreadyCancelledError";

export class CancelReturnUseCase {
  constructor(private readonly returnRepo: ReturnRepository) {}

  async execute(req: CancelReturnRequest): Promise<ReturnDetailDto> {
    const result = await this.returnRepo.findByIdWithItems(req.id);
    if (!result) {
      throw new ReturnNotFoundError();
    }

    const { return: ret, items, joined } = result;

    if (!ret.canBeCancelled()) {
      throw new ReturnAlreadyCancelledError();
    }

    const itemsToUndo = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const cancelled = await this.returnRepo.markCancelled(
      req.id,
      req.cancelledBy,
      req.cancellationReason,
      itemsToUndo
    );

    return toReturnDetailDto(cancelled, items, joined);
  }
}

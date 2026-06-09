import { ReturnRepository } from "../ports/ReturnRepository";
import { ReturnDetailDto } from "../dto/ReturnDto";
import { toReturnDetailDto } from "../mappers/toReturnDto";
import { ReturnNotFoundError } from "../../domain/errors/ReturnNotFoundError";

export class GetReturnUseCase {
  constructor(private readonly returnRepo: ReturnRepository) {}

  async execute(id: string): Promise<ReturnDetailDto> {
    const result = await this.returnRepo.findByIdWithItems(id);
    if (!result) {
      throw new ReturnNotFoundError();
    }
    return toReturnDetailDto(result.return, result.items, result.joined);
  }
}

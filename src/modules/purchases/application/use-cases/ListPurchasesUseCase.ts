import { PurchaseRepository } from "../ports/PurchaseRepository";
import { ListPurchasesRequest, ListPurchasesResponse, PurchaseDto } from "../dto/PurchaseDto";
import { toPurchaseDto } from "../mappers/toPurchaseDto";

export class ListPurchasesUseCase {
  constructor(private readonly purchaseRepo: PurchaseRepository) {}

  async execute(req: ListPurchasesRequest): Promise<ListPurchasesResponse> {
    const { items, total } = await this.purchaseRepo.findAll({
      page: req.page,
      pageSize: req.pageSize,
      branchId: req.branchId,
      providerId: req.providerId,
      statuses: req.statuses,
      from: req.from,
      to: req.to,
    });

    const dtos: PurchaseDto[] = items.map(({ purchase, joined }) => toPurchaseDto(purchase, joined));

    return { items: dtos, total, page: req.page, pageSize: req.pageSize };
  }
}

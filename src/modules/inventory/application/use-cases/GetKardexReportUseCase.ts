import { ProductRepository } from "@/modules/products/application/ports/ProductRepository";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";
import { InventoryMovementRepository } from "../ports/InventoryMovementRepository";
import { KardexReportRequest } from "../dto/KardexReportRequest";
import { KardexReportResponseDto } from "../dto/KardexReportResponseDto";
import { InvalidKardexRangeError } from "../../domain/errors/InvalidKardexRangeError";
import { KardexAssembler } from "../../domain/services/KardexAssembler";

export class GetKardexReportUseCase {
  constructor(
    private readonly movementRepo: InventoryMovementRepository,
    private readonly productRepo: ProductRepository
  ) {}

  async execute(req: KardexReportRequest): Promise<KardexReportResponseDto> {
    if (req.from > req.to) throw new InvalidKardexRangeError();

    const productView = await this.productRepo.findById(req.productId);
    if (!productView) throw new ProductNotFoundError(req.productId);

    const branchId = req.branchId ?? null;

    const [movements, branchBalances] = await Promise.all([
      this.movementRepo.findMovementsInRange(req.productId, branchId, req.from, req.to),
      this.movementRepo.getBranchBalances(req.productId, branchId, req.from, req.to),
    ]);

    const { header, movements: rows } = KardexAssembler.assemble({ branchId, movements, branchBalances });

    return {
      product: {
        id: productView.product.id,
        code: productView.product.code,
        name: productView.product.name,
        unit: productView.product.unit,
      },
      header,
      movements: rows.map((m) => ({
        movementAt: m.movementAt.toISOString(),
        branchId: m.branchId,
        movementType: m.movementType,
        entrada: m.entrada,
        salida: m.salida,
        saldo: m.saldo,
        unit: m.unit,
        factor: m.factor,
        serie: m.serie,
        unitCost: m.unitCost,
        unitPrice: m.unitPrice,
        folioCode: m.folioCode,
        folioNumber: m.folioNumber,
        originFolioCode: m.originFolioCode,
        originFolioNumber: m.originFolioNumber,
        customerId: m.customerId,
        providerId: m.providerId,
        status: m.status,
        notes: m.notes,
      })),
    };
  }
}

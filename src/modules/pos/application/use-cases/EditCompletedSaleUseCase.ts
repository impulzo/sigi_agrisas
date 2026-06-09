import { SaleRepository, SnapshotItemInput } from "../ports/SaleRepository";
import { PosLookupService } from "../ports/PosLookups";
import { EditCompletedSaleRequest } from "../dto/EditCompletedSaleRequest";
import { SaleDetailDto } from "../dto/SaleDto";
import { toSaleDetailDto } from "../mappers/toSaleDto";
import { SaleTotalsCalculator, SaleLineInput } from "../../domain/services/SaleTotalsCalculator";
import { SaleNotFoundError } from "../../domain/errors/SaleNotFoundError";
import { EmptySaleError } from "../../domain/errors/EmptySaleError";
import { ProductPriceMismatchError } from "../../domain/errors/ProductPriceMismatchError";
import { CancelledSaleNotEditableError } from "../../domain/errors/CancelledSaleNotEditableError";
import { InactiveResourceError } from "../../domain/errors/InactiveResourceError";

export interface EditCompletedSaleResult {
  dto: SaleDetailDto;
  branchId: string;
}

export class EditCompletedSaleUseCase {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly lookups: PosLookupService
  ) {}

  async execute(id: string, req: EditCompletedSaleRequest): Promise<EditCompletedSaleResult> {
    const existing = await this.saleRepo.findByIdWithItems(id);
    if (!existing) throw new SaleNotFoundError(id);
    if (existing.sale.status === "cancelled") throw new CancelledSaleNotEditableError();
    if (!req.items || req.items.length === 0) throw new EmptySaleError();

    // Validate optional reassignments
    if (req.customerId) {
      const customer = await this.lookups.getCustomer(req.customerId);
      if (!customer || !customer.isActive) throw new InactiveResourceError("Customer");
    }
    if (req.paymentMethodId) {
      const pm = await this.lookups.getPaymentMethod(req.paymentMethodId);
      if (!pm || !pm.isActive) throw new InactiveResourceError("Payment method");
    }

    // Resolve items + snapshots
    const calcLines: SaleLineInput[] = [];
    const snapshotInputs: Array<Omit<SnapshotItemInput, "lineSubtotal" | "lineTax" | "lineTotal">> = [];

    for (const item of req.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error("quantity must be > 0");
      }
      const [product, price] = await Promise.all([
        this.lookups.getProduct(item.productId),
        this.lookups.getProductPrice(item.productPriceId),
      ]);
      if (!product) throw new InactiveResourceError("Product not found");
      if (!product.isActive) throw new InactiveResourceError("Product");
      if (!price) throw new InactiveResourceError("Product price not found");
      if (price.productId !== item.productId) throw new ProductPriceMismatchError();

      calcLines.push({
        quantity: item.quantity,
        unitPrice: price.price,
        discountPct: price.discountPct,
        ivaRate: product.ivaRate,
        iepsRate: product.iepsRate,
      });

      snapshotInputs.push({
        productId: product.id,
        productPriceId: price.id,
        productCodeSnapshot: product.code,
        productNameSnapshot: product.name,
        priceNameSnapshot: price.name,
        quantity: item.quantity,
        unitPrice: price.price,
        discountPct: price.discountPct,
        ivaRate: product.ivaRate,
        iepsRate: product.iepsRate,
      });
    }

    const totals = SaleTotalsCalculator.computeTotals(calcLines);

    const items: SnapshotItemInput[] = snapshotInputs.map((si, idx) => ({
      ...si,
      lineSubtotal: totals.lines[idx].lineSubtotal,
      lineTax: totals.lines[idx].lineTax,
      lineTotal: totals.lines[idx].lineTotal,
    }));

    const summary = await this.saleRepo.replaceItemsAndRecalculate(id, {
      customerId: req.customerId,
      paymentMethodId: req.paymentMethodId,
      notes: req.notes,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      items,
    });

    return {
      dto: toSaleDetailDto(summary.sale, summary.joined),
      branchId: summary.sale.branchId,
    };
  }
}

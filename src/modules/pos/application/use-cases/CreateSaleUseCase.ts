import { SaleRepository, SnapshotItemInput } from "../ports/SaleRepository";
import { PosLookupService } from "../ports/PosLookups";
import { QuoteRepository } from "@/modules/quotes/application/ports/QuoteRepository";
import { CreateSaleRequest } from "../dto/CreateSaleRequest";
import { SaleDetailDto } from "../dto/SaleDto";
import { toSaleDetailDto } from "../mappers/toSaleDto";
import { SaleTotalsCalculator, SaleLineInput } from "../../domain/services/SaleTotalsCalculator";
import { EmptySaleError } from "../../domain/errors/EmptySaleError";
import { ProductPriceMismatchError } from "../../domain/errors/ProductPriceMismatchError";
import { InactiveResourceError } from "../../domain/errors/InactiveResourceError";
import { QuoteLinkInvalidError } from "../../domain/errors/QuoteLinkInvalidError";
import { CustomerHasNoCreditLineError } from "@/modules/payments/domain/errors/CustomerHasNoCreditLineError";
import { CreditLimitExceededError } from "@/modules/payments/domain/errors/CreditLimitExceededError";
import { FolioScopeMismatchError } from "@/shared/domain/errors/FolioScopeMismatchError";

export interface CreateSaleResult {
  dto: SaleDetailDto;
  branchId: string;
}

export class CreateSaleUseCase {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly lookups: PosLookupService,
    /**
     * Optional. When present, `req.quoteId` is validated against this repository
     * before persisting the sale and the corresponding quote is marked converted
     * inside the same transaction (createCompletedFromQuote path).
     */
    private readonly quoteRepo?: QuoteRepository
  ) {}

  async execute(req: CreateSaleRequest, cashierId: string): Promise<CreateSaleResult> {
    if (!req.items || req.items.length === 0) throw new EmptySaleError();

    // 1. Validate header resources
    const [customer, branch, folio, payment] = await Promise.all([
      req.customerId ? this.lookups.getCustomer(req.customerId) : Promise.resolve(null),
      this.lookups.getBranch(req.branchId),
      this.lookups.getFolio(req.folioId),
      this.lookups.getPaymentMethod(req.paymentMethodId),
    ]);

    if (req.customerId && !customer) throw new InactiveResourceError("Customer not found");
    if (customer && !customer.isActive) throw new InactiveResourceError("Customer");
    if (!branch) throw new InactiveResourceError("Branch not found");
    if (!branch.isActive) throw new InactiveResourceError("Branch");
    if (!folio) throw new InactiveResourceError("Folio not found");
    if (folio.scope !== "POS") throw new FolioScopeMismatchError("POS", folio.scope);
    if (!folio.isActive) throw new InactiveResourceError("Folio");
    if (!payment) throw new InactiveResourceError("Payment method not found");
    if (!payment.isActive) throw new InactiveResourceError("Payment method");

    // Credit pre-check: validate credit line exists before processing items
    let creditAvailable: number | null = null;
    if (payment.isCredit) {
      if (!customer) throw new InactiveResourceError("Customer required for credit sales");
      if (customer.creditLimit === null) throw new CustomerHasNoCreditLineError();
      creditAvailable = customer.creditLimit - customer.currentBalance;
    }

    // 1b. Validate quoteId when provided
    let validatedQuoteId: string | null = null;
    if (req.quoteId) {
      if (!this.quoteRepo) {
        throw new Error("quoteId provided but QuoteRepository not injected");
      }
      const quoteSummary = await this.quoteRepo.findByIdWithItems(req.quoteId);
      if (!quoteSummary) throw new QuoteLinkInvalidError("Quote not found", "not_found");
      const q = quoteSummary.quote;
      if (q.status !== "authorized" || q.convertedSaleId !== null) {
        throw new QuoteLinkInvalidError(
          `Quote cannot be linked to a new sale (status=${q.status})`,
          "wrong_status"
        );
      }
      if (q.branchId !== req.branchId) {
        throw new QuoteLinkInvalidError(
          "Quote branchId does not match sale branchId",
          "branch_mismatch"
        );
      }
      if (q.customerId !== req.customerId) {
        throw new QuoteLinkInvalidError(
          "Quote customerId does not match sale customerId",
          "customer_mismatch"
        );
      }
      validatedQuoteId = req.quoteId;
    }

    // 2. Resolve each item: validate FK consistency + collect snapshots
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
        isTaxable: product.isTaxable,
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
        ivaRate: product.isTaxable ? product.ivaRate : 0,
        iepsRate: product.isTaxable ? product.iepsRate : 0,
      });
    }

    // 3. Compute totals via pure domain service
    const totals = SaleTotalsCalculator.computeTotals(calcLines);

    // 3b. Validate credit limit now that we have the final total
    let paidAmount = totals.total;
    let paymentStatus = "paid";
    if (payment.isCredit) {
      if (creditAvailable! < totals.total) {
        throw new CreditLimitExceededError(creditAvailable!);
      }
      paidAmount = 0;
      paymentStatus = "pending";
    }

    // 4. Compose snapshot items with computed line totals
    const items: SnapshotItemInput[] = snapshotInputs.map((si, idx) => ({
      ...si,
      lineSubtotal: totals.lines[idx].lineSubtotal,
      lineTax: totals.lines[idx].lineTax,
      lineTotal: totals.lines[idx].lineTotal,
    }));

    // 5. Delegate atomic emission to the repository. When quoteId is set,
    //    use createCompletedFromQuote so the quote is marked converted in the same tx.
    const summary = validatedQuoteId
      ? await this.saleRepo.createCompletedFromQuote({
          quoteId: validatedQuoteId,
          branchId: req.branchId,
          customerId: req.customerId ?? null,
          cashierId,
          paymentMethodId: req.paymentMethodId,
          folioId: req.folioId,
          notes: req.notes ?? null,
          paidAmount,
          paymentStatus,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          items,
        })
      : await this.saleRepo.createCompleted({
          branchId: req.branchId,
          customerId: req.customerId ?? null,
          cashierId,
          paymentMethodId: req.paymentMethodId,
          folioId: req.folioId,
          notes: req.notes ?? null,
          paidAmount,
          paymentStatus,
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

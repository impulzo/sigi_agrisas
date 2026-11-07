import { randomUUID } from "crypto";
import {
  PaymentRepository,
  CreatePaymentInput,
  CreateAccountPaymentInput,
  AccountDebtSummary,
  ListPaymentsFilters,
  ListPaymentsPagination,
  PaymentWithSale,
  PaymentListRow,
  SaleTotals,
  LineBalance,
  HistoryFilters,
  HistoryResult,
  PaymentHistoryItem,
} from "../../application/ports/PaymentRepository";
import { CustomerPayment } from "../../domain/entities/CustomerPayment";
import { PaymentStatus } from "../../domain/value-objects/PaymentStatus";
import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";
import { PaymentNotFoundError } from "../../domain/errors/PaymentNotFoundError";
import { PaymentAlreadyCancelledError } from "../../domain/errors/PaymentAlreadyCancelledError";
import { PaymentExceedsDueAmountError } from "../../domain/errors/PaymentExceedsDueAmountError";
import { PaymentExceedsLineDueAmountError } from "../../domain/errors/PaymentExceedsLineDueAmountError";
import { PaymentExceedsAccountDebtError } from "../../domain/errors/PaymentExceedsAccountDebtError";
import { PaymentItemsAmountMismatchError } from "../../domain/errors/PaymentItemsAmountMismatchError";
import { SaleItemNotFoundError } from "../../domain/errors/SaleItemNotFoundError";
import { SaleNotPayableError } from "../../domain/errors/SaleNotPayableError";
import { BranchScopeViolationError } from "../../domain/errors/BranchScopeViolationError";
import { FolioScopeMismatchError } from "@/shared/domain/errors/FolioScopeMismatchError";
import { FolioScope } from "@/shared/domain/types/FolioScope";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";
import { SaleNotFoundError } from "@/modules/pos/domain/errors/SaleNotFoundError";
import { CustomerNotFoundError } from "@/modules/customers/domain/errors/CustomerNotFoundError";

const AMOUNT_TOLERANCE = 0.0001;

interface SaleMock {
  id: string;
  folioCode: string;
  folioNumber: number;
  branchId: string;
  customerId: string;
  total: number;
  paidAmount: number;
  paymentStatus: SalePaymentStatus;
  isCredit: boolean;
  status: string;
  createdAt?: Date;
}

interface SaleItemMock {
  id: string;
  saleId: string;
  lineTotal: number;
  productNameSnapshot: string;
}

interface CustomerMock {
  id: string;
  currentBalance: number;
  creditLimit: number | null;
}

interface FolioMock {
  id: string;
  scope: FolioScope;
  isActive: boolean;
}

interface PaymentMethodMock {
  id: string;
  code: string;
  isActive: boolean;
}

interface PaymentItemMock {
  customerPaymentId: string;
  saleItemId: string;
  amount: number;
}

export class InMemoryPaymentRepository implements PaymentRepository {
  private payments = new Map<string, CustomerPayment>();
  private sales = new Map<string, SaleMock>();
  private saleItems = new Map<string, SaleItemMock>();
  private customers = new Map<string, CustomerMock>();
  private folios = new Map<string, FolioMock>();
  private paymentMethods = new Map<string, PaymentMethodMock>();
  private paymentItems: PaymentItemMock[] = [];
  private folioCounter = 0;

  seedSale(sale: SaleMock): void {
    this.sales.set(sale.id, { ...sale });
  }

  seedSaleItem(item: SaleItemMock): void {
    this.saleItems.set(item.id, { ...item });
  }

  seedCustomer(customer: CustomerMock): void {
    this.customers.set(customer.id, { ...customer });
  }

  seedFolio(folio: FolioMock): void {
    this.folios.set(folio.id, { ...folio });
  }

  seedPaymentMethod(paymentMethod: PaymentMethodMock): void {
    this.paymentMethods.set(paymentMethod.id, { ...paymentMethod });
  }

  private paidAmountForLine(saleItemId: string): number {
    return this.paymentItems
      .filter((pi) => pi.saleItemId === saleItemId && this.payments.get(pi.customerPaymentId)?.status === "completed")
      .reduce((acc, pi) => acc + pi.amount, 0);
  }

  async createCompleted(input: CreatePaymentInput): Promise<PaymentWithSale> {
    const sale = this.sales.get(input.saleId);
    if (!sale) throw new SaleNotFoundError(input.saleId);
    if (sale.status !== "completed") throw new SaleNotPayableError({ status: sale.status });
    if (!sale.isCredit) throw new SaleNotPayableError({ reason: "not_credit" });

    if (input.callerBranchId !== null && sale.branchId !== input.callerBranchId) {
      throw new BranchScopeViolationError();
    }

    const folioMock = this.folios.get(input.folioId);
    if (folioMock) {
      if (!folioMock.isActive) throw new InactiveResourceError("Folio");
      if (folioMock.scope !== "OPERATIONS") throw new FolioScopeMismatchError("OPERATIONS", folioMock.scope);
    }

    const remaining = sale.total - sale.paidAmount;
    if (input.amount > remaining) throw new PaymentExceedsDueAmountError(remaining);

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const saleItem = this.saleItems.get(item.saleItemId);
        if (!saleItem || saleItem.saleId !== input.saleId) throw new SaleItemNotFoundError(item.saleItemId);
      }

      const sumItems = input.items.reduce((acc, i) => acc + i.amount, 0);
      if (Math.abs(sumItems - input.amount) > AMOUNT_TOLERANCE) {
        throw new PaymentItemsAmountMismatchError(input.amount, sumItems);
      }

      for (const item of input.items) {
        const saleItem = this.saleItems.get(item.saleItemId)!;
        const alreadyPaid = this.paidAmountForLine(item.saleItemId);
        const lineDue = saleItem.lineTotal - alreadyPaid;
        if (item.amount > lineDue + AMOUNT_TOLERANCE) {
          throw new PaymentExceedsLineDueAmountError(item.saleItemId, lineDue);
        }
      }
    }

    this.folioCounter++;
    const folioNumber = this.folioCounter;
    const folioCode = `RECIBO-${String(folioNumber).padStart(6, "0")}`;

    const newPaidAmount = sale.paidAmount + input.amount;
    const newPaymentStatus: SalePaymentStatus =
      newPaidAmount >= sale.total ? "paid" : newPaidAmount > 0 ? "partial" : "pending";

    sale.paidAmount = newPaidAmount;
    sale.paymentStatus = newPaymentStatus;

    const customer = this.customers.get(sale.customerId);
    if (customer) {
      customer.currentBalance = Math.max(0, customer.currentBalance - input.amount);
    }

    const payment = CustomerPayment.create(randomUUID(), {
      saleId: input.saleId,
      customerId: sale.customerId,
      userId: input.userId,
      branchId: sale.branchId,
      paymentMethodId: input.paymentMethodId,
      folioId: input.folioId,
      folioNumber,
      folioCode,
      amount: input.amount,
      status: "completed",
      notes: input.notes,
      createdAt: new Date(),
      cancelledAt: null,
      cancellationReason: null,
      items: input.items?.map((i) => ({
        saleItemId: i.saleItemId,
        productNameSnapshot: this.saleItems.get(i.saleItemId)?.productNameSnapshot ?? "",
        amount: i.amount,
      })),
    });

    this.payments.set(payment.id, payment);

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        this.paymentItems.push({ customerPaymentId: payment.id, saleItemId: item.saleItemId, amount: item.amount });
      }
    }

    return {
      payment,
      sale: {
        id: sale.id,
        folioCode: sale.folioCode,
        folioNumber: sale.folioNumber,
        total: sale.total,
        paidAmount: sale.paidAmount,
        paymentStatus: sale.paymentStatus,
        branchId: sale.branchId,
        customerId: sale.customerId,
      },
      joins: {
        saleFolioCode: sale.folioCode,
        customerName: "",
        userName: "",
        branchName: "",
        paymentMethodCode: "",
        saleTotal: sale.total,
        salePaidAmount: sale.paidAmount,
        salePaymentStatus: sale.paymentStatus,
      },
    };
  }

  async createAccountCompleted(input: CreateAccountPaymentInput): Promise<PaymentWithSale> {
    const customer = this.customers.get(input.customerId);
    if (!customer) throw new CustomerNotFoundError(input.customerId);

    const pmMock = this.paymentMethods.get(input.paymentMethodId);
    if (pmMock && !pmMock.isActive) throw new InactiveResourceError("PaymentMethod");

    const folioMock = this.folios.get(input.folioId);
    if (folioMock) {
      if (!folioMock.isActive) throw new InactiveResourceError("Folio");
      if (folioMock.scope !== "OPERATIONS") throw new FolioScopeMismatchError("OPERATIONS", folioMock.scope);
    }

    const accountDebt = this.computeAccountDebt(input.customerId, input.branchId);
    if (input.amount > accountDebt + AMOUNT_TOLERANCE) {
      throw new PaymentExceedsAccountDebtError(accountDebt);
    }

    customer.currentBalance = Math.max(0, customer.currentBalance - input.amount);

    this.folioCounter++;
    const folioNumber = this.folioCounter;
    const folioCode = `RB-${String(folioNumber).padStart(6, "0")}`;

    const payment = CustomerPayment.create(randomUUID(), {
      saleId: null,
      customerId: input.customerId,
      userId: input.userId,
      branchId: input.branchId,
      paymentMethodId: input.paymentMethodId,
      folioId: input.folioId,
      folioNumber,
      folioCode,
      amount: input.amount,
      status: "completed",
      notes: input.notes,
      createdAt: new Date(),
      cancelledAt: null,
      cancellationReason: null,
    });

    this.payments.set(payment.id, payment);

    return {
      payment,
      sale: null,
      joins: {
        saleFolioCode: null,
        customerName: "",
        userName: "",
        branchName: "",
        paymentMethodCode: pmMock?.code ?? "",
        saleTotal: null,
        salePaidAmount: null,
        salePaymentStatus: null,
      },
    };
  }

  private computeAccountDebt(customerId: string, effectiveBranchId: string | null): number {
    const customer = this.customers.get(customerId);
    if (!customer) throw new CustomerNotFoundError(customerId);

    const pendingDue = Array.from(this.sales.values())
      .filter(
        (s) =>
          s.customerId === customerId &&
          s.status === "completed" &&
          s.isCredit &&
          (effectiveBranchId === null || s.branchId === effectiveBranchId)
      )
      .map((s) => s.total - s.paidAmount)
      .filter((due) => due > AMOUNT_TOLERANCE)
      .reduce((acc, due) => acc + due, 0);

    return Math.max(0, customer.currentBalance - pendingDue);
  }

  async getAccountDebt(customerId: string, branchId: string | null): Promise<AccountDebtSummary> {
    const customer = this.customers.get(customerId);
    if (!customer) throw new CustomerNotFoundError(customerId);

    const pendingSales = Array.from(this.sales.values())
      .filter(
        (s) =>
          s.customerId === customerId &&
          s.status === "completed" &&
          s.isCredit &&
          (branchId === null || s.branchId === branchId)
      )
      .map((s) => ({
        saleId: s.id,
        folioCode: s.folioCode,
        total: s.total,
        paidAmount: s.paidAmount,
        due: s.total - s.paidAmount,
        createdAt: s.createdAt ?? new Date(0),
      }))
      .filter((s) => s.due > AMOUNT_TOLERANCE)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const pendingDue = pendingSales.reduce((acc, s) => acc + s.due, 0);
    const accountDebt = Math.max(0, customer.currentBalance - pendingDue);

    return { currentBalance: customer.currentBalance, pendingSales, accountDebt };
  }

  async markCancelled(id: string, reason: string | null, _userId: string): Promise<PaymentWithSale> {
    const payment = this.payments.get(id);
    if (!payment) throw new PaymentNotFoundError(id);
    if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();

    const cancelled = CustomerPayment.create(payment.id, {
      saleId: payment.saleId,
      customerId: payment.customerId,
      userId: payment.userId,
      branchId: payment.branchId,
      paymentMethodId: payment.paymentMethodId,
      folioId: payment.folioId,
      folioNumber: payment.folioNumber,
      folioCode: payment.folioCode,
      amount: payment.amount,
      status: "cancelled",
      notes: payment.notes,
      createdAt: payment.createdAt,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });
    this.payments.set(id, cancelled);

    if (payment.saleId === null) {
      const customer = this.customers.get(payment.customerId);
      if (customer) {
        customer.currentBalance += payment.amount;
      }

      return {
        payment: cancelled,
        sale: null,
        joins: {
          saleFolioCode: null,
          customerName: "",
          userName: "",
          branchName: "",
          paymentMethodCode: "",
          saleTotal: null,
          salePaidAmount: null,
          salePaymentStatus: null,
        },
      };
    }

    const sale = this.sales.get(payment.saleId)!;
    const newPaidAmount = Math.max(0, sale.paidAmount - payment.amount);
    const newPaymentStatus: SalePaymentStatus =
      newPaidAmount >= sale.total ? "paid" : newPaidAmount > 0 ? "partial" : "pending";
    sale.paidAmount = newPaidAmount;
    sale.paymentStatus = newPaymentStatus;

    const customer = this.customers.get(sale.customerId);
    if (customer) {
      customer.currentBalance += payment.amount;
    }

    return {
      payment: cancelled,
      sale: {
        id: sale.id,
        folioCode: sale.folioCode,
        folioNumber: sale.folioNumber,
        total: sale.total,
        paidAmount: sale.paidAmount,
        paymentStatus: sale.paymentStatus,
        branchId: sale.branchId,
        customerId: sale.customerId,
      },
      joins: {
        saleFolioCode: sale.folioCode,
        customerName: "",
        userName: "",
        branchName: "",
        paymentMethodCode: "",
        saleTotal: sale.total,
        salePaidAmount: sale.paidAmount,
        salePaymentStatus: sale.paymentStatus,
      },
    };
  }

  async findById(id: string): Promise<PaymentWithSale | null> {
    const payment = this.payments.get(id);
    if (!payment) return null;
    if (payment.saleId === null) {
      return {
        payment,
        sale: null,
        joins: {
          saleFolioCode: null,
          customerName: "",
          userName: "",
          branchName: "",
          paymentMethodCode: "",
          saleTotal: null,
          salePaidAmount: null,
          salePaymentStatus: null,
        },
      };
    }
    const sale = this.sales.get(payment.saleId);
    if (!sale) return null;
    return {
      payment,
      sale: {
        id: sale.id,
        folioCode: sale.folioCode,
        folioNumber: sale.folioNumber,
        total: sale.total,
        paidAmount: sale.paidAmount,
        paymentStatus: sale.paymentStatus,
        branchId: sale.branchId,
        customerId: sale.customerId,
      },
      joins: {
        saleFolioCode: sale.folioCode,
        customerName: "",
        userName: "",
        branchName: "",
        paymentMethodCode: "",
        saleTotal: sale.total,
        salePaidAmount: sale.paidAmount,
        salePaymentStatus: sale.paymentStatus,
      },
    };
  }

  async list(
    filters: ListPaymentsFilters,
    pagination: ListPaymentsPagination
  ): Promise<{ items: PaymentListRow[]; total: number }> {
    let payments = Array.from(this.payments.values());

    if (filters.branchId) payments = payments.filter((p) => p.branchId === filters.branchId);
    if (filters.saleId) payments = payments.filter((p) => p.saleId === filters.saleId);
    if (filters.customerId) payments = payments.filter((p) => p.customerId === filters.customerId);
    if (filters.userId) payments = payments.filter((p) => p.userId === filters.userId);
    if (filters.paymentMethodId) payments = payments.filter((p) => p.paymentMethodId === filters.paymentMethodId);
    if (filters.statuses && filters.statuses.length > 0) {
      payments = payments.filter((p) => filters.statuses!.includes(p.status));
    }
    if (filters.from) payments = payments.filter((p) => p.createdAt >= filters.from!);
    if (filters.to) payments = payments.filter((p) => p.createdAt <= filters.to!);

    payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = payments.length;
    const skip = (pagination.page - 1) * pagination.pageSize;
    const page = payments.slice(skip, skip + pagination.pageSize);

    const items: PaymentListRow[] = page.map((p) => {
      const sale = p.saleId ? this.sales.get(p.saleId) : undefined;
      return {
        payment: p,
        joins: {
          saleFolioCode: sale?.folioCode ?? null,
          customerName: "",
          userName: "",
          branchName: "",
          paymentMethodCode: "",
          saleTotal: sale?.total ?? null,
          salePaidAmount: sale?.paidAmount ?? null,
          salePaymentStatus: sale?.paymentStatus ?? null,
        },
      };
    });

    return { items, total };
  }

  async listBySale(saleId: string): Promise<{ items: PaymentListRow[]; saleTotals: SaleTotals }> {
    const sale = this.sales.get(saleId);
    if (!sale) throw new SaleNotFoundError(saleId);

    const payments = Array.from(this.payments.values())
      .filter((p) => p.saleId === saleId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const items: PaymentListRow[] = payments.map((p) => ({
      payment: p,
      joins: {
        saleFolioCode: sale.folioCode,
        customerName: "",
        userName: "",
        branchName: "",
        paymentMethodCode: "",
        saleTotal: sale.total,
        salePaidAmount: sale.paidAmount,
        salePaymentStatus: sale.paymentStatus,
      },
    }));

    const lineBalances: LineBalance[] = Array.from(this.saleItems.values())
      .filter((si) => si.saleId === saleId)
      .map((si) => {
        const paidAmount = this.paidAmountForLine(si.id);
        return {
          saleItemId: si.id,
          productNameSnapshot: si.productNameSnapshot,
          lineTotal: si.lineTotal,
          paidAmount,
          dueAmount: si.lineTotal - paidAmount,
        };
      });

    return {
      items,
      saleTotals: {
        saleId,
        saleBranchId: sale.branchId,
        saleTotal: sale.total,
        salePaidAmount: sale.paidAmount,
        salePaymentStatus: sale.paymentStatus,
        lineBalances,
      },
    };
  }

  async findHistory(
    filters: HistoryFilters,
    pagination?: ListPaymentsPagination
  ): Promise<HistoryResult> {
    let items = Array.from(this.payments.values());

    if (filters.branchId) items = items.filter((p) => p.branchId === filters.branchId);
    if (filters.saleId) items = items.filter((p) => p.saleId === filters.saleId);
    if (filters.customerId) items = items.filter((p) => p.customerId === filters.customerId);
    if (filters.userId) items = items.filter((p) => p.userId === filters.userId);
    if (filters.paymentMethodId) items = items.filter((p) => p.paymentMethodId === filters.paymentMethodId);
    if (filters.statuses && filters.statuses.length > 0) {
      items = items.filter((p) => filters.statuses!.includes(p.status));
    }
    if (filters.from) items = items.filter((p) => p.createdAt >= filters.from!);
    if (filters.to) items = items.filter((p) => p.createdAt <= filters.to!);

    const total = items.length;
    let completedCount = 0;
    let cancelledCount = 0;
    let totalAmountCompletedNum = 0;
    let totalAmountCancelledNum = 0;

    for (const p of items) {
      if (p.status === "completed") {
        completedCount++;
        totalAmountCompletedNum += p.amount;
      } else {
        cancelledCount++;
        totalAmountCancelledNum += p.amount;
      }
    }

    const totalAmountCompleted = totalAmountCompletedNum.toFixed(4);
    const totalAmountCancelled = totalAmountCancelledNum.toFixed(4);

    if (pagination) {
      const skip = (pagination.page - 1) * pagination.pageSize;
      items = items.slice(skip, skip + pagination.pageSize);
    }

    const historyItems: PaymentHistoryItem[] = items.map((p) => {
      const sale = p.saleId ? this.sales.get(p.saleId) : undefined;
      return {
        id: p.id,
        createdAt: p.createdAt,
        folioCode: p.folioCode,
        saleId: p.saleId,
        saleFolioCode: sale?.folioCode ?? null,
        customerId: p.customerId,
        customerName: "",
        userId: p.userId,
        userName: "",
        branchId: p.branchId,
        branchName: "",
        paymentMethodCode: "",
        amount: p.amount,
        status: p.status,
        cancelledAt: p.cancelledAt,
        saleTotal: sale?.total ?? null,
        salePaidAmount: sale?.paidAmount ?? null,
        salePaymentStatus: sale?.paymentStatus ?? null,
      };
    });

    return {
      items: historyItems,
      total,
      totalAmountCompleted,
      totalAmountCancelled,
      completedCount,
      cancelledCount,
    };
  }
}

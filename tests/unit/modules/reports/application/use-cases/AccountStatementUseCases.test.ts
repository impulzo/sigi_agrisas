import { GetAccountStatementsSummaryUseCase } from "@/modules/reports/application/use-cases/GetAccountStatementsSummaryUseCase";
import { GetAccountStatementLedgerUseCase } from "@/modules/reports/application/use-cases/GetAccountStatementLedgerUseCase";
import { StatementCustomerNotFoundError } from "@/modules/reports/domain/errors/StatementCustomerNotFoundError";
import {
  InMemoryAccountStatementRepository,
  InMemoryStatementCustomer,
  InMemoryStatementMovement,
} from "@/modules/reports/infrastructure/repositories/InMemoryAccountStatementRepository";

const CUST = "33333333-3333-3333-3333-333333333333";
const GEN = { userId: "u1", email: "op@test.com" };

function cust(over: Partial<InMemoryStatementCustomer> = {}): InMemoryStatementCustomer {
  return { id: CUST, code: "C001", name: "Cliente", currentBalance: 300, creditLimit: 1000, ...over };
}

function repoWith(customers: InMemoryStatementCustomer[], movements: InMemoryStatementMovement[] = []) {
  return new InMemoryAccountStatementRepository(customers, movements);
}

function mov(over: Partial<InMemoryStatementMovement>): InMemoryStatementMovement {
  return {
    id: "m",
    customerId: CUST,
    kind: "sale",
    isCredit: true,
    status: "completed",
    amount: 100,
    date: new Date("2026-06-01T10:00:00Z"),
    folioCode: "TK",
    folioNumber: 1,
    branchId: "b1",
    dueDate: null,
    reference: null,
    paymentMethodCode: "CR",
    paymentStatus: "pending",
    saleId: null,
    ...over,
  };
}

describe("GetAccountStatementsSummaryUseCase", () => {
  it("cliente sin movimientos → totales 0 y availableCredit = creditLimit", async () => {
    const uc = new GetAccountStatementsSummaryUseCase(repoWith([cust({ currentBalance: 0 })]));
    const dto = await uc.execute({
      branchId: null, search: null, from: null, to: null,
      onlyWithBalance: false, page: 1, pageSize: 20, generatedBy: GEN,
    });
    expect(dto.items[0].totalCharged).toBe("0.0000");
    expect(dto.items[0].totalPaid).toBe("0.0000");
    expect(dto.items[0].availableCredit).toBe("1000.0000");
  });

  it("creditLimit null → availableCredit null", async () => {
    const uc = new GetAccountStatementsSummaryUseCase(repoWith([cust({ creditLimit: null })]));
    const dto = await uc.execute({
      branchId: null, search: null, from: null, to: null,
      onlyWithBalance: false, page: 1, pageSize: 20, generatedBy: GEN,
    });
    expect(dto.items[0].availableCredit).toBeNull();
  });

  it("onlyWithBalance excluye saldo cero", async () => {
    const uc = new GetAccountStatementsSummaryUseCase(
      repoWith([
        cust({ currentBalance: 300 }),
        cust({ id: "44444444-4444-4444-4444-444444444444", code: "C002", name: "Zero", currentBalance: 0 }),
      ])
    );
    const dto = await uc.execute({
      branchId: null, search: null, from: null, to: null,
      onlyWithBalance: true, page: 1, pageSize: 20, generatedBy: GEN,
    });
    expect(dto.total).toBe(1);
    expect(dto.items[0].customerCode).toBe("C001");
  });
});

describe("GetAccountStatementLedgerUseCase", () => {
  const movements: InMemoryStatementMovement[] = [
    mov({ id: "s0", amount: 200, date: new Date("2026-05-01T10:00:00Z"), folioNumber: 1, paymentStatus: "paid" }),
    mov({ id: "s1", amount: 100, date: new Date("2026-06-10T10:00:00Z"), folioNumber: 2, paymentStatus: "partial" }),
    mov({ id: "p1", kind: "payment", isCredit: false, amount: 50, date: new Date("2026-06-20T10:00:00Z"), folioCode: "RB", folioNumber: 1, paymentMethodCode: "TR", paymentStatus: null, saleId: "s1", reference: "TRANSF 50000" }),
  ];

  const LEDGER_BASE = { branchId: null, from: null, to: null, history: true, sort: "date" as const };

  it("404 cliente inexistente", async () => {
    const uc = new GetAccountStatementLedgerUseCase(repoWith([]));
    await expect(
      uc.execute({ customerId: CUST, ...LEDGER_BASE, generatedBy: GEN })
    ).rejects.toBeInstanceOf(StatementCustomerNotFoundError);
  });

  it("histórico completo desde 0", async () => {
    const uc = new GetAccountStatementLedgerUseCase(repoWith([cust()], movements));
    const dto = await uc.execute({ customerId: CUST, ...LEDGER_BASE, generatedBy: GEN });
    expect(dto.openingBalance).toBe("0.0000");
    expect(dto.movements).toHaveLength(3);
    expect(dto.closingBalance).toBe("250.0000");
  });

  it("rango calcula opening balance de movimientos previos", async () => {
    const uc = new GetAccountStatementLedgerUseCase(repoWith([cust()], movements));
    const dto = await uc.execute({
      customerId: CUST,
      ...LEDGER_BASE,
      from: new Date("2026-06-01T00:00:00Z"),
      to: new Date("2026-06-30T00:00:00Z"),
      generatedBy: GEN,
    });
    // s0 (200) queda fuera del rango → openingBalance 200
    expect(dto.openingBalance).toBe("200.0000");
    expect(dto.movements).toHaveLength(2);
    expect(dto.movements[0].runningBalance).toBe("300.0000");
    expect(dto.closingBalance).toBe("250.0000");
  });

  it("expone campos fiscales, lastInvoice y address", async () => {
    const uc = new GetAccountStatementLedgerUseCase(
      repoWith([cust({ address: "Calle 1" })], movements)
    );
    const dto = await uc.execute({ customerId: CUST, ...LEDGER_BASE, generatedBy: GEN });
    expect(dto.customer.address).toBe("Calle 1");
    expect(dto.lastInvoice).toEqual({ serie: "TK", folioNumber: 2 });
    const pay = dto.movements.find((m) => m.type === "payment")!;
    expect(pay.paymentMethodCode).toBe("TR");
    expect(pay.reference).toBe("TRANSF 50000");
    expect(pay.serie).toBe("RB");
    expect(pay.factura).toBe(1);
  });

  it("history=false (General) solo deudas activas + sus abonos", async () => {
    const uc = new GetAccountStatementLedgerUseCase(repoWith([cust()], movements));
    const dto = await uc.execute({ customerId: CUST, ...LEDGER_BASE, history: false, generatedBy: GEN });
    // s0 está 'paid' → excluida; s1 'partial' → incluida; p1 ligado a s1 → incluido.
    const ids = dto.movements.map((m) => m.id).sort();
    expect(ids).toEqual(["p1", "s1"]);
    // runningBalance cronológico se conserva (no recalcula por filtro).
    expect(dto.closingBalance).toBe("250.0000");
  });

  it("openingBalance parte de initialBalance del cliente, no de 0", async () => {
    const uc = new GetAccountStatementLedgerUseCase(
      repoWith([cust({ initialBalance: 500, currentBalance: 750 })], movements)
    );
    const dto = await uc.execute({ customerId: CUST, ...LEDGER_BASE, generatedBy: GEN });
    // openingBalance = initialBalance (500); closingBalance = 500 + 200 + 100 - 50 = 750 = currentBalance
    expect(dto.openingBalance).toBe("500.0000");
    expect(dto.closingBalance).toBe("750.0000");
  });

  it("sort=invoice reordena sin alterar runningBalance", async () => {
    const uc = new GetAccountStatementLedgerUseCase(repoWith([cust()], movements));
    const byDate = await uc.execute({ customerId: CUST, ...LEDGER_BASE, generatedBy: GEN });
    const byInvoice = await uc.execute({ customerId: CUST, ...LEDGER_BASE, sort: "invoice", generatedBy: GEN });
    // Orden por factura (folioNumber): p1(RB-1)/s0(TK-1) empatan en 1 → serie decide; luego s1(TK-2).
    expect(byInvoice.movements.map((m) => m.id)).not.toEqual(byDate.movements.map((m) => m.id));
    // Cada movimiento conserva su runningBalance cronológico.
    const s1Date = byDate.movements.find((m) => m.id === "s1")!.runningBalance;
    const s1Inv = byInvoice.movements.find((m) => m.id === "s1")!.runningBalance;
    expect(s1Inv).toBe(s1Date);
  });
});

import { resolveTicketConditionsLine } from "../../../../../../../app/(private)/sales/_logic/lib/resolveTicketConditionsLine";

describe("resolveTicketConditionsLine", () => {
  it("returns credit days text for a credit sale with customerCreditDays set", () => {
    expect(resolveTicketConditionsLine({ isCredit: true, customerCreditDays: 45 })).toBe("Crédito a 45 días");
  });

  it("falls back to 30 days for a credit sale with customerCreditDays null", () => {
    expect(resolveTicketConditionsLine({ isCredit: true, customerCreditDays: null })).toBe("Crédito a 30 días");
  });

  it("returns CONTADO for a cash sale with a customer", () => {
    expect(resolveTicketConditionsLine({ isCredit: false, customerCreditDays: 30 })).toBe("CONTADO");
  });

  it("returns CONTADO for a walk-in cash sale without a customer", () => {
    expect(resolveTicketConditionsLine({ isCredit: false, customerCreditDays: null })).toBe("CONTADO");
  });
});

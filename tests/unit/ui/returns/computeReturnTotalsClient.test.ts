import { computeReturnTotalsClient } from "../../../../app/(private)/returns/_logic/lib/computeReturnTotalsClient";
import { ReturnTotalsCalculator } from "../../../../src/modules/returns/domain/services/ReturnTotalsCalculator";
import { totalsVectors } from "../../../fixtures/totals-vectors";

// ReturnTotalsCalculator has no isTaxable logic (all items are taxable in returns);
// exclude vectors with isTaxable=false to avoid false divergences on non-return scenarios.
const returnVectors = totalsVectors.filter((v) =>
  v.every((line) => line.isTaxable === undefined || line.isTaxable === true)
);

describe("computeReturnTotalsClient equivalence with ReturnTotalsCalculator", () => {
  returnVectors.forEach((lines, idx) => {
    it(`vector ${idx + 1}: client matches server`, () => {
      const server = ReturnTotalsCalculator.computeTotals(lines);
      const client = computeReturnTotalsClient(lines);
      expect(client.subtotal).toBe(server.subtotal);
      expect(client.taxTotal).toBe(server.taxTotal);
      expect(client.total).toBe(server.total);
    });
  });
});

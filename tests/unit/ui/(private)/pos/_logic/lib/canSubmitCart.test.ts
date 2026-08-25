import { canSubmitCart } from "../../../../../../../app/(private)/pos/_logic/lib/canSubmitCart";

const baseArgs = {
  canCreate: true as const,
  linesCount: 1,
  selectedBranchId: "branch-1",
  selectedFolioId: "folio-1",
  selectedPaymentMethodId: "pm-1",
  isQuoteMode: false,
  isSubmitting: false,
  isOnline: true,
  offlineEnabled: true,
  ownerBranchId: "branch-1",
};

describe("canSubmitCart — gating offline", () => {
  it("online: no se ve afectado por offlineEnabled/ownerBranchId", () => {
    expect(
      canSubmitCart({ ...baseArgs, isOnline: true, offlineEnabled: false, ownerBranchId: null })
    ).toBe(true);
  });

  it("offline sin offlineEnabled: bloquea el submit", () => {
    expect(
      canSubmitCart({ ...baseArgs, isOnline: false, offlineEnabled: false, ownerBranchId: null })
    ).toBe(false);
  });

  it("offline con offlineEnabled pero ownerBranchId distinto de la sucursal del formulario: bloquea", () => {
    expect(
      canSubmitCart({ ...baseArgs, isOnline: false, offlineEnabled: true, ownerBranchId: "otra-sucursal" })
    ).toBe(false);
  });

  it("offline con offlineEnabled y ownerBranchId igual a la sucursal del formulario: permite (sin regresión)", () => {
    expect(
      canSubmitCart({ ...baseArgs, isOnline: false, offlineEnabled: true, ownerBranchId: "branch-1" })
    ).toBe(true);
  });
});

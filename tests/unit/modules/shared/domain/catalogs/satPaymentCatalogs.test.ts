import {
  SAT_PAYMENT_FORMS,
  SAT_PAYMENT_METHODS,
  describePaymentForm,
  describePaymentMethod,
} from "@/shared/domain/catalogs/satPaymentCatalogs";

describe("satPaymentCatalogs", () => {
  it("describes a known payment form code", () => {
    expect(describePaymentForm("03")).toBe("03 - Transferencia");
  });

  it("describes a known payment method code", () => {
    expect(describePaymentMethod("PUE")).toBe("PUE - Pago en una exhibición");
  });

  it("falls back to the raw code for an unknown payment form", () => {
    expect(describePaymentForm("77")).toBe("77");
  });

  it("falls back to the raw code for an unknown payment method", () => {
    expect(describePaymentMethod("XYZ")).toBe("XYZ");
  });

  it("catalogs are non-empty and every entry has code+description", () => {
    expect(SAT_PAYMENT_FORMS.length).toBeGreaterThan(0);
    expect(SAT_PAYMENT_METHODS.length).toBeGreaterThan(0);
    [...SAT_PAYMENT_FORMS, ...SAT_PAYMENT_METHODS].forEach((e) => {
      expect(e.code).toBeTruthy();
      expect(e.description).toBeTruthy();
    });
  });
});

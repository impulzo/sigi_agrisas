import { createWaybillSchema } from "../../../../src/modules/waybills/infrastructure/http/WaybillsController";

const ORIGIN_ID = "11111111-1111-1111-1111-111111111111";
const DEST_ID = "22222222-2222-2222-2222-222222222222";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333333";

function simplePayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "simple",
    originBranchId: ORIGIN_ID,
    destinationBranchId: DEST_ID,
    transferDate: "2026-08-01T08:00:00.000Z",
    notes: "Reabasto interno",
    items: [{ productId: PRODUCT_ID, description: "Fertilizante", quantity: 10 }],
    ...overrides,
  };
}

function cartaPortePayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "carta_porte",
    originBranchId: ORIGIN_ID,
    destinationBranchId: DEST_ID,
    vehicle: {
      plate: "ABC1234",
      config: "C2",
      permitType: "TPAF01",
      permitNumber: "SCT-123",
      insuranceCompany: "Aseguradora SA",
      insurancePolicy: "POL-1",
    },
    driver: { name: "Juan Perez", licenseNumber: "LIC-1" },
    distanceKm: 50,
    departureAt: "2026-08-01T08:00:00.000Z",
    arrivalAt: "2026-08-01T12:00:00.000Z",
    items: [
      {
        productId: PRODUCT_ID,
        description: "Fertilizante",
        satBienesTranspCode: "10161500",
        satUnitCode: "KGM",
        quantity: 10,
        weightKg: 100,
      },
    ],
    ...overrides,
  };
}

describe("createWaybillSchema (discriminated union)", () => {
  it("accepts a valid simple payload", () => {
    const result = createWaybillSchema.safeParse(simplePayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("simple");
    }
  });

  it("accepts a valid carta_porte payload", () => {
    const result = createWaybillSchema.safeParse(cartaPortePayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("carta_porte");
    }
  });

  it("rejects an unknown/mismatched type discriminant", () => {
    const result = createWaybillSchema.safeParse(simplePayload({ type: "traspaso" }));
    expect(result.success).toBe(false);
  });

  it("rejects a payload missing the type field entirely", () => {
    const { type: _omit, ...withoutType } = simplePayload();
    const result = createWaybillSchema.safeParse(withoutType);
    expect(result.success).toBe(false);
  });

  it("rejects carta_porte when arrivalAt is before departureAt (superRefine)", () => {
    const result = createWaybillSchema.safeParse(
      cartaPortePayload({ departureAt: "2026-08-01T12:00:00.000Z", arrivalAt: "2026-08-01T08:00:00.000Z" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const arrivalIssue = result.error.issues.find((i) => i.path.join(".") === "arrivalAt");
      expect(arrivalIssue).toBeDefined();
    }
  });

  it("rejects carta_porte when arrivalAt equals departureAt (superRefine, strictly-after semantics)", () => {
    const result = createWaybillSchema.safeParse(cartaPortePayload({ arrivalAt: "2026-08-01T08:00:00.000Z" }));
    expect(result.success).toBe(false);
  });

  it("rejects a simple payload with a free line (no productId) — strict object has no such field to omit, so this covers the shape check", () => {
    const result = createWaybillSchema.safeParse(
      simplePayload({ items: [{ description: "Sin producto", quantity: 1 }] })
    );
    expect(result.success).toBe(false);
  });

  it("rejects a simple payload carrying carta_porte-only fields (strict schema)", () => {
    const result = createWaybillSchema.safeParse(
      simplePayload({ vehicle: cartaPortePayload().vehicle })
    );
    expect(result.success).toBe(false);
  });

  it("rejects carta_porte items missing required SAT fields", () => {
    const payload = cartaPortePayload();
    const items = payload.items.map(({ satBienesTranspCode: _drop, ...rest }) => rest);
    const result = createWaybillSchema.safeParse({ ...payload, items });
    expect(result.success).toBe(false);
  });

  it("rejects a hazardous carta_porte item without hazardousMaterialCode", () => {
    const payload = cartaPortePayload({
      items: [{ ...cartaPortePayload().items[0], isHazardousMaterial: true }],
    });
    const result = createWaybillSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it(
    "does NOT reject origin === destination at the schema level — that check is a business rule " +
      "enforced downstream by CreateWaybillUseCase.resolveBranchPair (see CreateWaybillUseCase.test.ts and " +
      "CreateSimpleWaybillUseCase.test.ts), not a shape/refinement concern of the Zod schema",
    () => {
      const result = createWaybillSchema.safeParse(simplePayload({ destinationBranchId: ORIGIN_ID }));
      expect(result.success).toBe(true);
    }
  );
});

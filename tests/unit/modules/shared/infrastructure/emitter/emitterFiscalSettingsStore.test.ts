import {
  getEmitterFiscalSettings,
  upsertEmitterFiscalSettings,
  isEmitterFiscalDataComplete,
} from "@/shared/infrastructure/emitter/emitterFiscalSettingsStore";

function makeFakeTx(initial: Record<string, unknown> | null = null) {
  let row = initial;
  return {
    emitterFiscalSettings: {
      findUnique: jest.fn(async () => row),
      upsert: jest.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        row = row ? { ...row, ...update } : create;
        return row;
      }),
    },
  } as never;
}

describe("emitterFiscalSettingsStore", () => {
  describe("getEmitterFiscalSettings", () => {
    it("returns null when no row exists", async () => {
      const tx = makeFakeTx(null);
      await expect(getEmitterFiscalSettings(tx)).resolves.toBeNull();
    });

    it("returns the persisted fields", async () => {
      const tx = makeFakeTx({ rfc: "XAXX010101000", legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000" });
      await expect(getEmitterFiscalSettings(tx)).resolves.toEqual({
        rfc: "XAXX010101000",
        legalName: "Agrisas",
        fiscalRegime: "601",
        zipCode: "83000",
      });
    });
  });

  describe("upsertEmitterFiscalSettings", () => {
    it("creates the row on first write", async () => {
      const tx = makeFakeTx(null);
      await upsertEmitterFiscalSettings({ rfc: "XAXX010101000", legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000" }, tx);
      await expect(getEmitterFiscalSettings(tx)).resolves.toEqual({
        rfc: "XAXX010101000",
        legalName: "Agrisas",
        fiscalRegime: "601",
        zipCode: "83000",
      });
    });

    it("partial upsert does not clear previously stored fields", async () => {
      const tx = makeFakeTx({ rfc: "XAXX010101000", legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000" });
      await upsertEmitterFiscalSettings({ zipCode: "83100" }, tx);
      await expect(getEmitterFiscalSettings(tx)).resolves.toEqual({
        rfc: "XAXX010101000",
        legalName: "Agrisas",
        fiscalRegime: "601",
        zipCode: "83100",
      });
    });
  });

  describe("isEmitterFiscalDataComplete", () => {
    it("returns false for null", () => {
      expect(isEmitterFiscalDataComplete(null)).toBe(false);
    });

    it("returns false when any field is missing", () => {
      expect(
        isEmitterFiscalDataComplete({ rfc: "XAXX010101000", legalName: "Agrisas", fiscalRegime: "601" })
      ).toBe(false);
    });

    it("returns true when all 4 fields are present", () => {
      expect(
        isEmitterFiscalDataComplete({
          rfc: "XAXX010101000",
          legalName: "Agrisas",
          fiscalRegime: "601",
          zipCode: "83000",
        })
      ).toBe(true);
    });
  });
});

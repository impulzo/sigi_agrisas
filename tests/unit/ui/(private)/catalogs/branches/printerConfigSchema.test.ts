import { printerConfigSchema } from "../../../../../../app/(private)/catalogs/branches/_logic/schemas/branch.schema";

describe("printerConfigSchema", () => {
  it("rechaza printMode 'escpos' sin agentUrl", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "escpos",
      agentUrl: null,
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza printMode 'escpos' sin printerHost", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: null,
      printerPort: 9100,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza agentUrl con esquema https", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "escpos",
      agentUrl: "https://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza agentUrl con host distinto a localhost/127.0.0.1", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "escpos",
      agentUrl: "http://192.168.1.5:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
    expect(result.success).toBe(false);
  });

  it("acepta printMode 'browser' sin campos ESC/POS", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "browser",
      agentUrl: null,
      printerHost: null,
      printerPort: null,
    });
    expect(result.success).toBe(true);
  });

  it("acepta printMode 'escpos' completo y válido", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
    expect(result.success).toBe(true);
  });

  it("acepta agentUrl con 127.0.0.1", () => {
    const result = printerConfigSchema.safeParse({
      printMode: "escpos",
      agentUrl: "http://127.0.0.1:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
    expect(result.success).toBe(true);
  });
});

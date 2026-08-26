import { UpdateBranchPrinterConfigUseCase, IncompletePrinterConfigError } from "@/modules/settings/application/use-cases/UpdateBranchPrinterConfigUseCase";
import { InMemoryPrinterConfigRepository } from "@/modules/settings/infrastructure/repositories/InMemoryPrinterConfigRepository";

describe("UpdateBranchPrinterConfigUseCase", () => {
  it("accepts printMode 'escpos' when agentUrl and printerHost are both provided together", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new UpdateBranchPrinterConfigUseCase(repo);

    const config = await useCase.execute("branch-1", {
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });

    expect(config).toEqual({
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
  });

  it("rejects printMode 'escpos' without agentUrl", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new UpdateBranchPrinterConfigUseCase(repo);

    await expect(
      useCase.execute("branch-1", { printMode: "escpos", printerHost: "192.168.1.50" })
    ).rejects.toThrow(IncompletePrinterConfigError);
  });

  it("rejects printMode 'escpos' without printerHost", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new UpdateBranchPrinterConfigUseCase(repo);

    await expect(
      useCase.execute("branch-1", { printMode: "escpos", agentUrl: "http://localhost:9101" })
    ).rejects.toThrow(IncompletePrinterConfigError);
  });

  it("rejects switching to 'escpos' via a partial update when required fields were never set", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new UpdateBranchPrinterConfigUseCase(repo);

    // No agentUrl/printerHost ever configured for this branch — flipping printMode alone must fail.
    await expect(useCase.execute("branch-1", { printMode: "escpos" })).rejects.toThrow(IncompletePrinterConfigError);
  });

  it("allows completing the config incrementally across two calls", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new UpdateBranchPrinterConfigUseCase(repo);

    await useCase.execute("branch-1", { agentUrl: "http://localhost:9101", printerHost: "192.168.1.50" });
    const config = await useCase.execute("branch-1", { printMode: "escpos" });

    expect(config.printMode).toBe("escpos");
    expect(config.agentUrl).toBe("http://localhost:9101");
  });

  it("allows reverting to 'browser' without agentUrl/printerHost", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new UpdateBranchPrinterConfigUseCase(repo);
    await useCase.execute("branch-1", { printMode: "escpos", agentUrl: "http://localhost:9101", printerHost: "192.168.1.50" });

    const config = await useCase.execute("branch-1", { printMode: "browser" });

    expect(config.printMode).toBe("browser");
  });
});

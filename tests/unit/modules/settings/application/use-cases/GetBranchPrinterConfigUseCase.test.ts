import { GetBranchPrinterConfigUseCase } from "@/modules/settings/application/use-cases/GetBranchPrinterConfigUseCase";
import { InMemoryPrinterConfigRepository } from "@/modules/settings/infrastructure/repositories/InMemoryPrinterConfigRepository";

describe("GetBranchPrinterConfigUseCase", () => {
  it("returns the browser default when the branch has no configured row", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    const useCase = new GetBranchPrinterConfigUseCase(repo);

    const config = await useCase.execute("branch-without-config");

    expect(config).toEqual({
      printMode: "browser",
      agentUrl: null,
      printerHost: null,
      printerPort: null,
    });
  });

  it("returns the stored config for a configured branch", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    await repo.upsert("branch-1", {
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
    const useCase = new GetBranchPrinterConfigUseCase(repo);

    const config = await useCase.execute("branch-1");

    expect(config).toEqual({
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
  });

  it("does not leak configuration across branches", async () => {
    const repo = new InMemoryPrinterConfigRepository();
    await repo.upsert("branch-1", { printMode: "escpos", agentUrl: "http://localhost:9101", printerHost: "192.168.1.50" });
    const useCase = new GetBranchPrinterConfigUseCase(repo);

    const config = await useCase.execute("branch-2");

    expect(config.printMode).toBe("browser");
  });
});

import { DownloadWaybillFileUseCase } from "../../../../src/modules/waybills/application/use-cases/DownloadWaybillFileUseCase";
import { InMemoryWaybillRepository } from "../../../../src/modules/waybills/infrastructure/repositories/InMemoryWaybillRepository";
import { FakeFacturamaGateway } from "../../../../src/modules/waybills/infrastructure/services/FakeFacturamaGateway";
import { WaybillNotFoundError, WaybillNotStampedError } from "../../../../src/modules/waybills/domain/errors";

describe("DownloadWaybillFileUseCase", () => {
  it("throws WaybillNotFoundError when the waybill does not exist", async () => {
    const repo = new InMemoryWaybillRepository();
    const useCase = new DownloadWaybillFileUseCase(repo, new FakeFacturamaGateway());

    await expect(useCase.execute("missing-id", "pdf")).rejects.toThrow(WaybillNotFoundError);
  });

  it("throws WaybillNotStampedError when facturamaCfdiId is null", async () => {
    const repo = new InMemoryWaybillRepository();
    // Directly seed a waybill without going through createCompleted, to simulate the
    // defensive edge case the spec calls out (should not normally occur since creation
    // always stamps atomically).
    const stampSpy = jest.spyOn(repo, "findById").mockResolvedValueOnce({
      id: "wb-1",
      facturamaCfdiId: null,
      cfdiUuid: null,
    } as unknown as Awaited<ReturnType<typeof repo.findById>>);

    const useCase = new DownloadWaybillFileUseCase(repo, new FakeFacturamaGateway());

    await expect(useCase.execute("wb-1", "pdf")).rejects.toThrow(WaybillNotStampedError);
    stampSpy.mockRestore();
  });
});

import { updateProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/updateProvider";
import {
  ProviderNotFoundError,
  ProviderRfcAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/providers/_logic/errors";

const baseDto = {
  id: "1",
  code: "PROV_001",
  name: "Semillas ACME",
  rfc: "SAC120101A12",
  legalName: "ACME S.A.",
  taxRegime: "601",
  cfdiUse: null,
  taxZipCode: null,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  notes: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

describe("updateProvider", () => {
  it("returns Provider on 200 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await updateProvider(
      { id: "1", body: { legalName: "ACME S.A.", taxRegime: "601" } },
      mockFetch,
    );

    expect(result.legalName).toBe("ACME S.A.");
    expect(result.taxRegime).toBe("601");
  });

  it("normalizes rfc to uppercase when present", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    await updateProvider({ id: "1", body: { rfc: "sac120101a12" } }, mockFetch);

    const sentBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody.rfc).toBe("SAC120101A12");
  });

  it("does NOT normalize body if rfc is not present", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    await updateProvider({ id: "1", body: { name: "New Name" } }, mockFetch);

    const sentBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody.name).toBe("New Name");
    expect(sentBody.rfc).toBeUndefined();
  });

  it("throws ProviderNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Provider not found" }),
    } as Response);

    await expect(
      updateProvider({ id: "missing", body: { name: "x" } }, mockFetch),
    ).rejects.toBeInstanceOf(ProviderNotFoundError);
  });

  it("throws ProviderRfcAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Provider RFC already in use: XYZ010101000" }),
    } as Response);

    await expect(
      updateProvider({ id: "1", body: { rfc: "XYZ010101000" } }, mockFetch),
    ).rejects.toBeInstanceOf(ProviderRfcAlreadyInUseError);
  });
});

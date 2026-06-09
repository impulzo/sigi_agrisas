import { getProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/getProvider";
import { ProviderNotFoundError } from "../../../../../../../app/(private)/catalogs/providers/_logic/errors";

const baseDto = {
  id: "1",
  code: "PROV_001",
  name: "Semillas ACME",
  rfc: "SAC120101A12",
  legalName: null,
  taxRegime: null,
  cfdiUse: null,
  taxZipCode: null,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  notes: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("getProvider", () => {
  it("returns Provider with Date instances on 200", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await getProvider({ id: "1" }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("throws ProviderNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Provider not found" }),
    } as Response);

    await expect(getProvider({ id: "missing" }, mockFetch)).rejects.toBeInstanceOf(ProviderNotFoundError);
  });
});

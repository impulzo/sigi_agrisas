import { createProvider } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/createProvider";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";
import {
  ProviderCodeAlreadyInUseError,
  ProviderRfcAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/providers/_logic/errors";

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

describe("createProvider", () => {
  it("returns Provider on 201 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => baseDto,
    } as Response);

    const result = await createProvider(
      { body: { code: "PROV_001", name: "Semillas ACME", rfc: "SAC120101A12" } },
      mockFetch,
    );

    expect(result.id).toBe("1");
    expect(result.code).toBe("PROV_001");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("normalizes code and rfc to uppercase before sending", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => baseDto,
    } as Response);

    await createProvider(
      { body: { code: " prov_001 ", name: "Semillas ACME", rfc: " sac120101a12 " } },
      mockFetch,
    );

    const sentBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody.code).toBe("PROV_001");
    expect(sentBody.rfc).toBe("SAC120101A12");
  });

  it("throws ProviderCodeAlreadyInUseError on 409 with 'code already in use'", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Provider code already in use: PROV_001" }),
    } as Response);

    await expect(
      createProvider(
        { body: { code: "PROV_001", name: "Acme", rfc: "SAC120101A12" } },
        mockFetch,
      ),
    ).rejects.toBeInstanceOf(ProviderCodeAlreadyInUseError);
  });

  it("throws ProviderRfcAlreadyInUseError on 409 with 'RFC already in use'", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Provider RFC already in use: SAC120101A12" }),
    } as Response);

    await expect(
      createProvider(
        { body: { code: "PROV_001", name: "Acme", rfc: "SAC120101A12" } },
        mockFetch,
      ),
    ).rejects.toBeInstanceOf(ProviderRfcAlreadyInUseError);
  });

  it("throws NetworkError on 400", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    } as Response);

    await expect(
      createProvider(
        { body: { code: "PROV_001", name: "Acme", rfc: "SAC120101A12" } },
        mockFetch,
      ),
    ).rejects.toBeInstanceOf(NetworkError);
  });
});

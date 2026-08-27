/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";

jest.mock("../../../../../app/(private)/billing/_logic/services/getEmitterFiscalSettings", () => ({
  getEmitterFiscalSettings: jest.fn(),
}));

import { useEmitterFiscalSettings } from "../../../../../app/(private)/billing/_logic/hooks/useEmitterFiscalSettings";
import { getEmitterFiscalSettings } from "../../../../../app/(private)/billing/_logic/services/getEmitterFiscalSettings";

const mockedGet = getEmitterFiscalSettings as jest.MockedFunction<typeof getEmitterFiscalSettings>;

describe("useEmitterFiscalSettings", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("starts with null fields, then resolves to the fetched issuer fiscal data", async () => {
    mockedGet.mockResolvedValue({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123",
    });

    const { result } = renderHook(() => useEmitterFiscalSettings());

    expect(result.current).toEqual({ rfc: null, fiscalRegime: null, zipCode: null, address: null });

    await waitFor(() =>
      expect(result.current).toEqual({ rfc: "AGR010101AB1", fiscalRegime: "601", zipCode: "83000", address: "Calle Falsa 123" })
    );
  });

  it("keeps null fields when the fetch fails, without throwing", async () => {
    mockedGet.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useEmitterFiscalSettings());

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    expect(result.current).toEqual({ rfc: null, fiscalRegime: null, zipCode: null, address: null });
  });
});

/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";

jest.mock("../../../../../app/(private)/billing/_logic/services/getInvoicePreviewSource", () => ({
  getInvoicePreviewSource: jest.fn(),
}));

jest.mock("../../../../../app/(private)/billing/_logic/services/getEmitterFiscalSettings", () => ({
  getEmitterFiscalSettings: jest.fn(),
}));

import { useInvoicePreview } from "../../../../../app/(private)/billing/_logic/hooks/useInvoicePreview";
import { getInvoicePreviewSource } from "../../../../../app/(private)/billing/_logic/services/getInvoicePreviewSource";
import { getEmitterFiscalSettings } from "../../../../../app/(private)/billing/_logic/services/getEmitterFiscalSettings";

const mockedSource = getInvoicePreviewSource as jest.MockedFunction<typeof getInvoicePreviewSource>;
const mockedEmitter = getEmitterFiscalSettings as jest.MockedFunction<typeof getEmitterFiscalSettings>;

const SOURCE = {
  sale: {
    branchName: "Matriz",
    customerId: "cust-1",
    items: [
      {
        productNameSnapshot: "Fertilizante",
        productCodeSnapshot: "SKU1",
        quantity: 1,
        unitPrice: 100,
        discountPct: 0,
        ivaRate: 0.16,
        iepsRate: 0,
      },
    ],
  },
  customer: {
    rfc: "XAXX010101000",
    name: "Cliente de prueba",
    cfdiUse: "G03",
    taxRegime: "601",
    taxZipCode: "45010",
  },
};

describe("useInvoicePreview", () => {
  beforeEach(() => {
    mockedSource.mockReset();
    mockedEmitter.mockReset();
  });

  it("resolves issuer fiscal data alongside the sale/customer source", async () => {
    mockedSource.mockResolvedValue(SOURCE);
    mockedEmitter.mockResolvedValue({
      rfc: "AGR010101AB1",
      legalName: "Agrisas SA de CV",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123",
    });

    const { result } = renderHook(() => useInvoicePreview());

    await act(async () => {
      await result.current.load("sale-1", { paymentForm: "01", paymentMethod: "PUE" });
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.issuer).toEqual({
      name: "Agrisas",
      branchName: "Matriz",
      rfc: "AGR010101AB1",
      fiscalRegime: "601",
      zipCode: "83000",
      address: "Calle Falsa 123",
    });
    expect(result.current.error).toBeNull();
  });

  it("issuer lookup failure does not block the preview — falls back to null fiscal fields", async () => {
    mockedSource.mockResolvedValue(SOURCE);
    mockedEmitter.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useInvoicePreview());

    await act(async () => {
      await result.current.load("sale-1", { paymentForm: "01", paymentMethod: "PUE" });
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
    expect(result.current.data!.issuer.rfc).toBeNull();
    expect(result.current.data!.issuer.fiscalRegime).toBeNull();
    expect(result.current.data!.issuer.zipCode).toBeNull();
    expect(result.current.data!.issuer.address).toBeNull();
  });
});

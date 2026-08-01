import { getCustomer } from "../../../../../../../app/(private)/catalogs/customers/_logic/services/getCustomer";
import { CustomerNotFoundError } from "../../../../../../../app/(private)/catalogs/customers/_logic/errors";

const baseDto = {
  id: "1",
  code: "CLI_001",
  name: "Cliente ACME",
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
  creditLimit: null,
  currentBalance: 0,
  creditDays: 30,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("getCustomer", () => {
  it("returns Customer with Date instances on 200", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await getCustomer({ id: "1" }, mockFetch);

    expect(result.id).toBe("1");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.creditDays).toBe(30);
  });

  it("throws CustomerNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Customer not found" }),
    } as Response);

    await expect(getCustomer({ id: "missing" }, mockFetch)).rejects.toBeInstanceOf(CustomerNotFoundError);
  });
});

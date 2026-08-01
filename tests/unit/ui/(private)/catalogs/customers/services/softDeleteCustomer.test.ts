import { softDeleteCustomer } from "../../../../../../../app/(private)/catalogs/customers/_logic/services/softDeleteCustomer";
import { CustomerNotFoundError } from "../../../../../../../app/(private)/catalogs/customers/_logic/errors";

describe("softDeleteCustomer", () => {
  it("resolves to void on 204", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response);

    await expect(softDeleteCustomer({ id: "1" }, mockFetch)).resolves.toBeUndefined();
  });

  it("throws CustomerNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Customer not found" }),
    } as Response);

    await expect(softDeleteCustomer({ id: "missing" }, mockFetch)).rejects.toBeInstanceOf(CustomerNotFoundError);
  });
});

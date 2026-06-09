import { createCustomer } from "../../../../../../../app/(private)/pos/_logic/services/createCustomer";
import {
  CustomerCodeAlreadyInUseError,
  CustomerRfcAlreadyInUseError,
} from "../../../../../../../app/(private)/pos/_logic/errors";

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const body = { code: "CLI001", name: "Test", rfc: "XAXX010101000" };

describe("createCustomer", () => {
  it("devuelve el CustomerDto en éxito", async () => {
    const dto = { id: "c1", code: "CLI001", name: "Test", rfc: "XAXX010101000", isActive: true, currentBalance: 0 };
    const fetch = mockFetch(201, dto);
    const result = await createCustomer(body, fetch as never);
    expect(result.id).toBe("c1");
  });

  it("mapea 409 con 'rfc' a CustomerRfcAlreadyInUseError", async () => {
    const fetch = mockFetch(409, { error: "RFC already in use" });
    await expect(createCustomer(body, fetch as never)).rejects.toBeInstanceOf(CustomerRfcAlreadyInUseError);
  });

  it("mapea 409 sin 'rfc' a CustomerCodeAlreadyInUseError", async () => {
    const fetch = mockFetch(409, { error: "Code already in use" });
    await expect(createCustomer(body, fetch as never)).rejects.toBeInstanceOf(CustomerCodeAlreadyInUseError);
  });
});

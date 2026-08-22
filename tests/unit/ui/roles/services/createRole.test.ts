import { createRole } from "../../../../../app/(private)/roles/_logic/services/createRole";
import { RoleAlreadyExistsError, ValidationError } from "../../../../../app/(private)/roles/_logic/types/domain";
import { NetworkError } from "../../../../../app/_lib/authFetch";

function makeFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    clone: () => ({ json: () => Promise.resolve(body) }),
  }) as unknown as typeof fetch;
}

describe("createRole service", () => {
  it("resolves with the created role on 201", async () => {
    const role = { id: "r1", name: "supervisor_almacen", description: null, createdAt: "", updatedAt: "" };
    await expect(
      createRole({ name: "supervisor_almacen" }, makeFetch(201, { role }) as never)
    ).resolves.toEqual(role);
  });

  it("throws RoleAlreadyExistsError on 409", async () => {
    await expect(
      createRole({ name: "duplicado" }, makeFetch(409, {}) as never)
    ).rejects.toThrow(RoleAlreadyExistsError);
  });

  it("throws ValidationError on 400", async () => {
    await expect(
      createRole({ name: "Bad Name" }, makeFetch(400, { error: "invalid" }) as never)
    ).rejects.toThrow(ValidationError);
  });

  it("throws NetworkError on 500", async () => {
    await expect(
      createRole({ name: "supervisor_almacen" }, makeFetch(500, {}) as never)
    ).rejects.toThrow(NetworkError);
  });
});

import { renderHook, act } from "@testing-library/react";
import { useUserMutations } from "../../../../../../app/(private)/users/_logic/hooks/useUserMutations";
import * as createModule from "../../../../../../app/(private)/users/_logic/services/createUser";
import * as updateModule from "../../../../../../app/(private)/users/_logic/services/updateUser";
import * as deleteModule from "../../../../../../app/(private)/users/_logic/services/deleteUser";
import * as assignModule from "../../../../../../app/(private)/users/_logic/services/assignRoleToUser";
import * as revokeModule from "../../../../../../app/(private)/users/_logic/services/revokeRoleFromUser";
import type { User } from "../../../../../../app/(private)/users/_logic/types/domain";

const BASE_USER: User = {
  id: "u1",
  name: "Original",
  email: "original@test.com",
  avatarUrl: "https://gravatar.com/avatar/abc",
  branchId: null,
  branchName: null,
  roles: ["viewer"],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const CATALOG = [
  { id: "r1", name: "admin" },
  { id: "r2", name: "viewer" },
  { id: "r3", name: "operator" },
];

describe("useUserMutations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saveUserDiff solo PATCH cuando cambia nombre", async () => {
    const spy = jest.spyOn(updateModule, "updateUser").mockResolvedValue({ ...BASE_USER, name: "Nuevo" });
    jest.spyOn(assignModule, "assignRoleToUser").mockResolvedValue();
    jest.spyOn(revokeModule, "revokeRoleFromUser").mockResolvedValue();

    const { result } = renderHook(() => useUserMutations());
    let res: User | null = null;
    await act(async () => {
      res = await result.current.saveUserDiff({
        userId: "u1",
        original: BASE_USER,
        edited: { name: "Nuevo", email: "original@test.com", avatarUrlInput: "", avatarReset: false, branchId: null, stagedRoleIds: new Set(["r2"]) },
        catalog: CATALOG,
      });
    });
    expect(spy).toHaveBeenCalledWith("u1", { name: "Nuevo" });
    expect(assignModule.assignRoleToUser).not.toHaveBeenCalled();
    expect((res as User | null)?.name).toBe("Nuevo");
  });

  it("saveUserDiff asigna y revoca roles sin PATCH si no cambian datos", async () => {
    jest.spyOn(updateModule, "updateUser");
    jest.spyOn(assignModule, "assignRoleToUser").mockResolvedValue();
    jest.spyOn(revokeModule, "revokeRoleFromUser").mockResolvedValue();

    const { result } = renderHook(() => useUserMutations());
    await act(async () => {
      await result.current.saveUserDiff({
        userId: "u1",
        original: BASE_USER,
        edited: { name: "Original", email: "original@test.com", avatarUrlInput: "", avatarReset: false, branchId: null, stagedRoleIds: new Set(["r1"]) },
        catalog: CATALOG,
      });
    });
    expect(updateModule.updateUser).not.toHaveBeenCalled();
    expect(assignModule.assignRoleToUser).toHaveBeenCalledWith("u1", "admin");
    expect(revokeModule.revokeRoleFromUser).toHaveBeenCalledWith("u1", "r2");
  });

  it("setea mutationError si updateUser falla", async () => {
    jest.spyOn(updateModule, "updateUser").mockRejectedValue(new Error("Email already in use"));

    const { result } = renderHook(() => useUserMutations());
    await act(async () => {
      await result.current.saveUserDiff({
        userId: "u1",
        original: BASE_USER,
        edited: { name: "Nuevo", email: "other@test.com", avatarUrlInput: "", avatarReset: false, branchId: null, stagedRoleIds: new Set(["r2"]) },
        catalog: CATALOG,
      });
    });
    expect(result.current.mutationError).toBe("Email already in use");
  });

  it("removeUser llama deleteUser y devuelve true", async () => {
    jest.spyOn(deleteModule, "deleteUser").mockResolvedValue();
    const { result } = renderHook(() => useUserMutations());
    let ok = false;
    await act(async () => { ok = await result.current.removeUser("u1"); });
    expect(ok).toBe(true);
  });

  it("removeUser devuelve false y setea error si falla", async () => {
    jest.spyOn(deleteModule, "deleteUser").mockRejectedValue(new Error("Not found"));
    const { result } = renderHook(() => useUserMutations());
    let ok = true;
    await act(async () => { ok = await result.current.removeUser("u1"); });
    expect(ok).toBe(false);
    expect(result.current.mutationError).toBe("Not found");
  });

  it("saveUserDiff incluye branchId en el PATCH cuando cambia", async () => {
    const spy = jest.spyOn(updateModule, "updateUser").mockResolvedValue({ ...BASE_USER, branchId: "b1", branchName: "Matriz" });
    jest.spyOn(assignModule, "assignRoleToUser").mockResolvedValue();
    jest.spyOn(revokeModule, "revokeRoleFromUser").mockResolvedValue();

    const { result } = renderHook(() => useUserMutations());
    await act(async () => {
      await result.current.saveUserDiff({
        userId: "u1",
        original: BASE_USER,
        edited: { name: "Original", email: "original@test.com", avatarUrlInput: "", avatarReset: false, branchId: "b1", stagedRoleIds: new Set(["r2"]) },
        catalog: CATALOG,
      });
    });
    expect(spy).toHaveBeenCalledWith("u1", { branchId: "b1" });
  });

  it("createNewUser llama al service createUser con roleIds y devuelve el usuario creado", async () => {
    const spy = jest.spyOn(createModule, "createUser").mockResolvedValue({ ...BASE_USER, id: "u2", branchId: "b1", branchName: "Matriz" });

    const { result } = renderHook(() => useUserMutations());
    let created: User | null = null;
    await act(async () => {
      created = await result.current.createNewUser({
        name: "Ana",
        email: "ana@test.com",
        password: "supersecret",
        avatarUrlInput: "",
        branchId: "b1",
        stagedRoleIds: new Set(["r2"]),
        catalog: CATALOG,
      });
    });
    expect(spy).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@test.com",
      password: "supersecret",
      avatarUrl: undefined,
      branchId: "b1",
      roleIds: ["r2"],
    });
    expect((created as User | null)?.id).toBe("u2");
  });

  it("createNewUser setea mutationError si createUser falla", async () => {
    jest.spyOn(createModule, "createUser").mockRejectedValue(new Error("Email already in use"));

    const { result } = renderHook(() => useUserMutations());
    let created: User | null = null;
    await act(async () => {
      created = await result.current.createNewUser({
        name: "Ana",
        email: "ana@test.com",
        password: "supersecret",
        avatarUrlInput: "",
        branchId: null,
        stagedRoleIds: new Set(),
        catalog: CATALOG,
      });
    });
    expect(created).toBeNull();
    expect(result.current.mutationError).toBe("Email already in use");
  });
});

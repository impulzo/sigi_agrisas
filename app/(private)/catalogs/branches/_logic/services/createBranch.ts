import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateBranchBody, BranchDto } from "../types/api";
import type { Branch } from "../types/domain";
import { BranchCodeAlreadyInUseError } from "../errors";
import { toBranch } from "./listBranches";

export async function createBranch(
  { body }: { body: CreateBranchBody },
  fetchImpl = authFetch
): Promise<Branch> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new BranchCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as BranchDto;
  return toBranch(data);
}

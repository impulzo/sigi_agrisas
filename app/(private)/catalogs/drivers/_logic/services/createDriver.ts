import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateDriverBody, DriverDto } from "../types/api";
import type { Driver } from "../types/domain";
import { DriverCodeAlreadyInUseError } from "../errors";
import { toDriver } from "./listDrivers";

export async function createDriver(
  { body }: { body: CreateDriverBody },
  fetchImpl = authFetch
): Promise<Driver> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new DriverCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as DriverDto;
  return toDriver(data);
}

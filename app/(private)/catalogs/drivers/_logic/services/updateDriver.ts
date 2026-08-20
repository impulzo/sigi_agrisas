import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { UpdateDriverBody, DriverDto } from "../types/api";
import type { Driver } from "../types/domain";
import { DriverNotFoundError } from "../errors";
import { toDriver } from "./listDrivers";

export async function updateDriver(
  { id, body }: { id: string; body: UpdateDriverBody },
  fetchImpl = authFetch
): Promise<Driver> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new DriverNotFoundError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as DriverDto;
  return toDriver(data);
}

import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { UpdateVehicleBody, VehicleDto } from "../types/api";
import type { Vehicle } from "../types/domain";
import { VehicleNotFoundError } from "../errors";
import { toVehicle } from "./listVehicles";

export async function updateVehicle(
  { id, body }: { id: string; body: UpdateVehicleBody },
  fetchImpl = authFetch
): Promise<Vehicle> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new VehicleNotFoundError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as VehicleDto;
  return toVehicle(data);
}

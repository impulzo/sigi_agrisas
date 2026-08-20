import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateVehicleBody, VehicleDto } from "../types/api";
import type { Vehicle } from "../types/domain";
import { VehicleCodeAlreadyInUseError } from "../errors";
import { toVehicle } from "./listVehicles";

export async function createVehicle(
  { body }: { body: CreateVehicleBody },
  fetchImpl = authFetch
): Promise<Vehicle> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new VehicleCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as VehicleDto;
  return toVehicle(data);
}

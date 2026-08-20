import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleDriverForm } from "../../../../../app/(private)/waybills/_blocks/VehicleDriverForm";
import { useVehiclesOptions } from "../../../../../app/_hooks/useVehiclesOptions";
import { useDriversOptions } from "../../../../../app/_hooks/useDriversOptions";
import type { VehicleInput, DriverInput } from "../../../../../app/(private)/waybills/_logic/types/domain";

jest.mock("../../../../../app/_hooks/useVehiclesOptions");
jest.mock("../../../../../app/_hooks/useDriversOptions");

const mockUseVehiclesOptions = useVehiclesOptions as jest.MockedFunction<typeof useVehiclesOptions>;
const mockUseDriversOptions = useDriversOptions as jest.MockedFunction<typeof useDriversOptions>;

const EMPTY_VEHICLE: VehicleInput = {
  vehicleId: null,
  plate: "",
  config: "",
  permitType: "",
  permitNumber: "",
  insuranceCompany: "",
  insurancePolicy: "",
};
const EMPTY_DRIVER: DriverInput = { driverId: null, name: "", rfc: "", licenseNumber: "" };

const VEHICLE_OPTION = {
  id: "v1",
  code: "VEH01",
  plate: "ABC-1234",
  vehicleConfig: "C2",
  permitType: "TPAF01",
  permitNumber: "SCT-999",
  insuranceCompany: "GNP",
  insurancePolicy: "POL-9988",
};

const DRIVER_OPTION = {
  id: "d1",
  code: "OP_001",
  name: "Juan Pérez",
  rfc: null,
  licenseNumber: "LIC-99887",
};

function setup(overrides?: { vehicle?: Partial<VehicleInput>; driver?: Partial<DriverInput> }) {
  mockUseVehiclesOptions.mockReturnValue({ options: [VEHICLE_OPTION], isLoading: false, refresh: jest.fn() });
  mockUseDriversOptions.mockReturnValue({ options: [DRIVER_OPTION], isLoading: false, refresh: jest.fn() });

  const onVehicleChange = jest.fn();
  const onDriverChange = jest.fn();
  const vehicle = { ...EMPTY_VEHICLE, ...overrides?.vehicle };
  const driver = { ...EMPTY_DRIVER, ...overrides?.driver };

  render(
    <VehicleDriverForm
      vehicle={vehicle}
      onVehicleChange={onVehicleChange as any}
      driver={driver}
      onDriverChange={onDriverChange as any}
    />
  );

  return { onVehicleChange, onDriverChange };
}

describe("VehicleDriverForm — selector de catálogo", () => {
  beforeEach(() => jest.clearAllMocks());

  it("seleccionar un vehículo del combobox autocompleta los 6 campos + vehicleId", async () => {
    const { onVehicleChange } = setup();

    fireEvent.focus(screen.getByLabelText("Seleccionar vehículo del catálogo"));
    fireEvent.mouseDown(await screen.findByText("VEH01 — ABC-1234"));

    expect(onVehicleChange).toHaveBeenCalledWith("vehicleId", "v1");
    expect(onVehicleChange).toHaveBeenCalledWith("plate", "ABC-1234");
    expect(onVehicleChange).toHaveBeenCalledWith("config", "C2");
    expect(onVehicleChange).toHaveBeenCalledWith("permitType", "TPAF01");
    expect(onVehicleChange).toHaveBeenCalledWith("permitNumber", "SCT-999");
    expect(onVehicleChange).toHaveBeenCalledWith("insuranceCompany", "GNP");
    expect(onVehicleChange).toHaveBeenCalledWith("insurancePolicy", "POL-9988");
  });

  it("seleccionar un operador del combobox autocompleta nombre/rfc/licencia + driverId", async () => {
    const { onDriverChange } = setup();

    fireEvent.focus(screen.getByLabelText("Seleccionar operador del catálogo"));
    fireEvent.mouseDown(await screen.findByText("OP_001 — Juan Pérez"));

    expect(onDriverChange).toHaveBeenCalledWith("driverId", "d1");
    expect(onDriverChange).toHaveBeenCalledWith("name", "Juan Pérez");
    expect(onDriverChange).toHaveBeenCalledWith("rfc", "");
    expect(onDriverChange).toHaveBeenCalledWith("licenseNumber", "LIC-99887");
  });

  it("editar la placa después de seleccionar del catálogo NO limpia vehicleId ni toca el catálogo", () => {
    const { onVehicleChange } = setup({ vehicle: { vehicleId: "v1", plate: "ABC-1234" } });

    fireEvent.change(screen.getByLabelText(/^Placa/), { target: { value: "ZZZ-0000" } });

    expect(onVehicleChange).toHaveBeenCalledWith("plate", "ZZZ-0000");
    expect(onVehicleChange).not.toHaveBeenCalledWith("vehicleId", expect.anything());
  });
});

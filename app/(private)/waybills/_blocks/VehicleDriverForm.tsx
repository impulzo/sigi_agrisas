"use client";

import { useState, useMemo } from "react";
import { Combobox, type ComboboxOption } from "../../../_components/molecules/Combobox/Combobox";
import { useVehiclesOptions, type VehicleOption } from "../../../_hooks/useVehiclesOptions";
import { useDriversOptions, type DriverOption } from "../../../_hooks/useDriversOptions";
import type { VehicleInput, DriverInput } from "../_logic/types/domain";

interface VehicleDriverFormProps {
  vehicle: VehicleInput;
  onVehicleChange: <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => void;
  driver: DriverInput;
  onDriverChange: <K extends keyof DriverInput>(key: K, value: DriverInput[K]) => void;
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-label-md text-on-surface mb-1">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function vehicleOptionLabel(v: VehicleOption): string {
  return `${v.code} — ${v.plate}`;
}

function driverOptionLabel(d: DriverOption): string {
  return `${d.code} — ${d.name}`;
}

export function VehicleDriverForm({ vehicle, onVehicleChange, driver, onDriverChange }: VehicleDriverFormProps) {
  const { options: vehicleOptions, isLoading: vehiclesLoading } = useVehiclesOptions();
  const { options: driverOptions, isLoading: driversLoading } = useDriversOptions();
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");

  const filteredVehicleOptions: ComboboxOption[] = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    const filtered = q
      ? vehicleOptions.filter((v) => vehicleOptionLabel(v).toLowerCase().includes(q))
      : vehicleOptions;
    return filtered.map((v) => ({ value: v.id, label: vehicleOptionLabel(v) }));
  }, [vehicleOptions, vehicleQuery]);

  const filteredDriverOptions: ComboboxOption[] = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    const filtered = q
      ? driverOptions.filter((d) => driverOptionLabel(d).toLowerCase().includes(q))
      : driverOptions;
    return filtered.map((d) => ({ value: d.id, label: driverOptionLabel(d) }));
  }, [driverOptions, driverQuery]);

  function handleSelectVehicle(id: string) {
    const selected = vehicleOptions.find((v) => v.id === id);
    if (!selected) return;
    onVehicleChange("vehicleId", selected.id);
    onVehicleChange("plate", selected.plate);
    onVehicleChange("config", selected.vehicleConfig);
    onVehicleChange("permitType", selected.permitType);
    onVehicleChange("permitNumber", selected.permitNumber);
    onVehicleChange("insuranceCompany", selected.insuranceCompany);
    onVehicleChange("insurancePolicy", selected.insurancePolicy);
  }

  function handleSelectDriver(id: string) {
    const selected = driverOptions.find((d) => d.id === id);
    if (!selected) return;
    onDriverChange("driverId", selected.id);
    onDriverChange("name", selected.name);
    onDriverChange("rfc", selected.rfc ?? "");
    onDriverChange("licenseNumber", selected.licenseNumber);
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-label-md font-semibold text-on-surface">
          Vehículo (autotransporte) <span className="text-error">*</span>
        </h3>
        <div>
          <label htmlFor="vehicle-picker" className="block text-label-md text-on-surface mb-1">
            Seleccionar vehículo del catálogo
          </label>
          <Combobox
            id="vehicle-picker"
            value={vehicle.vehicleId ?? ""}
            onChange={handleSelectVehicle}
            onSearch={setVehicleQuery}
            options={filteredVehicleOptions}
            isLoading={vehiclesLoading}
            placeholder="Buscar por código o placa..."
          />
        </div>
        <Field id="vehicle-plate" label="Placa" value={vehicle.plate} onChange={(v) => onVehicleChange("plate", v)} required />
        <Field
          id="vehicle-config"
          label="Configuración vehicular"
          value={vehicle.config}
          onChange={(v) => onVehicleChange("config", v)}
          required
          placeholder="Clave SAT c_ConfigAutotransporte"
        />
        <Field
          id="vehicle-permit-type"
          label="Tipo de permiso SCT"
          value={vehicle.permitType}
          onChange={(v) => onVehicleChange("permitType", v)}
          required
        />
        <Field
          id="vehicle-permit-number"
          label="Número de permiso SCT"
          value={vehicle.permitNumber}
          onChange={(v) => onVehicleChange("permitNumber", v)}
          required
        />
        <Field
          id="vehicle-insurance-company"
          label="Aseguradora"
          value={vehicle.insuranceCompany}
          onChange={(v) => onVehicleChange("insuranceCompany", v)}
          required
        />
        <Field
          id="vehicle-insurance-policy"
          label="Póliza"
          value={vehicle.insurancePolicy}
          onChange={(v) => onVehicleChange("insurancePolicy", v)}
          required
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-label-md font-semibold text-on-surface">
          Operador (figura de transporte) <span className="text-error">*</span>
        </h3>
        <div>
          <label htmlFor="driver-picker" className="block text-label-md text-on-surface mb-1">
            Seleccionar operador del catálogo
          </label>
          <Combobox
            id="driver-picker"
            value={driver.driverId ?? ""}
            onChange={handleSelectDriver}
            onSearch={setDriverQuery}
            options={filteredDriverOptions}
            isLoading={driversLoading}
            placeholder="Buscar por código o nombre..."
          />
        </div>
        <Field id="driver-name" label="Nombre" value={driver.name} onChange={(v) => onDriverChange("name", v)} required />
        <Field id="driver-rfc" label="RFC (opcional)" value={driver.rfc} onChange={(v) => onDriverChange("rfc", v)} />
        <Field
          id="driver-license"
          label="Número de licencia"
          value={driver.licenseNumber}
          onChange={(v) => onDriverChange("licenseNumber", v)}
          required
        />
      </div>
    </div>
  );
}

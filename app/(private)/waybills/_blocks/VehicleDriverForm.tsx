"use client";

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
        className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

export function VehicleDriverForm({ vehicle, onVehicleChange, driver, onDriverChange }: VehicleDriverFormProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-label-md font-semibold text-on-surface">
          Vehículo (autotransporte) <span className="text-error">*</span>
        </h3>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { Button } from "../../../../_components/atoms/Button/Button";
import { Switch } from "../../../../_components/atoms/Switch/Switch";
import { createVehicleSchema, updateVehicleSchema } from "../_logic/schemas/vehicle.schema";
import type { Vehicle } from "../_logic/types/domain";
import type { CreateVehicleBody, UpdateVehicleBody } from "../_logic/types/api";

interface VehicleEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  entity: Vehicle | null;
  isSaving: boolean;
  codeError: string | null;
  mutationError: string | null;
  onSave: (data: CreateVehicleBody | UpdateVehicleBody) => void;
  onClose: () => void;
}

export function VehicleEditModal({
  open,
  mode,
  entity,
  isSaving,
  codeError,
  mutationError,
  onSave,
  onClose,
}: VehicleEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [code, setCode] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleConfig, setVehicleConfig] = useState("");
  const [permitType, setPermitType] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => { e.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setCode("");
      setPlate("");
      setVehicleConfig("");
      setPermitType("");
      setPermitNumber("");
      setInsuranceCompany("");
      setInsurancePolicy("");
      setNotes("");
      setIsActive(true);
    } else if (entity) {
      setCode(entity.code);
      setPlate(entity.plate);
      setVehicleConfig(entity.vehicleConfig);
      setPermitType(entity.permitType);
      setPermitNumber(entity.permitNumber);
      setInsuranceCompany(entity.insuranceCompany);
      setInsurancePolicy(entity.insurancePolicy);
      setNotes(entity.notes ?? "");
      setIsActive(entity.isActive);
    }
    setValidationErrors({});
  }, [open, mode, entity]);

  function validate(): boolean {
    const payload = {
      plate,
      vehicleConfig,
      permitType,
      permitNumber,
      insuranceCompany,
      insurancePolicy,
      notes: notes || null,
      isActive,
    };
    const result =
      mode === "create"
        ? createVehicleSchema.safeParse({ code, ...payload })
        : updateVehicleSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) { const key = String(issue.path[0]); errs[key] = issue.message; }
      setValidationErrors(errs);
      return false;
    }
    setValidationErrors({});
    return true;
  }

  function getDiff(): UpdateVehicleBody {
    if (!entity) return {};
    const diff: UpdateVehicleBody = {};
    if (plate !== entity.plate) diff.plate = plate;
    if (vehicleConfig !== entity.vehicleConfig) diff.vehicleConfig = vehicleConfig;
    if (permitType !== entity.permitType) diff.permitType = permitType;
    if (permitNumber !== entity.permitNumber) diff.permitNumber = permitNumber;
    if (insuranceCompany !== entity.insuranceCompany) diff.insuranceCompany = insuranceCompany;
    if (insurancePolicy !== entity.insurancePolicy) diff.insurancePolicy = insurancePolicy;
    const newNotes = notes || null;
    if (newNotes !== entity.notes) diff.notes = newNotes;
    if (isActive !== entity.isActive) diff.isActive = isActive;
    return diff;
  }

  const isCreateMode = mode === "create";
  const isDirty = isCreateMode
    ? code !== "" ||
      plate !== "" ||
      vehicleConfig !== "" ||
      permitType !== "" ||
      permitNumber !== "" ||
      insuranceCompany !== "" ||
      insurancePolicy !== "" ||
      notes !== "" ||
      !isActive
    : entity !== null && Object.keys(getDiff()).length > 0;

  const isDiffEmpty = mode === "edit" && Object.keys(getDiff()).length === 0;

  function handleSave() {
    if (!validate()) return;
    if (isCreateMode) {
      onSave({
        code,
        plate,
        vehicleConfig,
        permitType,
        permitNumber,
        insuranceCompany,
        insurancePolicy,
        notes: notes || null,
        isActive,
      });
    } else {
      const diff = getDiff();
      if (Object.keys(diff).length === 0) return;
      onSave(diff);
    }
  }

  const title = isCreateMode ? "Nuevo vehículo" : "Editar vehículo";

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg bg-surface-container p-0 shadow-lg w-full max-w-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">{title}</h2>
        <Button type="button" variant="text" size="sm" onClick={onClose} className="!px-1.5">
          <Icon name="close" size={20} />
        </Button>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-code">Código</label>
          <input
            id="vehicle-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={!isCreateMode}
            placeholder="EJ. UNIT_001"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-surface-container"
          />
          {(validationErrors.code || codeError) && (
            <p className="text-label-sm text-error mt-1">{validationErrors.code ?? codeError}</p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-plate">Placa</label>
          <input
            id="vehicle-plate"
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="ABC-1234"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.plate && <p className="text-label-sm text-error mt-1">{validationErrors.plate}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-config">
            Configuración (SAT c_ConfigAutotransporte)
          </label>
          <input
            id="vehicle-config"
            type="text"
            value={vehicleConfig}
            onChange={(e) => setVehicleConfig(e.target.value)}
            placeholder="C2"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.vehicleConfig && <p className="text-label-sm text-error mt-1">{validationErrors.vehicleConfig}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-permit-type">
              Tipo de permiso
            </label>
            <input
              id="vehicle-permit-type"
              type="text"
              value={permitType}
              onChange={(e) => setPermitType(e.target.value)}
              placeholder="TPAF01"
              className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.permitType && <p className="text-label-sm text-error mt-1">{validationErrors.permitType}</p>}
          </div>
          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-permit-number">
              Número de permiso
            </label>
            <input
              id="vehicle-permit-number"
              type="text"
              value={permitNumber}
              onChange={(e) => setPermitNumber(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.permitNumber && <p className="text-label-sm text-error mt-1">{validationErrors.permitNumber}</p>}
          </div>
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-insurance-company">
            Aseguradora
          </label>
          <input
            id="vehicle-insurance-company"
            type="text"
            value={insuranceCompany}
            onChange={(e) => setInsuranceCompany(e.target.value)}
            placeholder="GNP"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.insuranceCompany && <p className="text-label-sm text-error mt-1">{validationErrors.insuranceCompany}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-insurance-policy">
            Póliza
          </label>
          <input
            id="vehicle-insurance-policy"
            type="text"
            value={insurancePolicy}
            onChange={(e) => setInsurancePolicy(e.target.value)}
            placeholder="POL-9988"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.insurancePolicy && <p className="text-label-sm text-error mt-1">{validationErrors.insurancePolicy}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="vehicle-notes">Notas</label>
          <textarea
            id="vehicle-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas opcionales"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onChange={setIsActive} aria-label="Activo" id="vehicle-isActive" />
          <label htmlFor="vehicle-isActive" className="text-label-lg text-on-surface-variant cursor-pointer">Activo</label>
        </div>

        {mutationError && (
          <p className="text-body-md text-error bg-error-container px-4 py-2 rounded">{mutationError}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <Button type="button" variant="outlined" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="filled"
          onClick={handleSave}
          loading={isSaving}
          disabled={!isDirty || isDiffEmpty || Object.keys(validationErrors).length > 0}
        >
          Guardar
        </Button>
      </div>
    </dialog>
  );
}

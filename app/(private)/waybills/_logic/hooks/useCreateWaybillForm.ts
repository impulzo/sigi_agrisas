"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createWaybill } from "../services";
import { createWaybillSchema } from "../schemas/createWaybill";
import { InsufficientStockAtOriginError } from "../errors";
import type { WaybillDetail, VehicleInput, DriverInput } from "../types/domain";
import type { CreateWaybillItemRequest } from "../types/api";

export interface WaybillLineState {
  _key: string;
  productId: string | null;
  description: string;
  satBienesTranspCode: string;
  satUnitCode: string;
  quantity: number;
  weightKg: number;
  isHazardousMaterial: boolean;
  hazardousMaterialCode: string;
  error?: string;
}

interface UseCreateWaybillFormResult {
  originBranchId: string;
  setOriginBranchId: (v: string) => void;
  destinationBranchId: string;
  setDestinationBranchId: (v: string) => void;
  vehicle: VehicleInput;
  setVehicleField: <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => void;
  driver: DriverInput;
  setDriverField: <K extends keyof DriverInput>(key: K, value: DriverInput[K]) => void;
  distanceKm: number;
  setDistanceKm: (v: number) => void;
  departureAt: string;
  setDepartureAt: (v: string) => void;
  arrivalAt: string;
  setArrivalAt: (v: string) => void;
  lines: WaybillLineState[];
  addLine: (line: Omit<WaybillLineState, "_key" | "error">) => void;
  updateLine: (key: string, patch: Partial<WaybillLineState>) => void;
  removeLine: (key: string) => void;
  isSubmitting: boolean;
  error: Error | null;
  clearError: () => void;
  submit: () => Promise<WaybillDetail | null>;
}

let keyCounter = 0;
function nextKey() {
  return `wb-line-${++keyCounter}`;
}

const EMPTY_VEHICLE: VehicleInput = {
  plate: "",
  config: "",
  permitType: "",
  permitNumber: "",
  insuranceCompany: "",
  insurancePolicy: "",
};
const EMPTY_DRIVER: DriverInput = { name: "", rfc: "", licenseNumber: "" };

export function useCreateWaybillForm(): UseCreateWaybillFormResult {
  const router = useRouter();

  const [originBranchId, setOriginBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleInput>(EMPTY_VEHICLE);
  const [driver, setDriver] = useState<DriverInput>(EMPTY_DRIVER);
  const [distanceKm, setDistanceKm] = useState(0);
  const [departureAt, setDepartureAt] = useState("");
  const [arrivalAt, setArrivalAt] = useState("");
  const [lines, setLines] = useState<WaybillLineState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const setVehicleField = useCallback(<K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => {
    setVehicle((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setDriverField = useCallback(<K extends keyof DriverInput>(key: K, value: DriverInput[K]) => {
    setDriver((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addLine = useCallback((line: Omit<WaybillLineState, "_key" | "error">) => {
    setLines((prev) => [...prev, { ...line, _key: nextKey() }]);
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<WaybillLineState>) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch, error: undefined } : l)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }, []);

  const submit = useCallback(async (): Promise<WaybillDetail | null> => {
    setError(null);

    const items: CreateWaybillItemRequest[] = lines.map((l) => ({
      productId: l.productId,
      description: l.description,
      satBienesTranspCode: l.satBienesTranspCode,
      satUnitCode: l.satUnitCode,
      quantity: l.quantity,
      weightKg: l.weightKg,
      isHazardousMaterial: l.isHazardousMaterial,
      hazardousMaterialCode: l.hazardousMaterialCode || null,
    }));

    const parsed = createWaybillSchema.safeParse({
      originBranchId,
      destinationBranchId,
      vehicle,
      driver: { name: driver.name, rfc: driver.rfc || null, licenseNumber: driver.licenseNumber },
      distanceKm,
      departureAt,
      arrivalAt,
      items,
    });

    if (!parsed.success) {
      setError(new Error(parsed.error.issues[0]?.message ?? "Datos inválidos"));
      return null;
    }

    setIsSubmitting(true);
    try {
      const result = await createWaybill(parsed.data);
      router.push(`/waybills/${result.id}`);
      return result;
    } catch (err) {
      if (err instanceof InsufficientStockAtOriginError) {
        const offendingProductId = err.productId;
        setLines((prev) =>
          prev.map((l) =>
            l.productId === offendingProductId
              ? { ...l, error: "Stock insuficiente en la sucursal de origen" }
              : l
          )
        );
      }
      setError(err as Error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [originBranchId, destinationBranchId, vehicle, driver, distanceKm, departureAt, arrivalAt, lines, router]);

  return {
    originBranchId,
    setOriginBranchId,
    destinationBranchId,
    setDestinationBranchId,
    vehicle,
    setVehicleField,
    driver,
    setDriverField,
    distanceKm,
    setDistanceKm,
    departureAt,
    setDepartureAt,
    arrivalAt,
    setArrivalAt,
    lines,
    addLine,
    updateLine,
    removeLine,
    isSubmitting,
    error,
    clearError,
    submit,
  };
}

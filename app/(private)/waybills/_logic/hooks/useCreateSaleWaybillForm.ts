"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createWaybill } from "../services";
import { createSaleWaybillSchema } from "../schemas/createSaleWaybill";
import { ProductNotFoundForTransferError } from "../errors";
import type { WaybillDetail, VehicleInput, DriverInput } from "../types/domain";
import type { CreateCartaPorteWaybillItemRequest } from "../types/api";
import type { WaybillLineState } from "./useCreateWaybillForm";
import type { SaleDetail } from "../../../sales/_logic/types/domain";

interface UseCreateSaleWaybillFormResult {
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
  updateLine: (key: string, patch: Partial<WaybillLineState>) => void;
  isSubmitting: boolean;
  error: Error | null;
  clearError: () => void;
  submit: () => Promise<WaybillDetail | null>;
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

export function useCreateSaleWaybillForm(sale: SaleDetail): UseCreateSaleWaybillFormResult {
  const router = useRouter();

  const initialLines = useMemo<WaybillLineState[]>(
    () =>
      sale.items.map((item) => ({
        _key: item.id,
        productId: item.productId,
        description: item.productNameSnapshot,
        satBienesTranspCode: "",
        satUnitCode: "",
        quantity: item.quantity,
        weightKg: 0,
        isHazardousMaterial: false,
        hazardousMaterialCode: "",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [vehicle, setVehicle] = useState<VehicleInput>(EMPTY_VEHICLE);
  const [driver, setDriver] = useState<DriverInput>(EMPTY_DRIVER);
  const [distanceKm, setDistanceKm] = useState(0);
  const [departureAt, setDepartureAt] = useState("");
  const [arrivalAt, setArrivalAt] = useState("");
  const [lines, setLines] = useState<WaybillLineState[]>(initialLines);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const setVehicleField = useCallback(<K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => {
    setVehicle((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setDriverField = useCallback(<K extends keyof DriverInput>(key: K, value: DriverInput[K]) => {
    setDriver((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<WaybillLineState>) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch, error: undefined } : l)));
  }, []);

  const submit = useCallback(async (): Promise<WaybillDetail | null> => {
    setError(null);

    const payload = {
      type: "carta_porte" as const,
      saleId: sale.id,
      vehicle,
      driver: { name: driver.name, rfc: driver.rfc || null, licenseNumber: driver.licenseNumber },
      distanceKm,
      departureAt,
      arrivalAt,
      items: lines.map(
        (l): CreateCartaPorteWaybillItemRequest => ({
          productId: l.productId,
          description: l.description,
          satBienesTranspCode: l.satBienesTranspCode,
          satUnitCode: l.satUnitCode,
          quantity: l.quantity,
          weightKg: l.weightKg,
          isHazardousMaterial: l.isHazardousMaterial,
          hazardousMaterialCode: l.hazardousMaterialCode || null,
        })
      ),
    };

    const parsed = createSaleWaybillSchema.safeParse(payload);

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
      if (err instanceof ProductNotFoundForTransferError) {
        const offendingProductId = err.productId;
        setLines((prev) =>
          prev.map((l) =>
            l.productId === offendingProductId ? { ...l, error: "Producto no encontrado en el catálogo" } : l
          )
        );
      }
      setError(err as Error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [sale.id, vehicle, driver, distanceKm, departureAt, arrivalAt, lines, router]);

  return {
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
    updateLine,
    isSubmitting,
    error,
    clearError,
    submit,
  };
}

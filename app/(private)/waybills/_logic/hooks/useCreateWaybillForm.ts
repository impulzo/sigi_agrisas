"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createWaybill } from "../services";
import { createWaybillSchema } from "../schemas/createWaybill";
import { InsufficientStockAtOriginError, ProductNotFoundForTransferError } from "../errors";
import type { WaybillDetail } from "../types/domain";
import type { CreateSimpleWaybillItemRequest } from "../types/api";

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
  transferDate: string;
  setTransferDate: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  originBranchId: string;
  setOriginBranchId: (v: string) => void;
  destinationBranchId: string;
  setDestinationBranchId: (v: string) => void;
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

export function useCreateWaybillForm(): UseCreateWaybillFormResult {
  const router = useRouter();

  const [transferDate, setTransferDate] = useState("");
  const [notes, setNotes] = useState("");
  const [originBranchId, setOriginBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [lines, setLines] = useState<WaybillLineState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

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

    const payload = {
      type: "simple" as const,
      originBranchId,
      destinationBranchId,
      transferDate,
      notes: notes || null,
      items: lines.map(
        (l): CreateSimpleWaybillItemRequest => ({
          productId: l.productId ?? "",
          description: l.description,
          quantity: l.quantity,
        })
      ),
    };

    const parsed = createWaybillSchema.safeParse(payload);

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
  }, [originBranchId, destinationBranchId, transferDate, notes, lines, router]);

  return {
    transferDate,
    setTransferDate,
    notes,
    setNotes,
    originBranchId,
    setOriginBranchId,
    destinationBranchId,
    setDestinationBranchId,
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

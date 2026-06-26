"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { SaleDetail, SaleItem } from "../../../../(private)/sales/_logic/types/domain";
import { ReturnQuantityExceedsRemainingError, SaleNotReturnableError } from "../errors";
import { createReturn } from "../services";
import type { ReturnDetail } from "../types/domain";

interface LineState {
  saleItemId: string;
  quantity: number;
  remaining: number;
  error?: string;
}

interface UseCreateReturnFormResult {
  lines: LineState[];
  reason: string;
  returnedAt: string;
  notes: string;
  isSubmitting: boolean;
  validationError: string | null;
  reasonError: string | null;
  setReason: (v: string) => void;
  setReturnedAt: (v: string) => void;
  setNotes: (v: string) => void;
  updateLine: (saleItemId: string, quantity: number) => void;
  submit: () => Promise<ReturnDetail | null>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useCreateReturnForm(
  sale: SaleDetail | null,
  onSuccess?: (ret: ReturnDetail) => void,
  onQuantityError?: (saleItemId: string) => void,
): UseCreateReturnFormResult {
  const initialLines = useMemo<LineState[]>(() => {
    if (!sale) return [];
    return sale.items.map((item: SaleItem) => {
      const returnedQty = sale.returnedQuantityBySaleItem[item.id] ?? 0;
      const remaining = Math.max(0, item.quantity - returnedQty);
      return { saleItemId: item.id, quantity: 0, remaining };
    });
  }, [sale]);

  const [lines, setLines] = useState<LineState[]>(initialLines);

  // Re-sync lines when the sale loads (useState ignores updates to initialLines after mount)
  useEffect(() => {
    if (sale) setLines(initialLines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?.id]);

  const [reason, setReasonRaw] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [returnedAt, setReturnedAt] = useState(todayIso());
  const [notes, setNotes] = useState("");

  const setReason = useCallback((v: string) => {
    setReasonRaw(v);
    setReasonError(null);
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateLine = useCallback((saleItemId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.saleItemId !== saleItemId) return l;
        let error: string | undefined;
        if (quantity < 0) {
          error = "La cantidad no puede ser negativa";
        } else if (quantity > l.remaining) {
          error = `Máximo disponible: ${l.remaining}`;
        }
        return { ...l, quantity, error };
      })
    );
  }, []);

  const validationError = useMemo<string | null>(() => {
    if (lines.some((l) => l.error)) return "Hay cantidades inválidas";
    if (lines.every((l) => l.quantity === 0)) return "Selecciona al menos un producto";
    return null;
  }, [lines]);

  const submit = useCallback(async (): Promise<ReturnDetail | null> => {
    if (!sale || validationError) return null;
    if (reason.trim().length < 3) {
      setReasonError("El motivo es obligatorio (mín. 3 caracteres)");
      return null;
    }
    setReasonError(null);
    const items = lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({ saleItemId: l.saleItemId, quantity: l.quantity }));

    setIsSubmitting(true);
    try {
      const result = await createReturn({
        saleId: sale.id,
        reason,
        returnedAt: new Date(returnedAt).toISOString(),
        notes: notes.trim() || null,
        items,
      });
      onSuccess?.(result);
      return result;
    } catch (err) {
      if (err instanceof ReturnQuantityExceedsRemainingError) {
        setLines((prev) =>
          prev.map((l) =>
            l.saleItemId === (err as ReturnQuantityExceedsRemainingError).saleItemId
              ? { ...l, error: `Máximo disponible: ${(err as ReturnQuantityExceedsRemainingError).remaining}` }
              : l
          )
        );
        onQuantityError?.((err as ReturnQuantityExceedsRemainingError).saleItemId);
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [sale, validationError, lines, reason, returnedAt, notes, onSuccess, onQuantityError]);

  return {
    lines,
    reason,
    returnedAt,
    notes,
    isSubmitting,
    validationError,
    reasonError,
    setReason,
    setReturnedAt,
    setNotes,
    updateLine,
    submit,
  };
}

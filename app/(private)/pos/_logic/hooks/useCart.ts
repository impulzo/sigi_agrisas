"use client";

import { useReducer, useCallback } from "react";
import { computeTotalsClient } from "../lib/computeTotalsClient";
import type { CartLine, CartState } from "../types/domain";
import type { ProductDto, ProductPriceDto } from "../types/api";

type CartAction =
  | { type: "ADD_LINE"; product: ProductDto; price: ProductPriceDto; quantity: number; discountPct: number }
  | { type: "UPDATE_QUANTITY"; lineId: string; quantity: number }
  | { type: "UPDATE_DISCOUNT"; lineId: string; discountPct: number }
  | { type: "CHANGE_TIER"; lineId: string; price: ProductPriceDto }
  | { type: "REMOVE_LINE"; lineId: string }
  | { type: "CLEAR" };

function recompute(lines: Omit<CartLine, "lineSubtotal" | "lineIva" | "lineIeps" | "lineTotal">[]): CartLine[] {
  const totals = computeTotalsClient(
    lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      ivaRate: l.ivaRate,
      iepsRate: l.iepsRate,
    }))
  );
  return lines.map((l, i) => ({
    ...l,
    lineSubtotal: totals.lines[i].lineSubtotal,
    lineIva: totals.lines[i].lineIva,
    lineIeps: totals.lines[i].lineIeps,
    lineTotal: totals.lines[i].lineTotal,
  }));
}

function buildState(lines: Omit<CartLine, "lineSubtotal" | "lineIva" | "lineIeps" | "lineTotal">[]): CartState {
  const recomputed = recompute(lines);
  const totals = computeTotalsClient(
    recomputed.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      ivaRate: l.ivaRate,
      iepsRate: l.iepsRate,
    }))
  );
  return { lines: recomputed, totals: { subtotal: totals.subtotal, taxTotal: totals.taxTotal, total: totals.total } };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_LINE": {
      const existing = state.lines.find(
        (l) => l.productId === action.product.id && l.productPriceId === action.price.id
      );
      if (existing) {
        const updated = state.lines.map((l) =>
          l.id === existing.id ? { ...l, quantity: l.quantity + action.quantity } : l
        );
        return buildState(updated);
      }
      const newLine = {
        id: crypto.randomUUID(),
        productId: action.product.id,
        productCode: action.product.code,
        productName: action.product.name,
        productPriceId: action.price.id,
        priceName: action.price.name,
        unitPrice: action.price.price,
        ivaRate: action.product.ivaRate ?? 0,
        iepsRate: action.product.iepsRate ?? 0,
        quantity: action.quantity,
        discountPct: action.discountPct,
      };
      return buildState([...state.lines, newLine]);
    }
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) return state;
      const updated = state.lines.map((l) =>
        l.id === action.lineId ? { ...l, quantity: action.quantity } : l
      );
      return buildState(updated);
    }
    case "UPDATE_DISCOUNT": {
      const discount = Math.max(0, Math.min(100, action.discountPct));
      const updated = state.lines.map((l) =>
        l.id === action.lineId ? { ...l, discountPct: discount } : l
      );
      return buildState(updated);
    }
    case "CHANGE_TIER": {
      const updated = state.lines.map((l) =>
        l.id === action.lineId
          ? { ...l, productPriceId: action.price.id, priceName: action.price.name, unitPrice: action.price.price }
          : l
      );
      return buildState(updated);
    }
    case "REMOVE_LINE": {
      const updated = state.lines.filter((l) => l.id !== action.lineId);
      return buildState(updated);
    }
    case "CLEAR":
      return buildState([]);
    default:
      return state;
  }
}

const EMPTY_STATE: CartState = buildState([]);

export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_STATE);

  const addLine = useCallback(
    (product: ProductDto, price: ProductPriceDto, quantity: number, discountPct = 0) => {
      dispatch({ type: "ADD_LINE", product, price, quantity, discountPct });
    },
    []
  );

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", lineId, quantity });
  }, []);

  const updateDiscountPct = useCallback((lineId: string, discountPct: number) => {
    dispatch({ type: "UPDATE_DISCOUNT", lineId, discountPct });
  }, []);

  const changeTier = useCallback((lineId: string, price: ProductPriceDto) => {
    dispatch({ type: "CHANGE_TIER", lineId, price });
  }, []);

  const removeLine = useCallback((lineId: string) => {
    dispatch({ type: "REMOVE_LINE", lineId });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  return {
    lines: state.lines,
    totals: state.totals,
    addLine,
    updateQuantity,
    updateDiscountPct,
    changeTier,
    removeLine,
    clear,
  };
}

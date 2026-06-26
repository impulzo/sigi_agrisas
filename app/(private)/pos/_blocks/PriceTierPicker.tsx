"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import type { ProductDto, ProductPriceDto } from "../_logic/types/api";

interface PriceTierPickerProps {
  product: ProductDto;
  prices: ProductPriceDto[];
  isLoading: boolean;
  initialQuantity?: number;
  initialDiscountPct?: number;
  onConfirm: (price: ProductPriceDto, quantity: number, discountPct: number) => void;
  onClose: () => void;
}

export function PriceTierPicker({
  product,
  prices,
  isLoading,
  initialQuantity = 1,
  initialDiscountPct = 0,
  onConfirm,
  onClose,
}: PriceTierPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const defaultPrice = prices.find((p) => p.isDefault) ?? prices[0] ?? null;
  const [selectedPriceId, setSelectedPriceId] = useState<string>(defaultPrice?.id ?? "");
  const [quantity, setQuantity] = useState(initialQuantity);
  const [discountPct, setDiscountPct] = useState(initialDiscountPct);

  const selectedPrice = prices.find((p) => p.id === selectedPriceId) ?? null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Auto-focus quantity input when prices load
  useEffect(() => {
    if (!isLoading && prices.length > 0) {
      quantityInputRef.current?.focus();
    }
  }, [isLoading, prices.length]);

  function handleConfirm() {
    if (!selectedPrice || quantity <= 0) return;
    onConfirm(selectedPrice, quantity, discountPct);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl backdrop:bg-black/40 open:flex open:flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-title-md font-semibold text-on-surface">{product.name}</h2>
          <p className="text-label-sm text-on-surface-variant font-mono">{product.code}</p>
        </div>
        <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <Icon name="close" size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : prices.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant py-4">
          Este producto no tiene precios configurados.
        </p>
      ) : (
        <>
          <p className="text-label-md text-on-surface-variant mb-2">Selecciona un precio</p>
          <div className="space-y-2 mb-4">
            {prices.map((price) => (
              <button
                key={price.id}
                type="button"
                onClick={() => setSelectedPriceId(price.id)}
                className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  selectedPriceId === price.id
                    ? "border-primary bg-primary-container text-on-primary-container"
                    : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <div>
                  <p className="text-body-sm font-medium">{price.name}</p>
                  {price.minQuantity > 1 && (
                    <p className="text-label-sm text-on-surface-variant">Mín. {price.minQuantity} uds.</p>
                  )}
                </div>
                <span className="text-body-md font-semibold tabular-nums">
                  {formatMxCurrency(price.price)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-label-sm text-on-surface-variant mb-1 block">Cantidad</label>
              <input
                ref={quantityInputRef}
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v > 0) setQuantity(v);
                }}
                className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-label-sm text-on-surface-variant mb-1 block">Descuento %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPct}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setDiscountPct(Math.max(0, Math.min(100, v)));
                }}
                className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-outline py-2 text-body-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedPrice || quantity <= 0}
              className="flex-1 rounded-full bg-primary py-2 text-body-sm font-medium text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Añadir al carrito
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

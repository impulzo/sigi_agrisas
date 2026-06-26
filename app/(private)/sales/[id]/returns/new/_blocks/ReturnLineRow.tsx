"use client";

interface ReturnLineRowProps {
  productName: string;
  maxQuantity: number;
  value: number;
  error?: string;
  onChange: (qty: number) => void;
}

export function ReturnLineRow({ productName, maxQuantity, value, error, onChange }: ReturnLineRowProps) {
  if (maxQuantity === 0) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="inline-flex items-center rounded-full bg-surface-container px-2.5 py-0.5 text-label-sm text-on-surface-variant">
          Devuelto
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="number"
        min={0}
        max={maxQuantity}
        step="0.0001"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 rounded-md border border-outline px-2 py-1 text-body-sm text-right tabular-nums bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        aria-label={`Cantidad a devolver de ${productName}`}
      />
      <p className="text-label-sm text-on-surface-variant text-right">
        Disponible: {maxQuantity}
      </p>
      {error && (
        <p className="text-label-sm text-error text-right">{error}</p>
      )}
    </div>
  );
}

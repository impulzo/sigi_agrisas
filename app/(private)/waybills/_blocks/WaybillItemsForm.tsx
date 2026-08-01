"use client";

import { useState } from "react";
import { ProductCatalogPanel } from "../../pos/_blocks/ProductCatalogPanel";
import { WaybillLineRow } from "./WaybillLineRow";
import type { WaybillLineState } from "../_logic/hooks/useCreateWaybillForm";
import type { ProductDto } from "../../pos/_logic/types/api";
import type { WaybillType } from "../_logic/types/api";

interface WaybillItemsFormProps {
  type: WaybillType;
  lines: WaybillLineState[];
  addLine: (line: Omit<WaybillLineState, "_key" | "error">) => void;
  updateLine: (key: string, patch: Partial<WaybillLineState>) => void;
  removeLine: (key: string) => void;
}

export function WaybillItemsForm({ type, lines, addLine, updateLine, removeLine }: WaybillItemsFormProps) {
  const [showCatalog, setShowCatalog] = useState(false);
  const isSimple = type === "simple";

  function handleAddProduct(product: ProductDto) {
    addLine({
      productId: product.id,
      description: product.name,
      satBienesTranspCode: "",
      satUnitCode: "",
      quantity: 1,
      weightKg: 0,
      isHazardousMaterial: false,
      hazardousMaterialCode: "",
    });
    setShowCatalog(false);
  }

  function handleAddFreeLine() {
    addLine({
      productId: null,
      description: "",
      satBienesTranspCode: "",
      satUnitCode: "",
      quantity: 1,
      weightKg: 0,
      isHazardousMaterial: false,
      hazardousMaterialCode: "",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-label-md font-semibold text-on-surface">
          Mercancías <span className="text-error">*</span>
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCatalog((v) => !v)}
            className="rounded-full border border-outline px-3 py-1 text-label-sm hover:bg-surface-container transition-colors"
          >
            + Catálogo
          </button>
          {!isSimple && (
            <button
              type="button"
              onClick={handleAddFreeLine}
              className="rounded-full border border-outline px-3 py-1 text-label-sm hover:bg-surface-container transition-colors"
            >
              + Línea libre
            </button>
          )}
        </div>
      </div>

      {showCatalog && (
        <div className="border border-outline-variant rounded-xl overflow-hidden mb-4">
          <ProductCatalogPanel onAddProduct={handleAddProduct} />
        </div>
      )}

      {lines.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant rounded-xl">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
                <th className="px-2 py-2 text-left font-medium">Descripción</th>
                {!isSimple && <th className="px-2 py-2 text-left font-medium w-32">Clave SAT</th>}
                {!isSimple && <th className="px-2 py-2 text-left font-medium w-24">Unidad</th>}
                <th className="px-2 py-2 text-right font-medium w-20">Cant.</th>
                {!isSimple && <th className="px-2 py-2 text-right font-medium w-24">Peso (kg)</th>}
                {!isSimple && <th className="px-2 py-2 text-left font-medium w-24">Peligroso</th>}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <WaybillLineRow
                  key={line._key}
                  type={type}
                  line={line}
                  onUpdate={(patch) => updateLine(line._key, patch)}
                  onRemove={() => removeLine(line._key)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant py-4 text-center border border-outline-variant border-dashed rounded-xl">
          {isSimple ? "Sin mercancías. Agrega del catálogo." : "Sin mercancías. Agrega del catálogo o como línea libre."}
        </p>
      )}
    </div>
  );
}

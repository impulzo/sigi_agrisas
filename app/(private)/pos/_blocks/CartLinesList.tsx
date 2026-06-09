"use client";

import { CartLine } from "./CartLine";
import type { CartLine as CartLineType } from "../_logic/types/domain";
import type { ProductPriceDto } from "../_logic/types/api";

interface CartLinesListProps {
  lines: CartLineType[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, pct: number) => void;
  onChangeTier: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CartLinesList({
  lines,
  onUpdateQuantity,
  onUpdateDiscount,
  onChangeTier,
  onRemove,
}: CartLinesListProps) {
  if (lines.length === 0) {
    return (
      <div className="py-8 text-center text-body-sm text-on-surface-variant">
        El carrito está vacío
      </div>
    );
  }

  return (
    <div className="divide-y divide-outline-variant">
      {lines.map((line) => (
        <CartLine
          key={line.id}
          line={line}
          onUpdateQuantity={onUpdateQuantity}
          onUpdateDiscount={onUpdateDiscount}
          onChangeTier={onChangeTier}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

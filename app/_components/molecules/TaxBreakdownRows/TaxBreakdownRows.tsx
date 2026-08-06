interface TaxBreakdownRowsProps {
  ivaTotal: number;
  iepsTotal: number;
  format: (n: number) => string;
  variant: "sale" | "quote" | "compact";
}

const ROW_CLASS: Record<"sale" | "quote", string> = {
  sale: "flex justify-between text-body-sm",
  quote: "flex justify-between gap-8",
};

export function TaxBreakdownRows({ ivaTotal, iepsTotal, format, variant }: TaxBreakdownRowsProps) {
  if (variant === "compact") {
    return (
      <>
        <p className="text-body-sm text-on-surface-variant tabular-nums">IVA {format(ivaTotal)}</p>
        <p className="text-body-sm text-on-surface-variant tabular-nums">IEPS {format(iepsTotal)}</p>
      </>
    );
  }

  const rowClass = ROW_CLASS[variant];
  const labelClass = variant === "sale" ? "text-on-surface-variant" : "text-body-sm text-on-surface-variant";

  return (
    <>
      <div className={rowClass}>
        <span className={labelClass}>IVA</span>
        <span className="tabular-nums">{format(ivaTotal)}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>IEPS</span>
        <span className="tabular-nums">{format(iepsTotal)}</span>
      </div>
    </>
  );
}

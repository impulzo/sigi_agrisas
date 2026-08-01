interface KardexHeaderCardsProps {
  existenciaTotal: number;
  existenciaAlmacen: number;
  saldoAnterior: number;
  saldoFinal: number;
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-[160px] rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="text-headline-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

export function KardexHeaderCards({
  existenciaTotal,
  existenciaAlmacen,
  saldoAnterior,
  saldoFinal,
}: KardexHeaderCardsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Card label="Existencia total" value={existenciaTotal} />
      <Card label="Existencia almacén" value={existenciaAlmacen} />
      <Card label="Saldo anterior" value={saldoAnterior} />
      <Card label="Saldo final" value={saldoFinal} />
    </div>
  );
}

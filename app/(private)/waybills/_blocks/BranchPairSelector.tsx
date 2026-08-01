"use client";

interface BranchOption {
  id: string;
  name: string;
}

interface BranchPairSelectorProps {
  originBranchId: string;
  onOriginChange: (v: string) => void;
  destinationBranchId: string;
  onDestinationChange: (v: string) => void;
  branches: BranchOption[];
}

export function BranchPairSelector({
  originBranchId,
  onOriginChange,
  destinationBranchId,
  onDestinationChange,
  branches,
}: BranchPairSelectorProps) {
  const originOptions = branches.filter((b) => b.id !== destinationBranchId);
  const destinationOptions = branches.filter((b) => b.id !== originBranchId);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="waybill-origin" className="block text-label-md text-on-surface mb-1">
          Sucursal de origen <span className="text-error">*</span>
        </label>
        <select
          id="waybill-origin"
          value={originBranchId}
          onChange={(e) => onOriginChange(e.target.value)}
          className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Selecciona sucursal de origen</option>
          {originOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="waybill-destination" className="block text-label-md text-on-surface mb-1">
          Sucursal de destino <span className="text-error">*</span>
        </label>
        <select
          id="waybill-destination"
          value={destinationBranchId}
          onChange={(e) => onDestinationChange(e.target.value)}
          className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Selecciona sucursal de destino</option>
          {destinationOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

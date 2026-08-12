"use client";

interface ScheduleFieldsProps {
  departureAt: string;
  onDepartureAtChange: (v: string) => void;
  arrivalAt: string;
  onArrivalAtChange: (v: string) => void;
  distanceKm: number;
  onDistanceKmChange: (v: number) => void;
}

export function ScheduleFields({
  departureAt,
  onDepartureAtChange,
  arrivalAt,
  onArrivalAtChange,
  distanceKm,
  onDistanceKmChange,
}: ScheduleFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="waybill-departure" className="block text-label-md text-on-surface mb-1">
          Salida (estimada) <span className="text-error">*</span>
        </label>
        <input
          id="waybill-departure"
          type="datetime-local"
          value={departureAt}
          onChange={(e) => onDepartureAtChange(e.target.value)}
          className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="waybill-arrival" className="block text-label-md text-on-surface mb-1">
          Llegada (estimada) <span className="text-error">*</span>
        </label>
        <input
          id="waybill-arrival"
          type="datetime-local"
          value={arrivalAt}
          onChange={(e) => onArrivalAtChange(e.target.value)}
          className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="waybill-distance" className="block text-label-md text-on-surface mb-1">
          Distancia (km) <span className="text-error">*</span>
        </label>
        <input
          id="waybill-distance"
          type="number"
          min={0.01}
          step="0.01"
          value={distanceKm}
          onChange={(e) => onDistanceKmChange(Number(e.target.value))}
          className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary tabular-nums"
        />
      </div>
    </div>
  );
}

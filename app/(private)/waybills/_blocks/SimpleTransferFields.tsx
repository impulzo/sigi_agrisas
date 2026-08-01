"use client";

interface SimpleTransferFieldsProps {
  transferDate: string;
  onTransferDateChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}

export function SimpleTransferFields({
  transferDate,
  onTransferDateChange,
  notes,
  onNotesChange,
}: SimpleTransferFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="waybill-transfer-date" className="block text-label-md text-on-surface mb-1">
          Fecha de traspaso <span className="text-error">*</span>
        </label>
        <input
          id="waybill-transfer-date"
          type="datetime-local"
          value={transferDate}
          onChange={(e) => onTransferDateChange(e.target.value)}
          className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="waybill-notes" className="block text-label-md text-on-surface mb-1">
          Notas (opcional)
        </label>
        <input
          id="waybill-notes"
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Motivo del traspaso"
          className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

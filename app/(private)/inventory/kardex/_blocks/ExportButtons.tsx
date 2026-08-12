import { Icon } from "../../../../_components/atoms/Icon/Icon";

interface ExportButtonsProps {
  disabled: boolean;
  isExporting: boolean;
  onExportXlsx: () => void;
  onExportPdf: () => void;
}

export function ExportButtons({ disabled, isExporting, onExportXlsx, onExportPdf }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onExportXlsx}
        disabled={disabled || isExporting}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-outline text-on-surface text-label-lg font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
      >
        <Icon name="summarize" size={18} />
        Exportar Excel
      </button>
      <button
        type="button"
        onClick={onExportPdf}
        disabled={disabled || isExporting}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-outline text-on-surface text-label-lg font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
      >
        <Icon name="print" size={18} />
        Imprimir
      </button>
    </div>
  );
}

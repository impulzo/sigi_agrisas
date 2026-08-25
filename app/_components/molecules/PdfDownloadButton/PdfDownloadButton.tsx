import { Button } from "../../atoms/Button/Button";

interface PdfDownloadButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

function PdfButton({
  variant,
  label,
  onClick,
  loading,
  disabled,
  size,
  className,
}: PdfDownloadButtonProps & { variant: "tertiary" | "outlined"; label: string; className?: string }) {
  return (
    <Button
      variant={variant}
      size={size}
      icon="picture_as_pdf"
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      className={className}
    >
      {label}
    </Button>
  );
}

export function ExportPdfButton({ onClick, loading, disabled, size }: PdfDownloadButtonProps) {
  return <PdfButton variant="tertiary" label="Exportar a PDF" onClick={onClick} loading={loading} disabled={disabled} size={size} />;
}

export function DownloadPdfButton({ onClick, loading, disabled, size }: PdfDownloadButtonProps) {
  return (
    <PdfButton
      variant="outlined"
      label="Descargar PDF"
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      size={size}
      className="border-tertiary text-tertiary hover:bg-tertiary/10"
    />
  );
}

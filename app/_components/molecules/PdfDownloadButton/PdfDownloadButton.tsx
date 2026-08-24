import { Button } from "../../atoms/Button/Button";

interface PdfDownloadButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function PdfButton({
  variant,
  label,
  onClick,
  loading,
  disabled,
}: PdfDownloadButtonProps & { variant: "filled" | "outlined"; label: string }) {
  return (
    <Button variant={variant} icon="picture_as_pdf" onClick={onClick} loading={loading} disabled={disabled}>
      {label}
    </Button>
  );
}

export function ExportPdfButton({ onClick, loading, disabled }: PdfDownloadButtonProps) {
  return <PdfButton variant="filled" label="Exportar a PDF" onClick={onClick} loading={loading} disabled={disabled} />;
}

export function DownloadPdfButton({ onClick, loading, disabled }: PdfDownloadButtonProps) {
  return <PdfButton variant="outlined" label="Descargar PDF" onClick={onClick} loading={loading} disabled={disabled} />;
}

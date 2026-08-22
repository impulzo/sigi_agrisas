import { Button } from "../../atoms/Button/Button";

interface CreateButtonProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

export function CreateButton({ label, onClick, href }: CreateButtonProps) {
  return (
    <Button variant="filled" icon="add" onClick={onClick} href={href}>
      {label}
    </Button>
  );
}

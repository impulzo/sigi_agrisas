import { Input } from "../../atoms/Input/Input";
import { Button } from "../../atoms/Button/Button";

interface SearchBarProps {
  placeholder?: string;
}

export function SearchBar({ placeholder = "Buscar..." }: SearchBarProps) {
  return (
    <div className="flex gap-2">
      <Input placeholder={placeholder} className="flex-1" />
      <Button type="button">Buscar</Button>
    </div>
  );
}

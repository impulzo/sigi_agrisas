import { ReactNode } from "react";

interface HeaderProps {
  nav?: ReactNode;
}

export function Header({ nav }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-agrisas-dark text-agrisas-mint">
      <span className="font-poppins font-semibold text-lg">Agrisas</span>
      {nav && <nav>{nav}</nav>}
    </header>
  );
}

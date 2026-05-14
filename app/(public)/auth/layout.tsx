import { ReactNode } from "react";
import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel izquierdo — ilustración + marca */}
      <div
        className={`hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-agrisas-mint ${styles.leftPanel}`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-48 h-48 mb-8"
          aria-hidden="true"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tierra */}
          <ellipse cx="100" cy="160" rx="80" ry="20" fill="#d4f1e9" opacity="0.3" />
          {/* Tallo principal */}
          <line x1="100" y1="155" x2="100" y2="60" stroke="#d4f1e9" strokeWidth="4" strokeLinecap="round" />
          {/* Hoja izquierda */}
          <path d="M100 100 Q70 80 60 55 Q85 65 100 85" fill="#d4f1e9" opacity="0.8" />
          {/* Hoja derecha */}
          <path d="M100 120 Q130 100 145 75 Q120 90 100 110" fill="#d4f1e9" opacity="0.6" />
          {/* Flor / fruto */}
          <circle cx="100" cy="55" r="14" fill="#e8f7f3" />
          <circle cx="100" cy="55" r="7" fill="#2a6b5f" />
          {/* Sol */}
          <circle cx="155" cy="45" r="12" fill="#d4f1e9" opacity="0.5" />
          <line x1="155" y1="25" x2="155" y2="20" stroke="#d4f1e9" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <line x1="168" y1="32" x2="172" y2="28" stroke="#d4f1e9" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <line x1="175" y1="45" x2="180" y2="45" stroke="#d4f1e9" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
        <h1 className="font-poppins text-3xl font-bold text-center">Agrisas</h1>
        <p className="mt-2 text-agrisas-mint/80 text-center text-sm">
          Gestión agrícola inteligente
        </p>
      </div>

      {/* Panel derecho — slot del formulario */}
      <div className="flex flex-1 items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

import Image from "next/image";
import { ReactNode } from "react";
import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel izquierdo — ilustración + marca */}
      <div
        className={`flex lg:w-1/2 flex-col items-center justify-center p-8 lg:p-12 text-agrisas-mint ${styles.leftPanel}`}
      >
        <div className="relative w-32 h-32 lg:w-56 lg:h-56">
          <Image src="/logo.png" alt="Agrisas" fill className="object-contain rounded-lg" priority />
        </div>
      </div>

      {/* Panel derecho — slot del formulario */}
      <div className="flex flex-1 items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

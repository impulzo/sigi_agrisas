"use client";

import { useRouter } from "next/navigation";

interface Props {
  reason: "inactivity" | "session_lost";
}

const COPY: Record<Props["reason"], string> = {
  inactivity: "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.",
  session_lost: "Tu sesión expiró. Inicia sesión nuevamente.",
};

const STYLE: Record<Props["reason"], string> = {
  inactivity: "bg-tertiary-container text-on-tertiary-container",
  session_lost: "bg-error-container text-on-error-container",
};

export function SessionReasonBanner({ reason }: Props) {
  const router = useRouter();

  return (
    <div role="alert" className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 text-sm ${STYLE[reason]}`}>
      <span className="material-symbols-outlined text-base" aria-hidden="true">
        {reason === "inactivity" ? "info" : "warning"}
      </span>
      <p className="flex-1">{COPY[reason]}</p>
      <button
        type="button"
        aria-label="Cerrar aviso"
        className="flex-shrink-0"
        onClick={() => router.replace("/auth/login")}
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
      </button>
    </div>
  );
}

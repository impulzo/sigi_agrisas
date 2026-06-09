"use client";

import { useEffect, useRef } from "react";
import { cn } from "../../../_lib/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onCancel]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      className={cn(
        "rounded-xl bg-surface-container p-6 shadow-lg w-full max-w-sm",
        "backdrop:bg-black/40",
        className
      )}
    >
      <h2 id="confirm-dialog-title" className="text-title-md font-semibold text-on-surface mb-2">{title}</h2>
      <p className="text-body-md text-on-surface-variant mb-6">{description}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-label-lg text-on-surface hover:bg-surface-container-highest transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-label-lg bg-error text-on-error hover:opacity-90 transition-opacity"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

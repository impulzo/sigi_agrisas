"use client";

import { useEffect, RefObject } from "react";

type PosMode = "sale" | "quote";

interface UsePosKeyboardArgs {
  searchInputRef: RefObject<HTMLInputElement>;
  catalogContainerRef: RefObject<HTMLDivElement>;
  cartContainerRef: RefObject<HTMLDivElement>;
  onSubmit: () => void;
  onClearCart: () => void;
  onToggleMode: (mode: PosMode) => void;
  canToggleMode: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  cartHasItems: boolean;
  onShowShortcuts?: () => void;
  liveRegionRef?: RefObject<HTMLDivElement>;
}

function isInputTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function isMod(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}

export function usePosKeyboard({
  searchInputRef,
  catalogContainerRef,
  cartContainerRef,
  onSubmit,
  onClearCart,
  onToggleMode,
  canToggleMode,
  canSubmit,
  isSubmitting,
  cartHasItems,
  onShowShortcuts,
  liveRegionRef,
}: UsePosKeyboardArgs) {
  useEffect(() => {
    function announce(msg: string) {
      if (liveRegionRef?.current) liveRegionRef.current.textContent = msg;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const inInput = isInputTarget(e);

      if (isMod(e) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (isMod(e) && e.key === "ArrowRight") {
        e.preventDefault();
        const cart = cartContainerRef.current;
        if (!cart) return;
        const focusable = cart.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
        announce("Carrito enfocado");
        return;
      }

      if (isMod(e) && e.key === "ArrowLeft") {
        e.preventDefault();
        searchInputRef.current?.focus();
        announce("Catálogo enfocado");
        return;
      }

      if (isMod(e) && e.key === "Enter") {
        e.preventDefault();
        if (canSubmit && !isSubmitting) onSubmit();
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          if (canToggleMode) onToggleMode("sale");
          return;
        }
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          if (canToggleMode) onToggleMode("quote");
          return;
        }
      }

      if (isMod(e) && e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        if (cartHasItems && window.confirm("¿Vaciar el carrito?")) {
          onClearCart();
        }
        return;
      }

      if (!inInput && e.key === "?") {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    searchInputRef,
    catalogContainerRef,
    cartContainerRef,
    onSubmit,
    onClearCart,
    onToggleMode,
    canToggleMode,
    canSubmit,
    isSubmitting,
    cartHasItems,
    onShowShortcuts,
    liveRegionRef,
  ]);
}

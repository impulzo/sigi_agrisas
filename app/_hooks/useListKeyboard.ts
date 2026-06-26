"use client";

import { useRef, useState, useCallback } from "react";

interface ListKeyboardOptions<T> {
  onPlus?: (item: T, index: number) => void;
  onMinus?: (item: T, index: number) => void;
  onDelete?: (item: T, index: number) => void;
}

interface ListItemProps {
  tabIndex: number;
  ref: (el: HTMLElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  "aria-selected": boolean;
}

export function useListKeyboard<T>(
  items: T[],
  onEnter: (item: T, index: number) => void,
  opts?: ListKeyboardOptions<T>,
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const getItemProps = useCallback(
    (index: number): ListItemProps => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      "aria-selected": index === focusedIndex,
      onFocus: () => setFocusedIndex(index),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = Math.min(index + 1, items.length - 1);
          setFocusedIndex(next);
          itemRefs.current[next]?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = Math.max(index - 1, 0);
          setFocusedIndex(prev);
          itemRefs.current[prev]?.focus();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (items[index] !== undefined) onEnter(items[index], index);
        } else if ((e.key === "+" || e.key === "=") && opts?.onPlus) {
          e.preventDefault();
          if (items[index] !== undefined) opts.onPlus(items[index], index);
        } else if (e.key === "-" && opts?.onMinus) {
          e.preventDefault();
          if (items[index] !== undefined) opts.onMinus(items[index], index);
        } else if ((e.key === "Delete" || e.key === "Backspace") && opts?.onDelete) {
          e.preventDefault();
          if (items[index] !== undefined) opts.onDelete(items[index], index);
        }
      },
    }),
    [focusedIndex, items, onEnter, opts],
  );

  return { getItemProps, focusedIndex, setFocusedIndex, itemRefs };
}

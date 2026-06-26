"use client";

import { useRef, useState, useCallback } from "react";

interface TableKeyboardOptions {
  onPageDown?: () => void;
  onPageUp?: () => void;
}

interface RowProps {
  tabIndex: number;
  ref: (el: HTMLTableRowElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => void;
  onFocus: () => void;
  "aria-selected": boolean;
}

export function useTableKeyboard<T>(
  items: T[],
  onEnter: (item: T, index: number) => void,
  opts?: TableKeyboardOptions,
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const getRowProps = useCallback(
    (index: number): RowProps => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      ref: (el: HTMLTableRowElement | null) => {
        rowRefs.current[index] = el;
      },
      "aria-selected": index === focusedIndex,
      onFocus: () => setFocusedIndex(index),
      onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (index < items.length - 1) {
            const next = index + 1;
            setFocusedIndex(next);
            rowRefs.current[next]?.focus();
          } else if (opts?.onPageDown) {
            opts.onPageDown();
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (index > 0) {
            const prev = index - 1;
            setFocusedIndex(prev);
            rowRefs.current[prev]?.focus();
          } else if (opts?.onPageUp) {
            opts.onPageUp();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (items[index] !== undefined) onEnter(items[index], index);
        }
      },
    }),
    [focusedIndex, items, onEnter, opts],
  );

  return { getRowProps, focusedIndex, setFocusedIndex, rowRefs };
}

"use client";

import { useEffect } from "react";

const HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
const MARKER_ID = "material-symbols-outlined-stylesheet";

export function MaterialSymbolsLoader() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(MARKER_ID)) return;

    const link = document.createElement("link");
    link.id = MARKER_ID;
    link.rel = "stylesheet";
    link.href = HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge no reconoce nuestra escala tipográfica M3 (display-lg,
// headline-sm, body-md, label-lg, ...) como grupo "font-size": sus nombres no
// calzan con el validador de t-shirt-sizes por defecto (xs/sm/base/lg/xl/2xl),
// así que caían en el catch-all de "text-color" y colisionaban con clases de
// color reales (p.ej. cn("text-label-lg", "text-on-primary") descartaba una
// de las dos según el orden). Se registran explícitamente para que ambos
// grupos convivan sin pisarse. Mantener sincronizado con
// tailwind.config.ts → theme.extend.fontSize.
const M3_FONT_SIZE_TOKENS = [
  "display-lg",
  "display-md",
  "display-sm",
  "headline-lg",
  "headline-lg-mobile",
  "headline-md",
  "headline-sm",
  "title-lg",
  "title-md",
  "title-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "label-lg",
  "label-md",
  "label-sm",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: M3_FONT_SIZE_TOKENS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

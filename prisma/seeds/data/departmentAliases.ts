/**
 * Alias manuales de departamento: nombre crudo → nombre canónico. Confirmados
 * por el usuario contra INVENTARIOS TIENDAS.xlsx real (ver
 * openspec/changes/fix-inventory-seeder-matching-and-pricing) — cluster INNOVAK
 * (variantes de captura) y sufijo " OUT" (basura de captura, no categoría real)
 * en 4 familias adicionales. Comparación EXACTA contra `departmentName` crudo,
 * sin normalización adicional — fuera de estos pares, ninguna fusión automática.
 */
export const DEPARTMENT_ALIASES: Record<string, string> = {
  "-INNOVAK": "INNOVAK GLOBAL",
  "INNOVAK": "INNOVAK GLOBAL",
  "INNOVAK OUT": "INNOVAK GLOBAL",
  "AGRINOVA OUT": "AGRINOVA",
  "KEY BIOTEC OUT": "KEYBIOTEC",
  "OTRAS LINEAS OUT": "OTRAS LINEAS",
  "FORMULABAGRO OUT": "FORMU LAB",
};

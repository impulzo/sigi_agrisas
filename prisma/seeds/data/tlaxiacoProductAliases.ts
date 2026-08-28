/**
 * Alias manuales de producto Tlaxiaco → code de catálogo existente.
 * Confirmados por precio idéntico/cercano contra INVENTARIOS TIENDAS.xlsx real
 * (ver openspec/changes/fix-inventory-seeder-matching-and-pricing). Llave = `name`
 * crudo tal cual aparece en la hoja `INV TLAXIACO`, sin normalizar — el mapa se
 * consulta cuando el match por nombre normalizado no resuelve nada.
 */
export const TLAXIACO_PRODUCT_ALIASES: Record<string, string> = {
  "BIOFIT G": "BF1KG",
  "CARBOXY MIN G GRANULADO": "CMING",
  "NUTRISORB G 25 KG": "NUTG",
  "PROMESOL 5X": "P5X1LT",
  "RADIGROW G GRANULADO": "RADG1",
};

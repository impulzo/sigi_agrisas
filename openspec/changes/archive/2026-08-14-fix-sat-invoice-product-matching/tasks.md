## 1. Servicio de búsqueda de productos

- [x] 1.1 Renombrar/generalizar `app/(private)/purchases/_logic/services/searchProductsBySatCode.ts` a un servicio que acepte un término de búsqueda por nombre (`search`) en vez de `satProductCode`, apuntando a `GET /api/v1/admin/products?search=...` (mantener `page=1`, `pageSize=100`, `includeInactive=false`).
- [x] 1.2 Agregar `unit: string` al `ProductDto` local (`app/(private)/purchases/_logic/types/api.ts`) y al mapeo de la respuesta en el servicio (leer `p.unit`).
- [x] 1.3 Actualizar/renombrar el test correspondiente (equivalente a `searchProductsBySatCode`) para cubrir el nuevo query param `search` y el campo `unit` en la respuesta mapeada.

## 2. Extracción de nombre y matching en `satInvoiceMapping.ts`

- [x] 2.1 Agregar función pura `extractProductNameFromDescripcion(descripcion: string): string` que remueve el prefijo `"[NoIdentificacion] "` (regex `/^\[.*?\]\s*/`) si está presente; si no hay corchetes, retorna la descripción tal cual.
- [x] 2.2 Reescribir `buildSatApplyResult` para resolver cada `SatConcepto` de forma independiente (sin agrupar previamente por `claveProdServ`): por cada concepto, extraer nombre (2.1) y buscar candidatos vía el servicio actualizado (1.1), en paralelo con `Promise.all`.
- [x] 2.3 Implementar la lógica de resolución por concepto: 0 candidatos → `unmatched`; 1 candidato → match directo; ≥2 candidatos → filtrar por `product.unit === concepto.claveUnidad`, y aplicar la misma regla (1 → match, 0 o ≥2 → `unmatched` con warning de ambigüedad).
- [x] 2.4 Mantener el paso de agregación: una vez resueltos todos los conceptos, agrupar por `product.id` para sumar `cantidad` en una sola línea (igual que el comportamiento actual, solo que la clave de agrupación ahora viene del resultado del match, no de `claveProdServ` de entrada).
- [x] 2.5 Mantener sin cambios la lógica existente de comparación de tasas IVA/IEPS (usa `conceptos[0]` del grupo agregado — no depende de la estrategia de matching).
- [x] 2.6 Agregar el warning de ambigüedad al array `warnings` cuando un concepto cae a `unmatched` por candidatos ambiguos (distinguible del warning/aviso de "sin producto equivalente" por 0 candidatos, aunque ambos terminen en el mismo array `unmatched` del resultado).

## 3. Tests de `satInvoiceMapping`

- [x] 3.1 Crear `tests/unit/ui/(private)/purchases/_logic/lib/satInvoiceMapping.test.ts` cubriendo, como mínimo:
  - Concepto con 1 candidato único por nombre → genera línea con producto, cantidad y costo correctos.
  - Dos conceptos con nombres distintos (mismo `claveProdServ`) → generan dos líneas separadas (no colapsan).
  - Dos conceptos que resuelven al mismo producto → se agregan en una sola línea con cantidad sumada.
  - Concepto sin candidatos (0 resultados) → cae a `unmatched`.
  - Concepto con ≥2 candidatos y `claveUnidad` que desempata a exactamente 1 → usa ese candidato.
  - Concepto con ≥2 candidatos sin desempate posible (0 o ≥2 coinciden en unidad) → cae a `unmatched` con warning de ambigüedad.
  - Descripción sin prefijo `[...]` → se usa tal cual como término de búsqueda.
- [x] 3.2 Ejecutar `npm test -- satInvoiceMapping` y confirmar verde.

## 4. Documentación de spec y verificación end-to-end

- [x] 4.1 Confirmar que `openspec/changes/fix-sat-invoice-product-matching/specs/purchases-ui/spec.md` (ya generado en fase de propuesta) queda consistente con el comportamiento final implementado; ajustar si la implementación se desvió del diseño.
- [x] 4.2 Probar manualmente en `/purchases/new` con el XML CFDI real de prueba (16 conceptos, mismo `ClaveProdServ` en todos) y confirmar que ya no colapsa a una sola línea — verificar contra el subtotal real de la factura ($202,862.01).
- [x] 4.3 Correr `npm run build` para confirmar que no hay errores de tipos tras el cambio de `ProductDto` y el rename del servicio.
- [x] 4.4 Correr la suite completa (`npm test`) para descartar regresiones en otros consumidores de `searchProductsBySatCode`/`ProductDto` del módulo purchases.

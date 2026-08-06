## Context

Ver `proposal.md` - Why. El módulo `settings` ya resuelve exactamente este problema para `ticket_settings`: tabla singleton-row (un solo registro con `id` fijo), upsert idempotente, `GET` con defaults sin crear fila, `PATCH` que sí crea/actualiza. Este change replica ese patrón para un segundo recurso, `pricing_settings`, en vez de inventar uno nuevo.

## Goals / Non-Goals

**Goals:**
- Reemplazar `DOSIFICATION_SURCHARGE_PCT` hardcodeado por un valor leído de `pricing_settings`, con fallback a 5% cuando no hay fila (Historia #1).
- Exponer `GET/PATCH /settings/pricing` con el mismo patrón de permisos y singleton que `ticket_settings` (Historia #2).
- Nueva sección de UI en `/settings` para editar el porcentaje.

**Non-Goals:**
- No se añade un sistema de configuración key-value genérico — se sigue el patrón "una tabla, un propósito" ya establecido, no una tabla `settings(key, value)` compartida.
- No se versiona el histórico de cambios del porcentaje (no hay auditoría de "quién cambió qué y cuándo" — fuera de alcance, igual que `ticket_settings` no la tiene).
- No se recalculan retroactivamente ventas/cotizaciones que ya usaron dosificaciones con el 7% anterior — el precio se snapshotea por línea al momento de la venta (`unitPrice` ya persistido), consistente con el resto del sistema.

## Decisions

**1. Extender `settings-api` en vez de crear una capability nueva (`pricing-settings-api`).**
El Purpose de `settings-api` declara explícitamente ser "extensible a futuras configuraciones globales sin cambiar el patrón". Crear una capability separada duplicaría infraestructura (RBAC, patrón singleton, UI shell) sin beneficio. Responde a Historia #2.

**2. `DosificationPriceCalculator.computeUnitPrice` recibe el % como parámetro explícito, no lo resuelve internamente.**
Alternativa descartada: que el propio calculador haga un lookup a `PricingSettingsRepository`. Se descarta porque el spec existente exige "no I/O dependencies (no DB, no HTTP)" — es un domain service puro, igual que los `TotalsCalculator`. El caller resuelve el % vigente y lo pasa como argumento. Responde a Historia #1.

**2.1. Hay 3 callers reales de `DosificationPriceCalculator.computeUnitPrice`, no solo el mapper de catálogo — descubierto al buscar consumidores antes de tocar la firma.**
`toProductDosificationDto.ts` (mapper de catálogo/POS-lookup, listado de dosificaciones) es uno. Pero `CreateSaleUseCase` y `EditCompletedSaleUseCase` (módulo `pos`) TAMBIÉN llaman al calculador directamente cuando una línea de venta usa `dosificationId` — deben recibir el mismo % vigente, sino una venta calcularía el precio con un valor distinto al que el catálogo mostró. Para no acoplar el módulo `pos` directamente a `PricingSettingsRepository` (rompería el límite de módulos — `pos` ya abstrae todos sus lookups vía `PosLookupService`), se agrega un método nuevo a ese puerto: `PosLookupService.getDosificationSurchargePct(): Promise<number>`. La implementación Prisma (`PrismaPosLookupService`) resuelve internamente contra `pricing_settings` (mismo patrón singleton, con fallback a 5% si no hay fila) — el módulo `pos` solo ve un número, igual que ya hace con `ivaRate`/`iepsRate` de producto.

**3. El repositorio de pricing settings sigue el patrón `PrismaTicketSettingsRepository` al pie de la letra**: mismo enfoque de `id` fijo (`'pricing-settings-singleton'`), mismo `upsert`, misma forma de exponer `DEFAULT_PRICING_SETTINGS` cuando no hay fila. Minimiza riesgo — es código ya probado en producción, solo con una tabla y campo distintos.

**4. Validación del porcentaje: rechazar negativos y no-numéricos en el backend (Zod), sin tope superior fijo.**
Responde al Criterio de Seguridad de Historia #2 ("validación de rango en backend, no solo en cliente"). Se descarta poner un tope arbitrario (ej. 100%) porque no hay ninguna regla de negocio que lo justifique — un margen de dosificación podría legítimamente superar 100% en ciertos productos de bajo volumen. Solo se garantiza `>= 0` (un recargo negativo no tiene sentido de negocio y rompería la fórmula de forma confusa).

## Risks / Trade-offs

- **[Riesgo] Cambio de precio inmediato y global al editar el %**: como el spec exige, el cambio aplica a TODAS las dosificaciones de TODOS los productos al instante (Historia #2, criterio de aceptación). Un error de captura (ej. 50% en vez de 5%) afecta inmediatamente el catálogo completo. → **Mitigación**: es el comportamiento explícitamente pedido por el cliente (no hay ambigüedad); la UI debe mostrar el valor actual claramente antes de guardar, igual que ya hace `TicketSettingsForm`. No se agrega confirmación extra por ahora — mismo nivel de fricción que el resto de `settings-api`.
- **[Riesgo] Caché**: si en el futuro se cachea `pricing_settings` (como `AuthorizationService` cachea permisos 60s), un cambio de % tardaría en propagarse. → **Mitigación**: por ahora NO se cachea — cada `GET /products/:id/dosifications` resuelve el valor fresco de DB, igual que `ticket_settings` hoy. Documentar como decisión explícita para no "optimizar" esto sin querer y romper Historia #2 (criterio: "inmediatamente, sin requerir reinicio").
- **[Riesgo] Migración de datos**: no aplica — no hay datos previos que migrar (el 7% nunca se persistió, era una constante de código). El primer `GET` tras el deploy devuelve el nuevo default (5%) sin fila creada, cambiando silenciosamente el comportamiento de 7% a 5% hasta que un admin configure explícitamente. → **Mitigación**: esto es intencional y ya está cubierto por Historia #1 ("con el default de 5% sin configurar aún"); se documenta en el plan de migración abajo para que el cliente lo sepa antes del deploy.

## Migration Plan

1. Aplicar migración Prisma que crea la tabla `pricing_settings` (sin filas iniciales — igual que `ticket_settings`).
2. Deploy del backend: a partir de este momento, cualquier cálculo de `computedUnitPrice` usa 5% (default) en vez del 7% anterior, **hasta que un admin configure explícitamente un valor** vía `PATCH /settings/pricing`.
3. Si el negocio necesita mantener 7% sin interrupción, un admin debe hacer `PATCH /settings/pricing { "dosificationSurchargePct": 7 }` inmediatamente después del deploy — esto no se automatiza (no se migra el 7% como valor inicial, porque el default explícitamente pedido es 5%, no 7%). Comunicar este paso manual al cliente antes de desplegar.
4. Rollback: revertir el deploy del backend basta — la tabla `pricing_settings` puede quedar sin uso (no rompe nada si el código vuelve a usar la constante hardcodeada).

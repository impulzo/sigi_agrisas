## Context

El change `sigi-back-folios` completó el enforcement de `Folio.scope` en backend: los use cases de POS, Quotes y Payments lanzan `FolioScopeMismatchError` que los controllers mapean a HTTP 400 `{"error":"FolioScopeMismatch","expected":"...","actual":"..."}`. Sin embargo, la capa frontend nunca se actualizó para reconocer esta respuesta. Los servicios frontend usan text-matching sobre el campo `error` del body, y los patrones existentes ("folio" AND "inactive") no coinciden con "FolioScopeMismatch". El resultado es que los errores de scope caen al catch-all y el usuario ve un mensaje genérico o nada significativo.

La frecuencia del escenario no es despreciable: el hook `useFoliosOptions` cachea 60 segundos; si un admin cambia el scope de un folio mientras un operador tiene el POS o el modal de conversión abierto, la siguiente submisión recibirá un 400 con `FolioScopeMismatch`. En entornos de staging y dev, los cambios de scope son más frecuentes durante las pruebas.

El segundo gap (badge raw en tabla) es puramente cosmético pero crea inconsistencia: el `FolioEditModal` ya tiene etiquetas legibles en `SCOPE_OPTIONS`, mientras la tabla muestra los valores técnicos del enum.

## Goals / Non-Goals

**Goals:**
- Que los 4 flujos que pueden recibir `FolioScopeMismatch` muestren un mensaje claro en español al usuario.
- Que `FolioScopeMismatchError` en frontend lleve `expected` y `actual` para permitir mensajes contextuales.
- Eliminar la duplicación de etiquetas de scope entre `FolioEditModal` y `FoliosTable`.
- Sin cambios de backend.

**Non-Goals:**
- Unificar los archivos de errores frontend entre módulos (cada módulo mantiene el suyo por arquitectura).
- Agregar tests de integración para el flujo de error (los tests unitarios de servicios son suficientes).
- Manejar el caso de folio inactivo de forma diferente al actual.
- Modificar el comportamiento del hook `useFoliosOptions` o la TTL del caché.

## Decisions

### D1 — `FolioScopeMismatchError` duplicada por módulo (no compartida)

- **Elegida**: cada módulo frontend (`pos`, `quotes`, `payments`) define su propia clase `FolioScopeMismatchError extends Error` con `expected: string` y `actual: string`. Tres copias idénticas.
- **Alternativa**: un archivo compartido en `app/_lib/errors/` importado por los tres módulos.
- **Razón**: la arquitectura del proyecto mantiene la frontera `src/` ↔ `app/` estrictamente, y dentro de `app/` los módulos de feature no comparten errores entre sí (cada `_logic/errors.ts` es privado al módulo). Tres copias de 10 líneas es costo despreciable vs el riesgo de acoplamiento.

### D2 — Detección del error por campo `error` exacto, no texto libre

- **Elegida**: en los servicios, detectar `err.error === "FolioScopeMismatch"` (comparación exacta con el discriminador del backend) en lugar de text-matching con `includes("scope")`.
- **Alternativa**: agregar `msg.includes("scope")` al chain de text-matching existente.
- **Razón**: text-matching es frágil y puede dar falsos positivos (e.g. un mensaje de branch scoping que contenga "scope"). El backend retorna un discriminador string estable (`"FolioScopeMismatch"`); usarlo directamente es más robusto y autocomenta la intención.

### D3 — Mensaje en español en el constructor del error (no en el componente)

- **Elegida**: el constructor de `FolioScopeMismatchError` genera el mensaje en español: `"El folio seleccionado es de tipo ${actual}, pero este flujo requiere uno de tipo ${expected}."`. El `PosPage` toast ya usa `submitError.message` directamente; con esto queda correcto sin tocar el componente.
- **Alternativa**: dejar el mensaje en inglés técnico y traducirlo en cada componente.
- **Razón**: minimiza el número de archivos a modificar. El PosPage ya muestra `.message` crudo; traducir en el error-class en lugar del componente evita un cambio extra.

### D4 — `SCOPE_LABEL: Record<FolioScope, string>` en nuevo archivo `_logic/scopeLabels.ts`

- **Elegida**: crear `app/(private)/catalogs/folios/_logic/scopeLabels.ts` con la constante `SCOPE_LABEL` (y opcionalmente `SCOPE_DESCRIPTION` para tooltip). Ambos `FolioEditModal` y `FoliosTable` importan desde este archivo.
- **Alternativa**: mantener las etiquetas inline en cada componente (estado actual: `SCOPE_OPTIONS` en el modal, texto crudo en la tabla).
- **Razón**: single source of truth dentro del módulo. Si las etiquetas cambian, hay un solo lugar.

### D5 — Etiquetas cortas en el badge de la tabla, etiquetas largas en el select del modal

- **Elegida**: `SCOPE_LABEL` provee etiquetas cortas ("Punto de Venta", "Inventario", "Operaciones") para la tabla. `FolioEditModal` usa `SCOPE_OPTIONS` (con detalle de códigos) para el select, derivadas de `SCOPE_LABEL`.
- **Razón**: el badge en la tabla tiene espacio limitado; la etiqueta larga con códigos ("POS (TK, TC, COT)") es valiosa en el select del modal donde el usuario necesita seleccionar, pero redundante en la tabla de solo-lectura.

## Risks / Trade-offs

- **Riesgo**: el mensaje del constructor en D3 hardcodea los strings del enum en español. Si en el futuro los scopes cambian de nombre, habría que actualizar también el mensaje.  
  **Mitigación**: el mensaje interpola `expected`/`actual` dinámicamente, no tiene los strings harcoded; cualquier nuevo scope aparecerá tal cual en el mensaje.

- **Trade-off**: tres copias de `FolioScopeMismatchError` en lugar de una. A cambio, cero acoplamiento entre módulos de feature y sin riesgo de que un cambio en `_lib/` afecte los tres flujos simultáneamente.

## Migration Plan

1. Cambios son puramente frontend, sin migración de datos ni BD.
2. No requieren feature flag: el manejo de errores es mejora transparente.
3. Deploy: un solo PR. El FE con los cambios convive sin problema con el backend existente (que ya genera los errores correctamente).
4. Rollback: revertir el PR no tiene impacto en datos; los flujos vuelven a mostrar el mensaje genérico anterior.

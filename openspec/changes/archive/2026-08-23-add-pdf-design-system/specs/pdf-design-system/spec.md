## ADDED Requirements

### Requirement: Tema de colores compartido para PDFs
El sistema SHALL exponer un módulo `src/shared/infrastructure/pdf/pdfTheme.ts` con constantes hexadecimales de color que reproducen exactamente los valores de la paleta de marca definida en `tailwind.config.ts` (Material 3 "Agro-Systemic"), incluyendo como mínimo `primary`, `tertiary`, `outline`, `outlineVariant`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerLow`, `onSurface`, `onSurfaceVariant`, `error` (`#ba1a1a`) y `errorContainer`.

#### Scenario: Constantes de tema coinciden con la paleta de marca
- **WHEN** se compara cualquier valor exportado por `pdfTheme.ts` contra su token equivalente en `tailwind.config.ts`
- **THEN** los valores hexadecimales son idénticos byte a byte

#### Scenario: Color de error usa el rojo de marca
- **WHEN** se lee la constante `error` de `pdfTheme.ts`
- **THEN** su valor es `#ba1a1a`, no `#c00`

### Requirement: Estilos base componibles para PDFs
El sistema SHALL exponer `src/shared/infrastructure/pdf/pdfBaseStyles.ts` como un objeto plano (no un `StyleSheet.create` propio) con fragmentos de estilo reutilizables (`page`, `tableHeader`, `tableRow`, `tableRowAlt`, banda de totales, `footer`, `badge`, bordes), diseñado para ser incluido mediante spread dentro del `StyleSheet.create` de cada módulo consumidor, sin forzar la fusión de todos los `pdfStyles.ts` de módulo en un único archivo.

#### Scenario: El módulo compila sin consumidores
- **WHEN** `pdfBaseStyles.ts` se agrega al repositorio sin que ningún `pdfStyles.ts` de módulo lo importe todavía
- **THEN** el build del proyecto (`npm run build`) sigue pasando sin errores

#### Scenario: Un módulo compone el objeto base sin redefinir valores
- **WHEN** un `pdfStyles.ts` de módulo construye su `StyleSheet.create({...pdfBaseStyles, ...propio})`
- **THEN** las claves de `pdfBaseStyles` (ej. `tableHeader`, `tableRowAlt`) están disponibles con los valores de `pdfTheme` sin que el módulo redeclare su propio hex para esas claves

### Requirement: Resolución de logo para documentos PDF
El sistema SHALL exponer `resolvePdfLogoSource(logoUrl: string | null | undefined)` en `src/shared/infrastructure/pdf/`, que retorna la URL remota sin modificar cuando `logoUrl` es una URL `https://` válida, y retorna una referencia local (ruta absoluta de sistema de archivos o `Buffer`) al archivo `public/logo.png` cuando `logoUrl` es `null`, vacío o no es una URL `https://` válida. El sistema SHALL exponer también un componente `<PdfLogo>` reutilizable que consume el resultado de `resolvePdfLogoSource`.

#### Scenario: Logo remoto del tenant se usa cuando existe
- **WHEN** `logoUrl` es `"https://storage.supabase.co/.../logo-tenant.png"`
- **THEN** `resolvePdfLogoSource` retorna esa misma URL sin transformarla

#### Scenario: Fallback al logo por defecto cuando no hay logo configurado
- **WHEN** `logoUrl` es `null`
- **THEN** `resolvePdfLogoSource` retorna una referencia a `public/logo.png` resuelta como ruta absoluta o `Buffer`, nunca como la cadena relativa `/logo.png`

### Requirement: Tipo e issuer compartido para PDFs
El sistema SHALL exponer en `src/shared/infrastructure/pdf/pdfIssuer.ts` un tipo `PdfIssuer` con los campos `businessName`, `businessRfc`, `businessAddress`, `businessPhone` (todos `string | null`) y `logoUrl: string | null`, junto con una función pura `toPdfIssuer(settings: TicketSettings): PdfIssuer` que mapea la entidad `TicketSettings` a este tipo sin lógica adicional ni acceso a infraestructura de persistencia.

#### Scenario: Mapeo directo de TicketSettings a PdfIssuer
- **WHEN** se invoca `toPdfIssuer(settings)` con un `TicketSettings` que tiene `logoUrl` asignado
- **THEN** el `PdfIssuer` resultante incluye ese mismo `logoUrl` sin transformación

### Requirement: Formateador de moneda compartido para PDFs
El sistema SHALL exponer `formatPdfCurrency(amount: number, currency?: string)` en `src/shared/infrastructure/formatters/formatPdfCurrency.ts`, con comportamiento equivalente a `new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount)` y `currency` por defecto `"MXN"`.

#### Scenario: Formato de moneda por defecto
- **WHEN** se invoca `formatPdfCurrency(1234.5)` sin especificar `currency`
- **THEN** el resultado es el mismo que `new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(1234.5)`

### Requirement: Helper de estilo de fila alterna
El sistema SHALL exponer una función pura `rowStyle(index: number, base: Style, alt: Style): Style` en `src/shared/infrastructure/pdf/`, que retorna `base` cuando `index` es par y `alt` cuando `index` es impar.

#### Scenario: Índice par retorna el estilo base
- **WHEN** se invoca `rowStyle(0, base, alt)`
- **THEN** el resultado es `base`

#### Scenario: Índice impar retorna el estilo alterno
- **WHEN** se invoca `rowStyle(1, base, alt)`
- **THEN** el resultado es `alt`

## Context

`InvoiceDocumentPdf.tsx` (`src/modules/billing/infrastructure/pdf/`) recibe `watermark:
string` e `isDraft?: boolean` como props, sin acoplarse a cuál de sus dos consumidores
(`BillingController.previewPdf` o `FakeFacturamaGateway.download`) lo invoca. Hoy
renderiza `<Text style={s.watermarkBanner}>` como primer elemento visible de la página
(banner sólido, `backgroundColor: PDF_COLORS.error`, texto blanco) y
`<Text style={s.watermarkFooter}>` al pie (banda de texto rojo con borde superior). El
resto del documento (bloque emisor/receptor, tabla de conceptos, totales, footer fiscal
condicionado a `!isDraft`) no cambia en este change.

## Goals / Non-Goals

**Goals:**
- Reemplazar el par banner-superior + banda-inferior por una única marca de agua
  diagonal de fondo, en gris translúcido de la paleta `pdfTheme`.
- Conservar exactamente el texto de `watermark` (sin acortarlo a solo "BORRADOR") y el
  comportamiento de `isDraft` (oculta el footer fiscal/QR).
- Que la marca de agua no bloquee la lectura del contenido real (emisor, receptor,
  tabla, totales).

**Non-Goals:**
- No se toca `BillingController.previewPdf` ni `FakeFacturamaGateway.download` — ambos
  siguen pasando `watermark`/`isDraft` sin cambio de firma.
- No se extiende este patrón a `QuotePdf.tsx` (quotes) en este change — se verificó que
  su badge de estado `draft` ya es gris neutro por diseño (`quotes-ui` spec) y su PDF no
  tiene watermark ni mensaje rojo; no hay nada que corregir ahí, y agregarle un
  watermark nuevo sería una feature distinta a "quitar el mensaje rojo que se confunde
  con un error".
- No se toca el `FacturamaRestGateway` (modo real, `FACTURAMA_MOCK=false`) — no usa
  `InvoiceDocumentPdf` en absoluto.

## Decisions

**Un único estilo `watermarkDiagonal` reemplaza `watermarkBanner` + `watermarkFooter`,
en vez de mantener ambos con color gris.** Alternativa descartada: solo cambiar el
`color`/`backgroundColor` de los dos estilos existentes de rojo a gris, conservando el
layout de banner sólido arriba/abajo. Se descarta porque el pedido es explícito: "en
letras grises de fondo como marca de agua... en el fondo" — un banner sólido (aunque
gris) sigue siendo un elemento de primer plano que compite visualmente con el
contenido, no una marca de agua de fondo. Una sola marca de agua diagonal, grande y
translúcida, es el patrón estándar de "documento borrador" (igual al que usan
Word/Google Docs/Acrobat) y cubre toda la página en vez de solo dos franjas.

**La marca de agua se renderiza como el primer hijo de `<Page>`, antes de
`<View style={s.header}>`.** `@react-pdf/renderer` pinta los elementos en orden de
documento (como HTML): un elemento declarado antes queda debajo visualmente de los
elementos declarados después dentro del mismo `<Page>`. Colocar el
`<Text style={s.watermarkDiagonal}>` primero, con `position: "absolute"` y opacidad
baja, lo deja detrás del resto del contenido sin necesitar ninguna prop de `z-index`
(que `@react-pdf/renderer` no soporta de forma confiable). Alternativa descartada:
dejarlo al final del `<Page>` con `position: "absolute"` — visualmente quedaría
ENCIMA del contenido (último en pintarse), justo el problema que se quiere evitar.

**Color: `PDF_COLORS.outlineVariant` (gris verdoso claro de la paleta de marca) con
`opacity: 0.25`, no un gris arbitrario nuevo.** Mantiene la regla ya establecida en
`pdf-design-system` de no introducir hex fuera de `pdfTheme`. Alternativa considerada:
`PDF_COLORS.onSurfaceVariant` (más oscuro) — se prefiere `outlineVariant` por ser el
tono más claro ya disponible, apropiado para un elemento de fondo que no debe competir
con el texto real (`onSurface`/`onSurfaceVariant`, más oscuros, usados por el contenido
real).

**Tamaño y rotación: `fontSize` grande (~64pt), `transform: "rotate(-45deg)"`, centrado
con `position: "absolute"` cubriendo el ancho de la página.** `@react-pdf/renderer`
soporta la propiedad `transform` con funciones CSS estándar (`rotate`, `translate`,
`scale`) sobre `View`/`Text`. Se seguirá el patrón común de watermark: `top: "45%"`,
`width: "100%"`, `textAlign: "center"`, sin `flexDirection` que interfiera con el resto
del layout (el resto del `<Page>` sigue usando `flexDirection: "column"` por defecto de
`pdfBaseStyles.page`).

**No se acorta el texto del watermark a solo "BORRADOR" pese a que el pedido dice "la
palabra borrador".** El texto real que llega por prop (`"BORRADOR — no válido
fiscalmente"` / `"DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL"`) transmite información
legal relevante (no solo que es un borrador, sino por qué no es válido); acortarlo
perdería ese matiz y — más importante — el criterio de seguridad de la historia 1 fija
explícitamente que el texto del watermark NO cambia en este change. Con `fontSize`
grande y una sola línea, el texto completo cabe en diagonal sobre A4 (ya se hizo la
prueba visual equivalente al migrar `unify-billing-pdf`, que mantuvo el mismo texto
completo sin acortar).

## Risks / Trade-offs

- **[Riesgo] Un texto largo en diagonal a `fontSize` grande podría desbordar los
  márgenes de la página A4 (595×842pt) en vez de quedar centrado.** → **Mitigación**:
  tarea de verificación visual explícita en `tasks.md` (comparación antes/después,
  mismo criterio que ya usó `unify-billing-pdf`); si el texto completo no cabe legible
  en una sola línea, reducir `fontSize` (no el texto) hasta que quepa, sin acortar el
  contenido.
- **[Riesgo] `opacity` baja podría hacer el watermark invisible en una impresión
  física en blanco y negro de baja calidad.** → **Mitigación**: `opacity: 0.25`-`0.3`
  con `fontSize` grande es el rango típico usado por herramientas de oficina
  (Word/Acrobat) para mantenerse legible tanto en pantalla como impreso; no se define
  como requisito estricto un valor exacto de opacidad — se ajusta visualmente durante
  la implementación dentro de ese rango.
- **[Riesgo] Remover `watermarkFooter` (que tenía `borderTopColor`/`paddingTop`, un
  elemento de layout con espacio propio) podría dejar el footer fiscal (`isDraft=false`)
  con un espaciado distinto al actual.** → **Mitigación**: `watermarkFooter` solo se
  renderizaba cuando había watermark (`isDraft` true la mayoría de las veces en la
  práctica) — el footer fiscal ya está condicionado a `!isDraft` y nunca coexistía con
  `watermarkFooter` en la misma página; no hay interacción de layout que preservar.

## Migration Plan

Sin datos que migrar, sin cambio de contrato HTTP. Un solo commit: `pdfStyles.ts` +
`InvoiceDocumentPdf.tsx` juntos (el segundo depende del estilo nuevo del primero).
Rollback: revertir el commit — ningún consumidor externo (`BillingController`,
`FakeFacturamaGateway`) cambia de firma, por lo que el rollback no tiene efectos en
cascada.

## Open Questions

(ninguna — alcance cerrado por el plan aprobado)

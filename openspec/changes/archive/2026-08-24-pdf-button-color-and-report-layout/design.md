## Context

`PdfDownloadButton` (historia #1 de `proposal.md`) ya envuelve `Button` con `icon="picture_as_pdf"` fijo, pero `ExportPdfButton` usa `variant="filled"` (token `primary`, verde), mientras `DownloadPdfButton` usa `variant="outlined"` neutro. `SaleInvoicesSection.tsx` tiene además un `<button>` de texto plano sin icono que rompe la regla ya documentada en `designer.md` de usar siempre el componente compartido.

`LedgerPage.tsx` y `PaymentsHistoryPage.tsx` (historia #2) no pasan por `PageShell`: reconstruyen a mano el contenedor raíz y el link de "volver" con `Link`+`Icon`. `PaymentsHistoryPage.tsx` además usa clases fuera de la escala de tokens (`px-4 py-6 max-w-7xl space-y-4`).

## Goals / Non-Goals

**Goals:**
- Un único color (`tertiary`) para toda acción de descarga/exportación de PDF, distinto del CTA primario (verde) y de acciones destructivas (rojo) — cierra el AC de la historia #1.
- Cero instancias de `<button>` crudo para PDF fuera del componente compartido — cierra la excepción de `SaleInvoicesSection.tsx`.
- `LedgerPage.tsx` y `PaymentsHistoryPage.tsx` heredan arrow-back, padding, margen y ancho máximo de `PageShell`, igual que las otras 6 pantallas de `/reports/*` — cierra el AC de la historia #2.

**Non-Goals:**
- No se migra el botón "XML" de `SaleInvoicesSection.tsx` (no es una acción de PDF).
- No se toca `tests/unit/ui/design-system/tokens.test.ts` (el archivo permanece en el allowlist por el botón XML que no se toca).
- No se migra `app/(private)/dashboard/page.tsx` (excepción ya documentada y fuera de alcance de este change).
- No se cambian permisos/RBAC ni lógica de datos — es un cambio puramente de presentación/estructura de layout.
- No se introduce una variante `tertiary` con forma `outlined` propia en `Button`; el recoloreo de `DownloadPdfButton` se resuelve con `className` override sobre `outlined`, siguiendo el precedente ya documentado en `designer.md` (Desviación #3, `Button` en `/auth/*`).

## Decisions

**1. Color `tertiary` para ambas variantes de PDF, en vez de introducir un token nuevo.**
`tailwind.config.ts` ya define `tertiary`/`on-tertiary` (`#445963`, "gris-azul técnico") sin uso previo en ningún botón — es el único token M3 disponible que no es `primary` (verde, CTA) ni `error` (rojo, destructivo) ni gris genérico prohibido (`bg-gray-*`). No requiere tocar `tailwind.config.ts`.
*Alternativa descartada*: usar `secondary` (marrón "earthy") — ya está asociado visualmente a acciones secundarias no relacionadas con documentos/exportación en otras partes de la UI; `tertiary` es semánticamente el tono "documental" según la lectura de Stitch en `designer.md`.

**2. Nueva variante `tertiary` en `Button` (no solo `className` ad-hoc en `PdfDownloadButton`).**
`ExportPdfButton` pasa de `filled` a una variante real `tertiary` del atom `Button`, en vez de mantener `filled` con un `className` override. Razón: `filled` ya tiene una regla propia y documentada ("CTA primario único de la página" — ver requirement `Button` en `openspec/specs/design-system/spec.md`); mezclar semánticas (usar `filled` pero recoloreado) rompería esa regla para cualquier lector futuro del código. Una variante nueva y explícita es más barata de mantener que un override.
*Alternativa descartada*: mantener sólo `className` overrides en `PdfDownloadButton` para ambos botones sin tocar `Button.tsx` — descartada porque `ExportPdfButton` necesita cambiar de fondo sólido a fondo sólido (mismo "peso" visual que `filled`), y `variantClasses.filled` ya está anclado a `primary` en la spec; falsificar ese anclaje con `className` habría sido más frágil que declarar la variante.

**3. `DownloadPdfButton` sigue siendo `outlined` + `className` override, no una variante nueva.**
Sólo cambia color de borde/texto, no de forma — mismo patrón exacto que la Desviación #3 ya registrada en `designer.md` (`Button` en `/auth/*` gana su paleta legacy vía `className` sobre `tailwind-merge`). No amerita una sexta combinación variante×color en `Button.tsx` para un caso de un solo componente consumidor.

**4. Prop `size` en `PdfDownloadButton`, pass-through simple.**
`SaleInvoicesSection.tsx` renderiza el botón PDF dentro de una fila compacta (junto a badge, monto, botón XML y link "Ver"); el tamaño `md` por defecto sería desproporcionado. Se agrega `size?: "sm" | "md" | "lg"` opcional (default implícito `"md"` al no pasar la prop) en vez de crear una tercera variante de tamaño fijo — reutiliza el `size` que `Button` ya soporta.

**5. Migrar `LedgerPage.tsx`/`PaymentsHistoryPage.tsx` a `PageShell` en vez de sólo alinear sus clases manuales a los tokens correctos.**
El requirement "PageShell como único contenedor de página" (ya vigente en `openspec/specs/design-system/spec.md`) prohíbe declarar `px-*`/`py-*`/`mx-auto`/`max-w-*` propios fuera de `PageShell` — alinear valores a mano habría dejado el mismo antipatrón (contenedor + back-link reconstruidos), sólo que con los números "correctos" por coincidencia, igual al caso ya detectado en `LedgerPage.tsx` actual (usa los tokens correctos pero fuera de `PageShell`). Migrar a `PageShell` de verdad es la única forma de que ambas pantallas hereden el contrato automáticamente y no puedan desviarse de nuevo sin que alguien lo note.
*Alternativa descartada*: sólo corregir las clases de `PaymentsHistoryPage.tsx` a los valores de token (`px-gutter py-lg max-w-screen-2xl`) sin pasar por `PageShell` — descartada porque no resuelve la causa raíz (duplicación de la estructura del componente) y deja a `LedgerPage.tsx` como precedente de que "clases correctas a mano" es aceptable, cuando el requirement ya vigente lo prohíbe explícitamente.

**6. `title` estático (`"Estado de cuenta"`, `"Historial de abonos"`) en `PageHeader`, no dinámico por cliente/filtro.**
`PageShell.title` es `string` obligatorio, no `ReactNode` — el nombre del cliente en `LedgerPage` ya se muestra dentro de `LedgerHeader` (contenido de `children`), así que el título de la página se mantiene genérico, igual que el breadcrumb estático que reemplaza ("Estados de Cuenta"). No se toca `PageHeader`/`PageShellProps` para aceptar `title: ReactNode` — sería un cambio de contrato más amplio, fuera de alcance de este change.

## Risks / Trade-offs

- **[Riesgo] Recolorear `ExportPdfButton`/`DownloadPdfButton` es un cambio visual en 14 puntos de la app (8 reportes + 6 consumidores de `DownloadPdfButton`) sin flag de rollout.** → Mitigación: es aditivo/cosmético, no cambia comportamiento ni contrato de props públicas de los componentes existentes (`onClick`/`loading`/`disabled` intactos); revertir es un solo commit sobre 2 archivos (`Button.tsx`, `PdfDownloadButton.tsx`).
- **[Riesgo] Migrar `PaymentsHistoryPage.tsx` a `PageShell` reduce el ancho máximo de `max-w-7xl` (1280px) a `max-w-screen-2xl` (1536px, más ancho) y cambia el padding lateral (`px-4`→`px-gutter`, 24px).** La tabla "vista plana" tiene 11 columnas y ya usa scroll horizontal (`overflow-x-auto`); un contenedor más ancho reduce la necesidad de scroll, no la aumenta. → Mitigación: verificación visual manual con Playwright en `/payments/history` antes de dar el cambio por cerrado, según lo indicado en `proposal.md` § Impact.
- **[Riesgo] `PageShell` no soporta `title` dinámico (`ReactNode`) — si a futuro se quisiera mostrar el nombre del cliente en el header de `LedgerPage`, requeriría extender `PageShellProps`.** → Mitigación: fuera de alcance; el dato ya es visible en `LedgerHeader` dentro del body, no se pierde información, sólo se decide no ampliar el contrato del componente compartido en este change.
- **[Riesgo] `tailwind-merge` no resuelve correctamente el override de color en `DownloadPdfButton` si alguna clase custom no es reconocida como su mismo grupo.** → Mitigación: las clases en juego (`border-*`, `text-*`, `hover:bg-*`) son utilidades estándar de Tailwind, no tokens custom que requieran la extensión de `M3_FONT_SIZE_TOKENS` documentada en `cn.ts` (esa extensión sólo aplica a `font-size`); se verifica con inspección visual (DevTools) que gana la clase `tertiary`, no `outline`.

## Migration Plan

1. `Button.tsx`: agregar variante `tertiary` (aditivo, no rompe consumidores existentes).
2. `PdfDownloadButton.tsx`: cambiar color de ambas variantes + agregar prop `size`.
3. `SaleInvoicesSection.tsx`: reemplazar `<button>` PDF por `DownloadPdfButton`.
4. `LedgerPage.tsx` y `PaymentsHistoryPage.tsx`: migrar a `PageShell`.
5. `designer.md`: actualizar documentación de `PdfDownloadButton` y cerrar el pendiente de auditoría.
6. Verificar `npm run build` + `tests/unit/ui/design-system/tokens.test.ts` + inspección visual (Playwright) de las rutas listadas en `proposal.md` § Impact.

Sin necesidad de rollback plan especial: son ediciones de UI sin estado persistente ni migración de datos; revertir es `git revert` del commit.

## Open Questions

Ninguna — el plan fue aprobado por el usuario antes de este proposal (ver `/Users/kevdany17/.claude/plans/feture-revisa-el-spec-nifty-anchor.md`) y no quedaron decisiones pendientes de las historias de usuario.

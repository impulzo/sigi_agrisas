## 1. Logo +40%

- [x] 1.1 `app/(private)/sales/_blocks/PrintableTicket.tsx:35`: cambiar `width: 75px; height: 105px` a `width: 105px; height: 147px` en el bloque `@media print`.
- [x] 1.2 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx:92-96`: cambiar clases `h-[105px] w-[75px]` a `h-[147px] w-[105px]`, sin tocar `mb-[4.8px]` ni el padding del contenedor (`p-6`/`pb-4`).

## 2. Régimen fiscal completo

- [x] 2.1 `app/(private)/settings/_blocks/TicketSettingsForm.tsx`: reemplazar el `<input type="text">` de régimen fiscal (líneas ~133-146) por `SatCatalogCombobox` (`app/_components/molecules/SatCatalogCombobox/SatCatalogCombobox.tsx`) con `catalog="regimen-fiscal"`, mismo patrón que `CustomerEditModal.tsx:386-396`.
- [x] 2.2 Al seleccionar una opción, construir `businessTaxRegime = \`${code} — ${description}\`` antes de guardarlo en el estado del formulario. Nota de desviación: `SatCatalogCombobox.onChange` sólo exponía `code` (no `description`); se extendió su firma a `onChange(value: string, description?: string)` — cambio backward-compatible (el único otro call-site, `CustomerEditModal`, pasa `setTaxRegime` de un solo argumento, que sigue siendo válido como handler).
- [x] 2.3 Cargar el valor existente como texto libre en el campo al abrir el formulario (sin forzar re-selección ni validar contra el catálogo en `mode` de lectura/carga inicial) — ya es el comportamiento nativo del combobox (`value` prop sólo siembra `query`/`selected` inicial, sin validar).
- [x] 2.4 Confirmado: `SettingsController.ts:21` ya usa `z.string().max(120).nullable().optional()` sin regex; `PrismaTicketSettingsRepository` no requiere cambios.

## 3. Mensaje final fiel a settings

- [x] 3.1 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` líneas ~186-195: eliminar el fallback hardcodeado `"¡Gracias por su compra! / Agricultura Sana & Sustentable."`; renderizar el párrafo de footer condicionalmente igual que `PrintableTicket.tsx:124-126` (`{ticketSettings?.footerText && <p>...</p>}`).
- [x] 3.2 Confirmar que `legendText` ya sigue el mismo patrón condicional correcto (sin cambios necesarios ahí).

## 4. Tests

- [x] 4.1 Test RTL de `PrintableTicket`/`TicketPreviewPage`: el `<img>` del logo tiene `width`/`height` (o clases) correspondientes a 105×147px.
- [x] 4.2 Test RTL de `TicketSettingsForm`: seleccionar una opción del combobox de régimen fiscal envía `businessTaxRegime` como `"<code> — <description>"`; un valor precargado como código suelto (`"612"`) se muestra sin error.
- [x] 4.3 Test RTL de `TicketPreviewPage`: con `footerText: null`, no se renderiza ningún párrafo de footer (ni el texto hardcodeado anterior ni ningún placeholder); con `footerText: "X"`, se renderiza exactamente `"X"`.
- [x] 4.4 `tests/unit/ui/(private)/settings/TicketSettingsForm.test.tsx` (ya existente): actualizado para el nuevo combobox en vez del input libre (mock de `useSatCatalogSearch` agregado).

## 5. Verificación manual

- [x] 5.1 `/settings` → seleccionar régimen fiscal del catálogo SAT, guardar.
- [x] 5.2 `/sales/[id]/ticket` → vista previa: logo visiblemente más grande sin desplazar el bloque de negocio/folio; régimen fiscal completo; footer vacío no muestra ningún texto de relleno.
- [x] 5.3 Confirmado vía `PrintableTicket.tsx` (mismo componente, montado oculto `hidden print:block`, con la regla `@media print` ya actualizada a 105×147px) — mismo régimen fiscal completo, verificado por RTL (4.1) y código; no se ejecutó `window.print()` interactivo (no aplica a un entorno headless).
- [x] 5.4 Configurar un mensaje final personalizado en `/settings` → confirmado que la vista previa lo muestra exactamente ("Gracias por su compra en Agrisas"), y que vaciar el campo hace desaparecer el párrafo por completo (no texto de ejemplo).

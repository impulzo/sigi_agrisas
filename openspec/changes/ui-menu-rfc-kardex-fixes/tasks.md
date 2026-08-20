## 1. Menú (NavigationRail + TopAppBar)

- [x] 1.1 Quitar el item `dashboard` (`label: "Inicio"`) de `primaryItems` en `app/_components/organisms/NavigationRail/items.ts`.
- [x] 1.2 Quitar los items `support` y `account` de `secondaryItems` en el mismo archivo, dejando únicamente `settings`.
- [x] 1.3 Quitar el `IconButton icon="notifications"` de `app/_components/organisms/TopAppBar/TopAppBar.tsx`.
- [x] 1.4 Actualizar `tests/unit/ui/_components/organisms/NavigationRail.test.tsx`: eliminar/ajustar los casos que buscan el link "Inicio" y el caso "Support y Account siguen visibles sin depender de can()".
- [x] 1.5 Actualizar `tests/unit/ui/_components/organisms/TopAppBar.test.tsx`: quitar la aserción que espera el botón "Notificaciones".

## 2. RFC opcional en quick-add (Clientes en POS)

- [x] 2.1 En `app/(private)/pos/_logic/schemas/customerQuickAdd.schema.ts`, agregar `.optional()` al campo `rfc`.
- [x] 2.2 En `app/(private)/pos/_blocks/CustomerQuickAddModal.tsx`: quitar el asterisco del label "RFC *" → "RFC", y enviar `rfc` condicionalmente en `input` (sólo si `form.rfc.trim()` no está vacío), igual que `legalName`/`taxRegime`.

## 3. RFC opcional en quick-add (Proveedores en Compras)

- [x] 3.1 En `app/(private)/purchases/_logic/schemas/providerQuickAdd.schema.ts`, agregar `.optional()` al campo `rfc` (mismo cambio que 2.1).
- [x] 3.2 En `app/(private)/purchases/_blocks/ProviderQuickAddModal.tsx`: mismo cambio que 2.2 (label sin asterisco, envío condicional de `rfc`).

## 4. Kardex de Inventario — márgenes

- [x] 4.1 En `app/(private)/inventory/kardex/_blocks/KardexPage.tsx`, envolver el contenido en `PageShell` (`title="Kardex de Inventario"`, `description="Historial de movimientos por artículo."`, `backHref="/inventory"`), eliminando el header manual y el wrapper `<div className="flex flex-col gap-6">` sin las clases de spacing estándar. Los early-returns de `loading`/`sin acceso` quedan fuera de `PageShell`, igual que en `SalesCutPage`.

## 5. Verificación

- [x] 5.1 Correr `npm test -- tests/unit/ui/_components/organisms/NavigationRail.test.tsx tests/unit/ui/_components/organisms/TopAppBar.test.tsx` y confirmar que pasan.
- [x] 5.2 Correr `npm test -- tests/unit/ui` completo por si hay otro test que referencie "Inicio"/"Support"/"Account"/"Notificaciones".
- [x] 5.3 Correr `npm run build` y confirmar que no hay errores de tipos (el `.optional()` en Zod cambia el tipo inferido de `rfc`; verificar que `createCustomer`/`createProvider` lo aceptan sin error).
- [x] 5.4 Verificación manual en navegador: `/pos` quick-add cliente sin RFC crea correctamente; `/purchases` quick-add proveedor sin RFC crea correctamente; menú lateral sin "Inicio"/"Support"/"Account"; TopAppBar sin ícono de notificaciones; `/inventory/kardex` con márgenes iguales a `/reports/sales-cut`.

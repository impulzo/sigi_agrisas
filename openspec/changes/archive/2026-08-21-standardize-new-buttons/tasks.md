## 1. Button atom soporta navegación

- [x] 1.1 Agregar prop opcional `href?: string` a `app/_components/atoms/Button/Button.tsx`; cuando está presente, renderizar `next/link` con las mismas clases de `variantClasses`/`sizeClasses` e ícono que el renderizado como `<button>` (mismo `iconPosition`); `loading` no aplica en modo `href`.
- [x] 1.2 Verificar con `npm run build` que el tipado del componente sigue siendo válido para los usos existentes (Roles, Inventory) que no pasan `href`.

## 2. Nuevo componente compartido CreateButton

- [x] 2.1 Crear `app/_components/molecules/CreateButton/CreateButton.tsx`: envuelve `Button` con `variant="filled"` e `icon="add"` fijos; props `label: string` (obligatoria), `onClick?: () => void`, `href?: string`.
- [x] 2.2 Agregar `designer.md` § "Catálogo de primitivas" — nueva subsección `molecules/CreateButton` (después de `atoms/Button`) documentando el contrato de props y la regla: todo botón de creación de recurso usa `CreateButton`, no `Button` directo con `variant="filled"`+`icon="add"`.

## 3. CatalogToolbar delega en CreateButton

- [x] 3.1 En `app/(private)/catalogs/_blocks/CatalogToolbar.tsx`, reemplazar el `<button>` hardcodeado (clases `rounded-md bg-primary ...`) por `<CreateButton label={createButtonLabel} onClick={onCreate} />`.
- [x] 3.2 Correr `npx jest tests/unit/ui/design-system/tokens.test.ts` y confirmar que pasa.
- [x] 3.3 Retirar `"app/(private)/catalogs/_blocks/CatalogToolbar.tsx"` de `RAW_ELEMENT_ALLOWLIST` en `tests/unit/ui/design-system/tokens.test.ts` (era su único raw element) y re-correr el test para confirmar que sigue en verde.

## 4. Labels explícitos por catálogo

- [x] 4.1 `app/(private)/catalogs/payment-methods/_blocks/PaymentMethodsPage.tsx:177` — pasar `createButtonLabel="Nuevo método de pago"`.
- [x] 4.2 `app/(private)/catalogs/folios/_blocks/FoliosPage.tsx:179` — pasar `createButtonLabel="Nuevo folio"`.
- [x] 4.3 `app/(private)/catalogs/departments/_blocks/DepartmentsPage.tsx:179` — pasar `createButtonLabel="Nuevo departamento"`.
- [x] 4.4 `app/(private)/catalogs/branches/_blocks/BranchesPage.tsx:177` — pasar `createButtonLabel="Nueva sucursal"`.
- [x] 4.5 `app/(private)/catalogs/providers/_blocks/ProvidersPage.tsx:187` — pasar `createButtonLabel="Nuevo proveedor"`.
- [x] 4.6 `app/(private)/catalogs/tax-rates/_blocks/TaxRatesPage.tsx:138` — pasar `createButtonLabel="Nueva tasa de impuesto"`.
- [x] 4.7 Confirmar que `products`, `customers`, `vehicles`, `drivers` no requieren cambio de texto (ya pasan label correcto) — sólo revisar visualmente que heredan el nuevo look vía `CatalogToolbar`/`CreateButton`.

## 5. Users y Roles

- [x] 5.1 `app/(private)/users/_blocks/UsersToolbar.tsx:40-48` — reemplazar el `<button>` hardcodeado por `<CreateButton label="Nuevo usuario" onClick={onCreateClick} />` (ícono pasa de `person_add` a `add`, fijo en `CreateButton`). No retirar este archivo de la allowlist de `tokens.test.ts` — conserva otros raw `<button>` sin relación con este cambio.
- [x] 5.2 `app/(private)/roles/_blocks/RolesPage.tsx:138` — reemplazar `<Button icon="add">Crear Nuevo Rol</Button>` por `<CreateButton label="Nuevo rol" onClick={...} />` (mismo `onClick` que ya tenía el `Button`).

## 6. Navegación a rutas /new

- [x] 6.1 `app/(private)/quotes/_blocks/QuotesToolbar.tsx:107-114` — reemplazar el `<Link>` por `<CreateButton label="Nueva cotización" href="/quotes/new" />` (deja de ser tonal/`secondary-container`, pasa a `filled` por default de `CreateButton`).
- [x] 6.2 `app/(private)/quotes/_blocks/QuotesEmpty.tsx:18-23` — mismo reemplazo: `<CreateButton label="Nueva cotización" href="/quotes/new" />`.
- [x] 6.3 `app/(private)/purchases/_blocks/PurchasesToolbar.tsx:136-143` — reemplazar el `<Link>` por `<CreateButton label="Nueva compra" href="/purchases/new" />`.
- [x] 6.4 `app/(private)/billing/_blocks/BillingListPage.tsx:77-84` — reemplazar el `<Link>` por `<CreateButton label="Nueva factura" href="/billing/new" />`.
- [x] 6.5 `app/(private)/waybills/_blocks/WaybillsListPage.tsx:111-118` — reemplazar el `<Link>` por `<CreateButton label="Nuevo traspaso" href="/waybills/new" />` (quita el "+" literal).

## 7. Inventory

- [x] 7.1 `app/(private)/inventory/_blocks/InventoryPage.tsx:176-183` — reemplazar `<Button icon="add" onClick={...}>Asignar producto</Button>` por `<CreateButton label="Asignar producto" onClick={...} />` (mismo texto, ahora vía el componente compartido).

## 8. Quick-add de proveedor

- [x] 8.1 `app/(private)/purchases/_blocks/ProviderPicker.tsx:42-48` — quitar el "+" literal del texto del botón, anteponer `<Icon name="add" size={14} />`, texto final "Nuevo proveedor". Mantener el `<button>` propio (NO usar `CreateButton`) para no romper el layout del footer del combobox.

## 9. Verificación

- [x] 9.1 `npm run build` completo (verifica tipos, incluyendo el nuevo prop `href` en `Button` y el componente `CreateButton`).
- [x] 9.2 `npm test` completo — confirmar que `tests/unit/ui/design-system/tokens.test.ts` sigue en verde tras retirar `CatalogToolbar.tsx` de la allowlist.
- [x] 9.3 Recorrido manual en dev server por `/catalogs/*` (los 10 catálogos), `/users`, `/roles`, `/inventory`, `/quotes` (toolbar + empty state), `/purchases`, `/billing`, `/waybills`: confirmar mismo color/forma/ícono en el botón de creación, texto con género correcto (incluye "Nuevo usuario" y "Nuevo rol"), y que los que navegan (`href`) enruten bien y los que abren modal (`onClick`) sigan abriendo su modal.
- [x] 9.4 Confirmar que ningún botón de creación de recurso en `app/(private)/**/_blocks/` instancia `Button` directamente con `variant="filled"`+`icon="add"` — todos pasan por `CreateButton` (grep manual de `variant="filled"` combinado con `icon="add"` fuera de `CreateButton.tsx`).

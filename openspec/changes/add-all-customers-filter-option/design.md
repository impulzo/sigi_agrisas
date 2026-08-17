## Context

`CustomerFilterCombobox.tsx:14` construye sus `options` únicamente a partir de `items` de `useCustomerSearch({ search: debounced })`. Ambos consumidores (`SalesByProductBreakdownCard.tsx:45`, `CollectionsFilters.tsx:46`) ya inicializan su estado `customerId` en `""` — el backend ya trata `customerId` vacío/ausente como "todos". Falta solo que la UI represente ese estado con una opción visible en vez de un campo en blanco sin explicación. Responde a la única fila de la Historia de Usuario en `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Opción "Todos los clientes" (`value: ""`) siempre presente como primera entrada cuando el combobox no tiene una búsqueda activa.
- Cero cambios en los consumidores — el fix vive enteramente en el componente compartido.

**Non-Goals:**
- No se cambia el contrato de `customerId` en ningún endpoint (`sales-by-product`, `customer-collections`) — sigue opcional, vacío = todos.
- No se añade "Todos los clientes" como resultado de búsqueda por texto (ej. buscar "todos") — es una entrada fija de estado inicial, no un resultado de `useCustomerSearch`.

## Decisions

**D1 — Anteponer la opción sentinel en `CustomerFilterCombobox`, no en `Combobox` genérico.**
`Combobox.tsx` es un átomo reutilizado por otras pantallas (productos, proveedores, etc.) sin noción de "todos" — agregar la opción ahí acoplaría un concepto de dominio (clientes) a un componente genérico. `CustomerFilterCombobox` ya es la capa de dominio correcta (encapsula `useCustomerSearch`), es el lugar natural para el sentinel.

**D2 — Mostrar "Todos los clientes" solo cuando no hay búsqueda de texto activa (`query === ""`), no mezclado con resultados de `useCustomerSearch`.**
Evita que aparezca una fila fuera de contexto en medio de resultados de una búsqueda real por nombre/código — el usuario que está buscando un cliente específico no necesita ver "Todos los clientes" entre los resultados.

**D3 — Sin loading state adicional.**
La opción sentinel es estática (no depende de fetch); se antepone de forma síncrona a `options` sin afectar `isLoading` del combobox.

## Risks / Trade-offs

- **[Riesgo]** Si en el futuro un cliente real llegara a tener `id === ""` (no debería ocurrir — los IDs son UUID `@default(uuid())`), colisionaría con el sentinel. → **Mitigación:** no aplica en la práctica; `customers.id` es `String @id @default(uuid())`, Prisma nunca genera cadena vacía.

## Migration Plan

No aplica — cambio de solo UI, sin migración de datos ni flag de despliegue.

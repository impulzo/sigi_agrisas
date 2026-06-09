## Why

El cliente entregó un Excel (`INVENTARIO PARA SISTEMA NUEVO.xlsx`) con su catálogo real de **491 productos agrícolas** clasificados en **35 departamentos/líneas comerciales**. Hoy no existe forma de cargar esa data: el único seed (`prisma/seed.ts`) sólo siembra RBAC. Sin productos, departamentos, sucursal matriz e inventario inicial, los módulos POS, Cotizaciones, Devoluciones e Inventario quedan vacíos y no se pueden operar en entornos limpios (dev, staging, instalaciones nuevas). Necesitamos un seed reproducible e idempotente que cargue el catálogo del cliente con un solo comando.

## What Changes

- Agregar `xlsx` (SheetJS) como `devDependency` para parsear archivos `.xlsx`.
- Crear `prisma/seeds/inventory.ts`: script TypeScript autocontenido que lee el Excel y siembra Departamentos, Productos, ProductPrice default placeholder, Sucursal Matriz y BranchInventory inicial en 0.
- Agregar script `seed:inventory` en `package.json` (`ts-node prisma/seeds/inventory.ts`).
- El seed es idempotente: re-ejecutarlo no duplica registros ni pisa stock real ni precios capturados manualmente.
- El seed **NO** toca el RBAC seed existente (`prisma/seed.ts` permanece sin cambios).
- Política de normalización suave de códigos: la `CLAVE` del Excel se transforma (`Ñ → N`, espacios y `-` → `_`, `*` eliminado, otros chars descartados) antes de validar contra `^[A-Z0-9_]{1,32}$`. Cuando el code resulta modificado, se emite warning informativo con el mapeo `CLAVE → code`. Filas con code vacío tras normalizar o colisión con un code ya tomado en la corrida se omiten con warning.
- Campo `SerLibres` del Excel se ignora por completo (siempre vale 0 y no aporta valor al dominio).

## Capabilities

### New Capabilities

- `data-seeding`: Define las reglas de carga inicial de catálogos (departamentos, productos, precios placeholder, sucursal matriz, inventario inicial) desde el Excel del cliente. Cubre el mapeo de columnas Excel→Prisma, la política de validación de códigos, idempotencia y el comando operativo.

### Modified Capabilities

<!-- Ninguna. Los modelos Department, Product, ProductPrice, Branch y BranchInventory ya están especificados en sus respectivas capabilities (admin-departments, products-api, admin-branches, inventory-api). El seed sólo llena tablas existentes y no cambia contratos. -->

## Impact

- **Código**: `prisma/seeds/inventory.ts` (nuevo, ~250 líneas), `package.json` (script + dep).
- **Dependencias**: añade `xlsx` a `devDependencies`.
- **Datos**: tras ejecutar, 35 departamentos + 491 productos + 491 precios placeholder + 1 sucursal Matriz HQ + 491 filas de BranchInventory en 0.
- **APIs / UI**: ninguna; los endpoints y pantallas existentes (`/catalogs/products`, `/catalogs/departments`, `/catalogs/branches`, `/inventory`) sólo observarán la data sembrada.
- **Operativo**: el script vive afuera de CI y se ejecuta manualmente al provisionar un entorno nuevo. Requiere que la DB ya tenga aplicadas las migraciones de Prisma.
- **Riesgo**: si una HQ distinta a `MATRIZ` ya existe en la DB, el seed aborta con error claro (el partial unique `branches_hq_idx` lo bloquearía igualmente).

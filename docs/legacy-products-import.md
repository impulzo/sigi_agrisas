# Importación de productos legacy

Guía operativa para importar el catálogo de productos del sistema legacy a las nuevas
tablas `products`, manteniendo la semántica de las columnas heredadas.

> **La importación es manual y NO se ejecuta automáticamente.** El schema Prisma crea las
> tablas vacías; el cliente decide cuándo y cómo cargar el histórico. No forma parte de
> ninguna migración.

## Mapeo de columnas

| Columna legacy        | Columna nueva        | Transformación                                              |
|-----------------------|----------------------|-------------------------------------------------------------|
| `CLAVE`               | `code`               | `UPPER(TRIM(...))` — debe cumplir `^[A-Z0-9_]{1,32}$`       |
| `Nombre`              | `name`               | `TRIM(...)`                                                 |
| `Unidad`              | `unit`               | `TRIM(...)` (texto libre)                                  |
| `Iva` (0–100)         | `iva_rate` (0–1)     | `NULLIF(Iva, 0) / 100.0`                                    |
| `Ieps` (0–100)        | `ieps_rate` (0–1)    | `NULLIF(Ieps, 0) / 100.0`                                   |
| `NombreDepartamento`  | `department_id`      | `JOIN departments ON LOWER(name) = LOWER(TRIM(...))`        |

`NULLIF(rate, 0)` convierte una tasa `0` a `NULL` para diferenciar **"no aplica"** (`NULL`)
de **"exento con trazabilidad"** (`0.0000`). Si tu negocio necesita persistir el 0% explícito
para algún producto, ajústalo después de la importación con un `UPDATE` puntual.

## Procedimiento

1. **Sincroniza departamentos primero.** Todo `NombreDepartamento` del CSV legacy debe existir
   ya como `departments.name` (case-insensitive). Los productos cuyo departamento no exista
   se descartan silenciosamente en el `JOIN` (ver "Errores comunes").

2. **Carga el CSV/dump legacy a una tabla temporal** `legacy_products` con, al menos, las
   columnas `clave`, `nombre`, `unidad`, `iva`, `ieps`, `nombredepartamento`. Por ejemplo:

   ```sql
   CREATE TEMP TABLE legacy_products (
     clave              TEXT,
     nombre             TEXT,
     unidad             TEXT,
     iva                NUMERIC,
     ieps               NUMERIC,
     nombredepartamento TEXT
   );
   \copy legacy_products FROM 'productos_legacy.csv' WITH (FORMAT csv, HEADER true);
   ```

3. **Ejecuta el INSERT de mapeo** (idempotente vía `ON CONFLICT (code) DO NOTHING`):

   ```sql
   INSERT INTO products (id, code, name, unit, iva_rate, ieps_rate, department_id, is_active, created_at, updated_at)
   SELECT
     gen_random_uuid()::text                          AS id,
     UPPER(TRIM(l.clave))                             AS code,
     TRIM(l.nombre)                                   AS name,
     TRIM(l.unidad)                                   AS unit,
     NULLIF(l.iva, 0) / 100.0                         AS iva_rate,
     NULLIF(l.ieps, 0) / 100.0                        AS ieps_rate,
     d.id                                             AS department_id,
     TRUE                                             AS is_active,
     NOW()                                            AS created_at,
     NOW()                                            AS updated_at
   FROM legacy_products l
   JOIN departments d ON LOWER(d.name) = LOWER(TRIM(l.nombredepartamento))
   ON CONFLICT (code) DO NOTHING;
   ```

   > `products.id` es `TEXT` (UUID generado por la app). `gen_random_uuid()::text` produce un
   > valor compatible. Requiere la extensión `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`).

4. **Verifica el conteo importado**:

   ```sql
   -- Filas en el origen
   SELECT COUNT(*) AS legacy_total FROM legacy_products;
   -- Filas que NO se importaron por departamento faltante
   SELECT DISTINCT l.nombredepartamento
   FROM legacy_products l
   LEFT JOIN departments d ON LOWER(d.name) = LOWER(TRIM(l.nombredepartamento))
   WHERE d.id IS NULL;
   -- Productos ya cargados
   SELECT COUNT(*) AS products_total FROM products;
   ```

5. **Limpia** la tabla temporal: `DROP TABLE legacy_products;`.

## Errores comunes

- **Departamentos faltantes** → el `JOIN` descarta el producto. Soluciónalo creando el
  departamento (con su `code` propio) y re-ejecutando el INSERT (es idempotente).
- **`code` duplicado** → `ON CONFLICT DO NOTHING` ignora la fila. Si necesitas actualizar
  un producto existente, hazlo con un `UPDATE` explícito; el import no sobrescribe.
- **`code` que no cumple el regex** (`^[A-Z0-9_]{1,32}$`, p. ej. claves con espacios o `-`)
  → la fila entra en BD pero la API rechazará editarla por validación Zod. Normaliza las
  claves problemáticas antes de importar.

## Campos que NO migran automáticamente

El sistema legacy no tenía un modelo equivalente para estos conceptos, por lo que **no se
importan** y deben capturarse aparte:

| Concepto              | Tabla destino            | Cómo poblarlo                                                       |
|-----------------------|--------------------------|---------------------------------------------------------------------|
| Precios de venta      | `product_prices`         | Captura manual vía `POST /api/v1/admin/products/:id/prices`, o un import posterior. Recuerda marcar exactamente **un** precio `is_default = true` por producto para que el cálculo de dosificación funcione. |
| Dosificaciones        | `product_dosifications`  | Captura manual vía `POST /api/v1/admin/products/:id/dosifications` (`num_parts >= 2`). El precio por dosis se calcula sobre el precio default + 7% fijo. |
| Stock por sucursal    | `branch_inventory`       | Captura inicial vía `POST /api/v1/admin/branches/:branchId/inventory` (set absoluto) y ajustes posteriores vía `.../adjust` (delta atómico). No hay stock global. |
| `sat_product_code`    | `products.sat_product_code` | Opcional. Clasifícalo después si vas a facturar; formato `^\d{8}$`. |

Si el cliente dispone de un export legacy de precios/stock, se puede preparar un INSERT de
mapeo análogo al de productos en un paso posterior, respetando los CHECK constraints
(`price >= 0`, `min_quantity >= 1`, `num_parts >= 2`, `quantity >= 0`).

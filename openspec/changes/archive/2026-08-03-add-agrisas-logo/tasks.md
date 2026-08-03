## 1. NavigationRail

- [x] 1.1 Reemplazar el `<span>A</span>` del header fijo en `app/_components/organisms/NavigationRail/NavigationRail.tsx` por `next/image` apuntando a `/logo.png`, con `alt="Agrisas"` y contenedor dimensionado (`object-contain`, ancho acorde a `w-[80px]` del rail)

## 2. TopAppBar

- [x] 2.1 Agregar el logo (`next/image`, `/logo.png`) junto al `<h1>Agrisas</h1>` en `app/_components/organisms/TopAppBar/TopAppBar.tsx`, sin romper el layout flex existente (`gap-md`)

## 3. Auth layout (login/registro)

- [x] 3.1 Agregar el logo (`logo.png`) en el panel izquierdo de `app/(public)/auth/layout.tsx`, encima o junto a la ilustración SVG y el título "Agrisas" existentes, preservando el comportamiento responsive (`lg:flex` / apilado en <1024px)

## 4. Favicon global

- [x] 4.1 Declarar `icons: { icon: "/logo.png" }` (o forma equivalente soportada) en el objeto `metadata` de `app/layout.tsx`

## 5. Verificación

- [x] 5.1 Levantar `npm run dev`, revisar visualmente `/dashboard` (NavigationRail + TopAppBar), `/auth/login`, `/auth/register` y el favicon de la pestaña del navegador
- [x] 5.2 Revisar que ningún test unitario bajo `tests/unit/ui/` que referencie el placeholder "A" o el SVG del auth layout quede roto; actualizar si aplica
- [x] 5.3 `npm run build` para confirmar que no hay errores de tipos ni de optimización de imagen (`next/image` requiere dominio/local válido, ya es local así que no requiere config extra)

## 6. Corrección: logo reemplaza texto/ilustración (no coexisten)

- [x] 6.1 En `TopAppBar.tsx`, quitar el `<h1>Agrisas</h1>`; dejar sólo el logo junto al `SearchInput`
- [x] 6.2 En `app/(public)/auth/layout.tsx`, quitar el `<svg>` agrícola y el `<h1>Agrisas</h1>`; dejar sólo el logo (agrandado) y el subtítulo "Gestión agrícola inteligente"
- [x] 6.3 Re-correr tests unitarios de `TopAppBar` y build para confirmar que no quedan referencias rotas

## 7. Corrección: sólo logo en panel de auth, fondo más claro

- [x] 7.1 En `app/(public)/auth/layout.tsx`, quitar el `<p>Gestión agrícola inteligente</p>`; el panel izquierdo queda con únicamente el logo
- [x] 7.2 En `app/(public)/auth/layout.module.css`, aclarar el gradiente `.leftPanel` (stops `#1a4d42`/`#2a6b5f` → `#2a6b5f`/`#5fae97`) para que el logo se distinga sobre el fondo
- [x] 7.3 Verificar visualmente `/auth/login` y build sin errores

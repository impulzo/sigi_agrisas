# navigation-rail-ui Specification

## Purpose
TBD - created by archiving change fix-ticket-preview-print-and-nav-rail. Update Purpose after archive.
## Requirements
### Requirement: Contención del hover/activo en el NavigationRail
Cada ítem del `NavigationRail` (primario, hijo de `RailParentItem` a nivel de padre, secundario, y el botón de logout) SHALL renderizar su ícono y etiqueta completamente contenidos dentro del fondo resaltado de hover/activo, sin desbordar visualmente fuera de él, independientemente de la longitud de la etiqueta.

#### Scenario: Etiquetas largas hacen wrap dentro del contenedor
- **WHEN** el usuario pasa el mouse (hover) o navega a un ítem con etiqueta larga ("Configuración", "Cotizaciones", "Devoluciones", "Facturación")
- **THEN** el texto de la etiqueta hace wrap a 2 líneas dentro del contenedor y no se renderiza fuera del fondo redondeado (`bg-surface-container-highest` en hover, `bg-primary-container` en activo)

#### Scenario: El contenedor agrandado sigue cabiendo dentro del rail
- **WHEN** se agranda el contenedor de hover/activo de cada ítem
- **THEN** el rail (`w-[80px]` fijo) no presenta overflow horizontal ni el contenedor se pega al borde del rail

### Requirement: Tamaño de fuente uniforme entre todos los ítems del rail
Todos los ítems del `NavigationRail` (incluidos los primarios, el botón de logout, y cualquier ítem futuro que siga el mismo patrón) SHALL usar la misma clase de tamaño de fuente para su etiqueta.

#### Scenario: Comparación visual de tamaño entre ítems
- **WHEN** se comparan las etiquetas de distintos ítems del rail, incluido "Ventas" y el botón "Salir" del footer
- **THEN** todos usan la misma clase de tamaño de fuente (`text-label-sm`) — ningún ítem tiene un tamaño de texto distinto a los demás


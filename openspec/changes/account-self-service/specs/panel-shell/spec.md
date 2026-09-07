## MODIFIED Requirements

### Requirement: NavigationRail organism con destinos primarios y secundarios

`app/_components/organisms/NavigationRail/NavigationRail.tsx` SHALL renderizar una barra vertical fija de 80px de ancho, alto completo, con: logo Agrisas arriba, los destinos primarios del panel (`POS`, `Inventario`, `Facturación`, entre otros — ver el requirement `Navigation rail item catalogue` para la lista completa y su orden) en el centro, y los destinos secundarios abajo (`Mi cuenta`, siempre visible; `Configuración`, condicional a `settings:read`). Cada destino es un `<Link>` (Next.js) con icono Material Symbols + label `label-sm`. El active state SHALL aplicar `bg-primary-container text-on-primary-container rounded-xl scale-90` al destino cuya ruta coincida con `usePathname()`. Por usar `usePathname`, el componente SHALL ser client component (`"use client"`).

#### Scenario: Dashboard ya no aparece como destino del rail
- **WHEN** se inspecciona el HTML del NavigationRail
- **THEN** NO contiene ningún enlace con `href="/dashboard"`; el primer destino primario visible es `pos` (`href="/pos"`)

#### Scenario: Destinos secundarios para usuario con settings:read
- **WHEN** se inspecciona el HTML del NavigationRail y el usuario tiene `settings:read`
- **THEN** contiene el enlace a `/account` con icono `account_circle` y el enlace a `/settings` con icono `settings` ubicado con `mt-auto`; NO contiene enlace a `/support`

#### Scenario: Mi cuenta visible sin ningún permiso adicional
- **WHEN** se inspecciona el HTML del NavigationRail para un usuario autenticado sin `settings:read`
- **THEN** contiene el enlace a `/account` (sin `requires`, visible a cualquier usuario autenticado); el enlace a `/settings` no se renderiza

#### Scenario: Active state en la ruta actual
- **WHEN** el usuario está en `/pos`
- **THEN** el enlace a POS tiene clases `bg-primary-container text-on-primary-container` y los otros destinos no

#### Scenario: Navegación con click
- **WHEN** el usuario hace click en el destino "POS"
- **THEN** el router navega a `/pos` usando `next/link`

#### Scenario: NavigationRail no hace fetch ni accede a storage
- **WHEN** se inspecciona el archivo
- **THEN** no importa `fetch`, `axios`, `localStorage`, `sessionStorage` ni `document`

## MODIFIED Requirements

### Requirement: NavigationRail organism con destinos primarios y secundarios

La lista de destinos primarios del `NavigationRail` SHALL incluir el siguiente item adicional entre `returns` y `inventory`:

6. `payments` (icon `"payments"`, href `/payments`, label `"Abonos"`, declares `requires: "payments:read"`).

El orden completo de destinos primarios queda:
1. `dashboard` — sin `requires`
2. `pos` — `sales:create`
3. `sales` — `sales:read`
4. `quotes` — `quotes:read`
5. `returns` — `returns:read`
6. `payments` — `payments:read`  ← **NUEVO**
7. `inventory` — `inventory:read`
8. `catalogs` — children (sin `requires` propio)
9. `users` — `users:read`
10. `roles` — `roles:read`

El comportamiento de visibilidad es idéntico al resto: se oculta cuando `can("payments:read") === false`, se muestra optimistamente mientras `can("payments:read") === "loading"`.

#### Scenario: Usuario con payments:read ve el item Abonos

- **WHEN** las permissions efectivas del usuario incluyen `payments:read`
- **THEN** el rail renderiza el item con label "Abonos", href `/payments`, icon `payments` entre "Devoluciones" e "Inventario"

#### Scenario: Usuario sin payments:read no ve el item

- **WHEN** las permissions efectivas del usuario NO incluyen `payments:read` y el check ha resuelto
- **THEN** el rail NO renderiza el item "Abonos"

#### Scenario: Item se muestra optimistamente durante loading

- **WHEN** `can("payments:read")` devuelve `"loading"` (check en vuelo)
- **THEN** el item "Abonos" es visible (comportamiento optimista, evita layout shift)

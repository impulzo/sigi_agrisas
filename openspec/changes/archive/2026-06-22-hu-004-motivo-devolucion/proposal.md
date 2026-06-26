## Why

El campo `reason` ya existe en la entidad `Return` (TEXT, 3–500 chars, requerido). Sin embargo, la HU-004 solicita formalizar que el motivo sea obligatorio, visible en historial, y que NO sea editable post-confirmación excepto por Administrador. El tercer punto (edición por Admin) no está contemplado en la spec actual ni en la UI. Esta change cierra ese gap documental y agrega el control de inmutabilidad del motivo.

## What Changes

- Documentar explícitamente en `returns-api` spec que `reason` es inmutable post-creación (ningún endpoint permite PATCH de un return existente; confirmación de que no existe endpoint de edición)
- Agregar requerimiento de que el campo `reason` sea visible en el detalle (`/returns/[id]`) y en el listado exportable (ya existe en `ReturnMetaPanel`, formalizar en spec)
- (Diferido) El permiso para que Admin modifique el motivo post-confirmación requiere un endpoint `PATCH /returns/:id/reason` con permiso `returns:admin_edit` — se marca como fuera de alcance de esta change (requiere change separada + permiso RBAC nuevo)

## Capabilities

### New Capabilities

_(ninguna; comportamiento ya implementado)_

### Modified Capabilities

- `returns-api`: formalizar inmutabilidad de `reason` + escenario de intento de edición
- `returns-ui`: formalizar que `reason` es visible en `ReturnMetaPanel` del detalle y en exports futuros

## Impact

- **Sin cambios de código**: todo el comportamiento ya existe; esta change es documental y de spec
- **Alineación de expectativas**: CS-3 de la HU ("motivo no modificable salvo Admin") se declara fuera de alcance para V1

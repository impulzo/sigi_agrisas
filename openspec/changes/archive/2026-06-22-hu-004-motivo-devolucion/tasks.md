## 1. Backend — formalizar validación de reason

- [x] 1.1 Verificar que el schema Zod en `ReturnsController.create` valida `reason: z.string().trim().min(3).max(500)` — agregar si falta
- [x] 1.2 Verificar que `reason` vacío o whitespace-only devuelve HTTP 400 `ReturnReasonRequired`; agregar test si falta
- [x] 1.3 Confirmar que no existe endpoint `PATCH /returns/:id` (no crear); documentar en spec si falta

## 2. Tests unitarios backend

- [x] 2.1 Test: `POST /returns` sin `reason` → 400 `ReturnReasonRequired`
- [x] 2.2 Test: `POST /returns` con `reason: "   "` (whitespace) → 400
- [x] 2.3 Test: `POST /returns` con `reason` de 500 chars → 201 (aceptado)
- [x] 2.4 Test: `POST /returns` con `reason` de 501 chars → 400

## 3. Frontend — ReturnMetaPanel

- [x] 3.1 Verificar que `ReturnMetaPanel` en `/returns/[id]` muestra campo "Motivo de devolución" con `className="whitespace-pre-line"` — agregar si falta
- [x] 3.2 Confirmar que el campo `reason` está siempre visible (no condicionado a null) en el template

## 4. Frontend — validación cliente

- [x] 4.1 Verificar que el schema Zod cliente en `app/(private)/returns/_logic/schemas/` valida `reason: z.string().trim().min(3, "El motivo es obligatorio (mín. 3 caracteres)").max(500)` — agregar/corregir si falta
- [x] 4.2 Verificar que el error inline aparece en `CreateReturnPage` antes de dispatch cuando reason vacío

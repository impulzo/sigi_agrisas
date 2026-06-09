## 1. Servicio de logout

- [x] 1.1 Crear `app/(public)/auth/_logic/services/logout.ts` que llama `POST /api/v1/auth/logout` con `authFetch` (o `fetchImpl` inyectado), ejecuta `sessionStorage.removeItem("accessToken")` incluso si el request falla, y devuelve `void`

## 2. Hook `useLogout`

- [x] 2.1 Crear `app/(public)/auth/_logic/hooks/useLogout.ts` que expone `{ logout: () => void; isLoading: boolean }`: llama al servicio, redirige a `/auth/login` con `useRouter().push` independientemente del resultado, y pone `isLoading = false` sólo si el componente sigue montado

## 3. Botón de logout en `NavigationRail`

- [x] 3.1 Importar `useLogout` en `app/_components/organisms/NavigationRail/NavigationRail.tsx` y añadir un `<button>` al final del `<div className="mt-auto">` (debajo de los `secondaryItems`) con icono `logout`, `title="Cerrar sesión"`, `aria-label="Cerrar sesión"`, estilo hover `hover:bg-error-container hover:text-error`, y `disabled={isLoading}`

## 4. Tests unitarios — servicio

- [x] 4.1 Crear `tests/unit/ui/(public)/auth/_logic/services/logout.test.ts`: éxito (200 → void + sessionStorage limpiado), error de red (NetworkError lanzado pero sessionStorage limpiado igualmente)

## 5. Tests unitarios — hook

- [x] 5.1 Crear `tests/unit/ui/(public)/auth/_logic/hooks/useLogout.test.ts`: flujo nominal (`isLoading` true → servicio llamado → router.push → `isLoading` false), error de red aun así redirige a `/auth/login`

## 6. Verificación final

- [x] 6.1 Ejecutar `npm run build` — 0 errores de TypeScript en el código de este change
- [x] 6.2 Ejecutar `npm test` — nuevos tests pasan; suite existente sin regresiones
- [x] 6.3 Iniciar dev server, hacer login y verificar que el botón de logout aparece en el rail, hace la redirección y limpia `sessionStorage`
- [x] 6.4 Actualizar `CLAUDE.md` si se requieren nuevas notas de arquitectura (p.ej. convención de `useLogout` para otros flows de auth futuros)

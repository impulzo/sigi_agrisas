## 1. Guard de registro por entorno

- [x] 1.1 Modificar `app/_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx`: envolver la llamada a `navigator.serviceWorker.register("/sw.js")` en un guard `process.env.NODE_ENV === "production"`, preservando el chequeo existente de `"serviceWorker" in navigator`.
- [x] 1.2 Test unitario para el componente cubriendo: `NODE_ENV="development"` → no registra; `NODE_ENV="test"` → no registra; `NODE_ENV="production"` → registra igual que hoy.

## 2. Verificación

- [x] 2.1 Ejecutar `npm test` (suite completa) y confirmar verde.
- [x] 2.2 Verificación manual: con dev server corriendo (limpio, `.next` borrado, restart), verificado vía Playwright headless que `navigator.serviceWorker.getRegistrations()` devuelve `0` tras cargar `/auth/login` en dev (antes del fix hubiera registrado 1). Sin errores de página.
- [x] 2.3 Correr `opsx:verify` contra este change antes de solicitar archivo.

## 3. Deploy y comunicación

- [ ] 3.1 PR contra `develop` (nunca `master`).
- [ ] 3.2 Comunicar al equipo: quien ya corrió `npm run dev` antes de este fix debe desregistrar manualmente el SW una vez (DevTools → Application → Service Workers → Unregister, o "Clear storage").

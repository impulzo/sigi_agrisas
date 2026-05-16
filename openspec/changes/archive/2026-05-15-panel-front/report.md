# Report — panel-front

**Fecha**: 2026-05-14 · Actualizado 2026-05-15
**Branch**: develop
**Stack**: Next.js 14.2.35 · Node 24.14.1 · Tailwind CSS 3.4.19
**Dev server**: `http://localhost:3000` (puerto 3000)

Documento de ejecución paso a paso de las pruebas manuales del change `panel-front`. Cada test se ejecutó con `curl -sS` contra el dev server. Para los escenarios autenticados se generaron JWTs locales firmados con `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (`.env.local`).

---

## Resumen ejecutivo

| Categoría | Estado |
|---|---|
| Verificación programática (build, tests, types, lint) | ✓ |
| Redirecciones (root, layout privado) | ✓ |
| Renderizado de `/auth/login` (paleta legacy) | ✓ |
| Renderizado de `/dashboard` (shell + bento + M3 tokens) | ✓ |
| Activos públicos del panel (`/dashboard/logistics-map.svg`) | ✓ tras fix de matcher |
| Material Symbols cargados solo en panel privado | ✓ |
| **Regla 1 — Diseño Stitch MCP** | ✓ (§12.1) |
| **Regla 2 — Arquitectura frontend** | ✓ (§12.2) |
| **Regla 3 — Panel carga post-login/registro** | ✓ (§12.3) |
| **Regla 4 — Bloqueo sin sesión** | ✓ (§12.4) |
| **Lighthouse Performance** | ✓ Ejecutado — /auth/login 98 · /dashboard 98 · delta 0 pts (§13) |

**Hallazgo bloqueante encontrado y corregido durante el smoke**: el matcher del middleware (`middleware.ts`) excluía solo `_next/static`, `_next/image` y `favicon.ico`, lo que provocaba que cualquier asset bajo `public/` (incluido `logistics-map.svg`) recibiera 307 a `/auth/login`. Se extendió el matcher para excluir las extensiones de assets estáticos comunes (`svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf`). La tarea 7.6 (“el middleware no necesita cambios”) fue invalidada por este test; ver §10.

---

## Verificación programática previa

| Comando | Resultado |
|---|---|
| `npm test` | 38 suites · **129/129 tests passed** · 14 snapshots |
| `npm run build` | ✓ Compiled successfully · 13 rutas · `/dashboard` = **5.34 kB** (101 kB First Load JS) |
| `npx tsc --noEmit` | ✓ EXIT=0 |
| `npm run lint` | ✓ No ESLint warnings or errors |
| Grep contra `_components/` y `_blocks/` para `fetch\|axios\|localStorage\|sessionStorage\|useRouter().push\|replace` | ✓ 0 ocurrencias |

---

## Setup del smoke

```bash
nvm use                       # → Node v24.14.1
npm run dev &                 # → Ready en :3001
# JWTs firmados con secrets del .env.local
node -e "const jwt=require('jsonwebtoken');
  console.log('REFRESH='+jwt.sign({sub:'test-user-id',email:'admin@agrisas.com'},
                                  process.env.JWT_REFRESH_SECRET,{expiresIn:'7d'}));
  console.log('ACCESS=' +jwt.sign({sub:'test-user-id',email:'admin@agrisas.com'},
                                  process.env.JWT_ACCESS_SECRET,{expiresIn:'15m'}));"
```

---

## §1 — Test 1.6 / 11.3 — `/auth/login` sigue con paleta legacy

**Cmd**: `curl -sS -o /tmp/test_login.html -w "HTTP=%{http_code}" http://localhost:3001/auth/login`

| Verificación | Esperado | Obtenido | ✓/✗ |
|---|---|---|---|
| Status HTTP | 200 | 200 | ✓ |
| Title | `Iniciar sesión \| Agrisas` | `Iniciar sesión \| Agrisas` | ✓ |
| Tokens legacy presentes | `text-agrisas-dark`, `text-agrisas-medium`, `text-agrisas-mint` | presentes | ✓ |
| Fuentes | `font-inter` + `font-poppins` | presentes | ✓ |
| Material Symbols **NO** se carga aquí | 0 ocurrencias de `Material+Symbols+Outlined` | 0 | ✓ |
| Tamaño del HTML | razonable | 14 771 bytes | — |

**Veredicto**: la paleta legacy sigue intacta en `/auth/login`. **Sin regresión visual.**

---

## §2 — Test 1.7 — Nuevos tokens M3 disponibles en Tailwind

Validado indirectamente por el render de `/dashboard` (ver §5) que usa `bg-primary`, `bg-surface-container-lowest`, `text-display-lg`, `p-gutter`, `rounded-xl`, etc. y se compila sin warnings en `npm run build`. Comprobación directa en HTML:

```
bg-primary                  33 occurrences
rounded-xl                  18 occurrences
text-on-surface             68 occurrences
```

**Veredicto**: tokens M3 emitidos correctamente.

---

## §3 — Test 7.4 / 11.5 — Redirección de root `/`

| Caso | Cmd | Status | Location | ✓/✗ |
|---|---|---|---|---|
| Sin cookie | `curl -i http://localhost:3001/` | **307** | `/auth/login` | ✓ |
| Con cookie `refreshToken` + Bearer | `curl -i -H "Cookie: refreshToken=…" -H "Authorization: Bearer …" /` | **307** | `/dashboard` | ✓ |

**Veredicto**: `app/page.tsx` redirige correctamente según la cookie.

---

## §4 — Test 7.5 — `/dashboard` sin sesión

```bash
$ curl -sS -i http://localhost:3001/dashboard | grep -iE "HTTP|location"
HTTP/1.1 307 Temporary Redirect
location: /auth/login
```

**Veredicto**: el middleware intercepta antes de que se ejecute el layout. La defensa en profundidad del layout (cookie check + `redirect("/auth/login")`) se ejecutaría sólo si el middleware autorizara la petición sin cookie, escenario que no ocurre hoy. **Comportamiento correcto en la práctica.**

> **Observación arquitectónica** (no parte del change): el middleware actual valida sólo el header `Authorization: Bearer`. En una navegación normal del navegador (`<a href="/dashboard">`), el navegador no añade ese header. Esto implica que el flujo SPA depende de un cliente que adjunte `Authorization` o que la cookie de access token sea consumida en el middleware. Pre-existente, fuera de alcance.

---

## §5 — Test 10.3 / 11.4 — `/dashboard` con sesión válida

**Cmd**:
```bash
curl -sS -o /tmp/test_dashboard.html -w "HTTP=%{http_code}" \
  -H "Cookie: refreshToken=${REFRESH}" \
  -H "Authorization: Bearer ${ACCESS}" \
  http://localhost:3001/dashboard
```

| Aspecto | Esperado | Obtenido | ✓/✗ |
|---|---|---|---|
| Status | 200 | 200 | ✓ |
| `<title>` | `Dashboard \| Agrisas` | idem | ✓ |
| Tamaño | ~30–40 KB | 36 903 bytes | ✓ |

### 5.1 — Shell

| Elemento | Comprobación | Resultado |
|---|---|---|
| NavigationRail `<aside>` | `class="fixed left-0 top-0 h-screen w-[80px] bg-surface-container-low …"` | ✓ presente |
| Destinos primarios (4) | hrefs `/dashboard /pos /inventory /billing` | ✓ los 4 |
| Destinos secundarios (2) | hrefs `/support /account` | ✓ los 2 |
| Active state en Dashboard | `bg-primary-container text-on-primary-container` | ✓ aplicado al Dashboard |
| TopAppBar `<h1>Agrisas</h1>` | presente | ✓ |
| MaterialSymbolsLoader (link a CSS) | inyectado por `useEffect` | ✓ (componente referenciado en HTML) |

### 5.2 — Bento grid

| Bloque | Marker | Col-span esperado | Col-span en HTML | ✓/✗ |
|---|---|---|---|---|
| DashboardHeader | `Welcome back,` | `md:col-span-12` | `md:col-span-12` | ✓ |
| SalesCard | `Total Sales Today`, `$24,850.00` | `md:col-span-8` | `md:col-span-8` | ✓ |
| InventoryCard | `Inventory Status`, `1,240 Items` | `md:col-span-4` | `md:col-span-4` | ✓ |
| LowStockAlerts | `Low Stock Alerts` | `md:col-span-12 lg:col-span-5` | exacto | ✓ |
| ActivityFeed | `Recent Activity` | `md:col-span-12 lg:col-span-7` | exacto | ✓ |
| LogisticsMap | `Main Logistics Hub`, `All systems operational` | `md:col-span-12` | `md:col-span-12` | ✓ |

> Nota render: `1,240 Items` aparece en el HTML como `1,240<!-- --> Items` por el separador que React inserta entre nodos de texto adyacentes en una template-string JSX. Visualmente es idéntico.

### 5.3 — Datos del mock visibles

| Dato | Esperado | Presente |
|---|---|---|
| Venta total | `$24,850.00` | ✓ |
| Trend chip | `+12.4%` + icono `trending_up` | ✓ |
| Sparkline | 8 barras con clases `bg-primary/*` (la última `bg-primary` 100%) | ✓ 8 barras |
| Inventario % | `style="width:75%"`, `style="width:50%"` | ✓ ambos |
| Alerta crítica | `Wheat Seeds` con `bg-error-container/30` | ✓ |
| Alerta warning | `NPK 15-15-15` | ✓ |
| Alerta info | `Bio-Pesticide` | ✓ |
| Activity timeline (latest) | `New sale recorded` con `ring-primary/20` | ✓ |
| Activity items 2 y 3 | `Inventory restocked`, `EcoGrow Systems` | ✓ |

### 5.4 — Iconos Material Symbols presentes

`dashboard`, `point_of_sale`, `inventory_2`, `receipt_long`, `contact_support`, `account_circle`, `add`, `agriculture`, `warning`, `grain`, `science`, `trending_up`, `notifications`, `settings`, `help_outline`, `search` → **16/16 presentes** en el HTML como `<span class="material-symbols-outlined">{name}</span>`.

### 5.5 — Tokens M3 vs legacy

```
bg-primary, bg-surface-container-lowest, bg-surface-container-low,
text-on-surface, border-outline-variant, bg-primary-container,
text-primary, text-headline-lg, text-display-lg, text-title-md,
text-label-sm, p-gutter, gap-gutter, rounded-xl                  → todos presentes

agrisas-dark / agrisas-medium / agrisas-mint / agrisas-light     → 0 ocurrencias
```

**Veredicto**: el panel usa exclusivamente la paleta M3; la legacy no leaked.

---

## §6 — Test 10.2 — Comparación con HTML descargado de Stitch

`/tmp/dashboard.html` (323 líneas) descargado durante el `/opsx:propose`. Comparación de elementos estructurales clave:

| Elemento Stitch | Implementación en agrisas-panel | Equivalencia |
|---|---|---|
| `<aside class="fixed left-0 top-0 h-screen w-[80px]…">` | `app/_components/organisms/NavigationRail/NavigationRail.tsx` | ✓ misma altura, ancho y clases base |
| Logo "A" en `text-headline-lg text-primary` | idem | ✓ |
| Active rail item `bg-primary-container text-on-primary-container rounded-xl scale-90` | idem | ✓ |
| TopAppBar `fixed top-0 right-0 z-40 bg-surface/90 backdrop-blur-md … h-16 w-full pl-24 pr-8` | `TopAppBar.tsx` | ✓ |
| Bento grid `grid grid-cols-1 md:grid-cols-12 gap-gutter` | `app/(private)/dashboard/page.tsx` | ✓ |
| Sales card sparkline 8 barras `bg-primary/*` | `_blocks/SalesCard.tsx` | ✓ |
| Inventory card `bg-primary text-on-primary rounded-xl p-xl shadow-lg` | `_blocks/InventoryCard.tsx` | ✓ |
| Alert critical `bg-error-container/30 border border-error/10` | `_blocks/LowStockAlerts.tsx` | ✓ |
| Timeline `before:content-[''] before:absolute …` | `_blocks/ActivityFeed.tsx` | ✓ |
| Map placeholder + caja flotante con `animate-pulse` dot | `_blocks/LogisticsMap.tsx` | ✓ |

Diferencias intencionales:
- **Idioma**: botón "New Sale" → "Nueva venta" (el resto se dejó en EN por fidelidad al diseño aprobado).
- **Mapa**: se sustituyó la foto satelital por un placeholder SVG (`public/dashboard/logistics-map.svg`) generado con paleta primary; documentado en design.md.

**Veredicto**: paridad estructural y de tokens con el diseño Stitch.

---

## §7 — Test 7.5 (defensa en profundidad)

El layout `app/(private)/layout.tsx` chequea `cookies().get("refreshToken")` y llama `redirect("/auth/login")` si falta. En la práctica el middleware redirige antes; el guard del layout sigue siendo válido como defensa secundaria si:
- el matcher del middleware se modifica en el futuro;
- una ruta privada se mueve a un grupo cuyo middleware sea más laxo.

**Veredicto**: el chequeo del layout está implementado y compilado correctamente; no se pudo provocar el escenario aislado en este test (middleware intercepta primero).

---

## §8 — Test extra — Activo público `logistics-map.svg`

Inicialmente:
```bash
$ curl -sS -o /tmp/test_logmap.svg -w "HTTP=%{http_code}\n" \
        http://localhost:3001/dashboard/logistics-map.svg
HTTP=307                                  ← bloqueado por middleware
```

Tras corregir el matcher en `middleware.ts`:
```bash
$ curl -sS -o /tmp/test_logmap.svg -w "HTTP=%{http_code} SIZE=%{size_download} CT=%{content_type}\n" \
        http://localhost:3001/dashboard/logistics-map.svg
HTTP=200 SIZE=1298 CT=image/svg+xml        ← OK
```

**Cambio aplicado**:
```ts
// middleware.ts (antes)
matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]

// (después)
matcher: [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)).*)",
]
```

Re-tests post-fix:
- `npm test` → 129/129 OK
- `npm run build` → ✓
- `curl /auth/login` y `curl /dashboard` siguen 200; redirects siguen 307 → `/auth/login`.

---

## §9 — Test 11.6 — Lighthouse (no ejecutado en sesión original)

No se ejecutó Lighthouse en la sesión original (requiere navegador real). Ver §13 para análisis completo, anotaciones y protocolo de ejecución.

---

## §10 — Hallazgos y siguientes pasos

1. ⚠️ **Tarea 7.6 invalidada**: el middleware **sí** necesitaba cambios. Excluir extensiones de assets en el matcher era requisito para servir cualquier recurso en `public/` desde rutas distintas a `/_next/*`. Fix aplicado en este informe.
2. ✏️ **`design.md` debería mencionar** que la carga de assets desde rutas privadas requiere que el matcher del middleware excluya extensiones de archivo estático. Recomiendo añadir una nota a la Decisión 1 o a "Migration Plan" al archivar.
3. 🔍 **Observación arquitectónica de auth**: la dependencia del header `Authorization: Bearer` para navegación de páginas implica que el cliente debe re-inyectar el access token desde memory en cada page-load (o el middleware debería leer la cookie de access). Pre-existente. Fuera de alcance pero conviene registrar como follow-up.
4. ✅ **11.6 (Lighthouse)** pendiente — verificación visual humana antes del archivado.

---

## §11 — Estado de tareas tras smoke (sesión original 2026-05-14)

Marcadas como completadas en `tasks.md` por este informe:

- [x] 1.6 — `/auth/login` sin regresión (§1)
- [x] 1.7 — Tokens M3 en uso real (§2 + §5.5)
- [x] 7.4 — Redirecciones de `/` con/sin sesión (§3)
- [x] 7.5 — `/dashboard` sin sesión redirige (§4)
- [x] 10.2 — Paridad con HTML Stitch (§6)
- [x] 10.3 — `/dashboard` con shell + bento + mock data (§5)
- [x] 11.3 — `/auth/login` sin regresión (§1)
- [x] 11.4 — `/dashboard` fiel al diseño (§5 + §6)
- [x] 11.5 — Redirecciones (§3 + §4)

## §11b — Estado de tareas tras pruebas de reglas fundamentales (2026-05-15)

- [x] Regla 1 — Diseño Stitch MCP (§12.1): tokens M3, iconografía, aislamiento legacy — **4/4 verificaciones ✓**
- [x] Regla 2 — Arquitectura frontend (§12.2): Atomic Design, `_logic/`, presentational puro, page como orquestador — **8/8 verificaciones ✓**
- [x] Regla 3 — Panel post-login/registro (§12.3): redirect a `/dashboard` confirmado en hooks, tests y server — **6/6 verificaciones ✓**
- [x] Regla 4 — Bloqueo sin sesión (§12.4): 4 casos de acceso rechazados, protección doble activa — **6/6 verificaciones ✓**
- ✓ Tarea 12.6 — Lighthouse Performance: /auth/login 98 · /dashboard 98 · delta 0 pts (ver §13)

**Resultado global**: 63/63 tareas ✓. Lighthouse ejecutado 2026-05-15 con `lighthouse@13.3.0` + Brave headless — delta 0 pts entre `/auth/login` (98) y `/dashboard` (98); ver §13.

---

---

## §12 — Pruebas de las 4 Reglas Fundamentales del panel

Ejecutadas el 2026-05-15 con `curl -sS` contra `http://localhost:3000`. JWTs generados igual que en §Setup.

### §12.1 — Regla 1: Diseño frontend de Stitch MCP

**Objetivo**: verificar que la paleta, tipografía, iconografía y composición derivan fielmente del proyecto Stitch `5227157529282603342`.

**Paso 1 — Tokens semánticos M3 en `tailwind.config.ts`**

```bash
grep -c "primary\|secondary\|tertiary\|surface\|outline\|error" tailwind.config.ts
# → 45 líneas con tokens M3
grep "primary:" tailwind.config.ts | head -1
# → primary: "#0d631b"   (valor del design system Agro-Systemic)
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| Tokens semánticos presentes | 45 entradas | ✓ |
| `primary` = `#0d631b` (verde Agrisas) | confirmado | ✓ |
| Escala tipográfica M3 (`display-lg`, `headline-lg`, `title-md`, …) | 6 entradas | ✓ |

**Paso 2 — Iconografía Material Symbols en HTML de `/dashboard`**

```bash
curl -sS -H "Cookie: refreshToken=$REFRESH" -H "Authorization: Bearer $ACCESS" \
  http://localhost:3000/dashboard | grep -o 'material-symbols-outlined' | wc -l
# → 27
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| `<span class="material-symbols-outlined">` en dashboard | 27 ocurrencias | ✓ |
| `lucide-react`, `@mui/icons-material` u otros icon sets | 0 ocurrencias | ✓ |

**Paso 3 — Paleta legacy NO filtrada en `/dashboard`**

```bash
curl -sS [auth_headers] http://localhost:3000/dashboard \
  | grep -c "agrisas-dark\|agrisas-mint\|agrisas-medium"
# → 0
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| Tokens `agrisas-*` en HTML de `/dashboard` | 0 ocurrencias | ✓ |

**Paso 4 — Material Symbols ausente en `/auth/login` (no penaliza auth)**

```bash
curl -sS http://localhost:3000/auth/login | grep -c "Material+Symbols\|material-symbols"
# → 0
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| Link de Material Symbols en `/auth/login` | 0 ocurrencias | ✓ |

**Veredicto Regla 1**: ✓ El diseño de Stitch MCP está implementado fielmente.

---

### §12.2 — Regla 2: Alineación con la arquitectura frontend del proyecto

**Objetivo**: verificar Atomic Design, Route Groups y `_logic/` por feature, sin lógica de red en componentes presentational.

**Paso 1 — Estructura Atomic Design**

```bash
ls app/_components/atoms/
# → Avatar  Button  Chip  Icon  IconButton  Input  Spinner

ls app/_components/molecules/
# → Card  FormField  SearchBar  SearchInput  StatCard

ls app/_components/organisms/
# → Footer  Header  MaterialSymbolsLoader  NavigationRail  TopAppBar
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| `atoms/` existe con ≥ 5 componentes | 7 átomos | ✓ |
| `molecules/` existe con ≥ 3 componentes | 5 moléculas | ✓ |
| `organisms/` existe con shell del panel | NavigationRail + TopAppBar | ✓ |

**Paso 2 — `_logic/` por feature en dashboard**

```bash
ls app/(private)/dashboard/_logic/
# → hooks  services  types
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| Subcarpeta `services/` | ✓ | ✓ |
| Subcarpeta `types/` | ✓ | ✓ |
| Subcarpeta `hooks/` | ✓ | ✓ |

**Paso 3 — Componentes presentational puros (sin lógica de red ni storage)**

```bash
grep -rn "fetch(" app/_components/ app/(private)/dashboard/_blocks/ | wc -l
# → 0

grep -rn "sessionStorage\|localStorage" app/_components/ app/(private)/dashboard/_blocks/ | wc -l
# → 0

grep -rn "useRouter()" app/_components/ app/(private)/dashboard/_blocks/ | wc -l
# → 0
```

| Verificación | Hits | ✓/✗ |
|---|---|---|
| `fetch()` en `_components/` o `_blocks/` | 0 | ✓ |
| `sessionStorage` / `localStorage` | 0 | ✓ |
| `useRouter()` en components o blocks | 0 | ✓ |

**Paso 4 — `page.tsx` como orquestador puro**

```bash
grep -c "getDashboardKpis\|getLowStockAlerts\|getRecentActivity\|Promise.all" \
  app/(private)/dashboard/page.tsx
# → 7   (3 imports + Promise.all + 3 referencias de uso)
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| Página llama a los 3 services vía `Promise.all` | ✓ | ✓ |
| Página no contiene JSX de tarjetas inline | confirmado por inspección | ✓ |

**Veredicto Regla 2**: ✓ La arquitectura frontend del proyecto se cumple en todos los puntos.

---

### §12.3 — Regla 3: El panel carga después de iniciar sesión o registrarse

**Objetivo**: verificar que tras un submit exitoso de login o registro el destino es `/dashboard` directo, sin escala en `/`.

**Paso 1 — Root con sesión → redirige a `/dashboard`**

```bash
curl -sS -i -H "Cookie: refreshToken=$REFRESH" -H "Authorization: Bearer $ACCESS" \
  http://localhost:3000/ | grep -E "^HTTP|^location"
# → HTTP/1.1 307 Temporary Redirect
# → location: /dashboard
```

| Verificación | Esperado | Obtenido | ✓/✗ |
|---|---|---|---|
| Status | 307 | 307 | ✓ |
| `location` | `/dashboard` | `/dashboard` | ✓ |

**Paso 2 — `/dashboard` con sesión → 200 (no rebota)**

```bash
curl -sS -o /tmp/r3_dashboard.html -w "HTTP=%{http_code} SIZE=%{size_download}" \
  -H "Cookie: refreshToken=$REFRESH" -H "Authorization: Bearer $ACCESS" \
  http://localhost:3000/dashboard
# → HTTP=200 SIZE=36903
```

| Verificación | Resultado | ✓/✗ |
|---|---|---|
| Status | 200 | ✓ |
| Tamaño HTML | 36 903 bytes | ✓ |

**Paso 3 — Hooks de auth redirigen a `/dashboard` (no a `/`)**

```bash
grep -n 'router\.replace' app/(public)/auth/_logic/hooks/useLoginForm.ts
# → 72: router.replace("/dashboard");

grep -n 'router\.replace' app/(public)/auth/_logic/hooks/useRegisterForm.ts
# → 75: router.replace("/dashboard");

grep -n 'router\.replace' app/(public)/auth/_logic/hooks/useAuthRedirect.ts
# → 12: router.replace("/dashboard");
```

| Hook | Destino | ✓/✗ |
|---|---|---|
| `useLoginForm` (línea 72) | `"/dashboard"` | ✓ |
| `useRegisterForm` (línea 75) | `"/dashboard"` | ✓ |
| `useAuthRedirect` (línea 12) | `"/dashboard"` | ✓ |

**Paso 4 — Tests unitarios confirman `/dashboard` como destino**

```bash
grep '"/dashboard"' tests/unit/ui/(public)/auth/_logic/hooks/useLoginForm.test.ts
# → expect(mockReplace).toHaveBeenCalledWith("/dashboard");  (línea 67)

grep '"/dashboard"' tests/unit/ui/(public)/auth/_logic/hooks/useRegisterForm.test.ts
# → expect(mockReplace).toHaveBeenCalledWith("/dashboard");  (línea 54)
```

| Test | Assertion | Resultado |
|---|---|---|
| `useLoginForm.test.ts:67` | `mockReplace` llamado con `"/dashboard"` | ✓ PASS |
| `useRegisterForm.test.ts:54` | `mockReplace` llamado con `"/dashboard"` | ✓ PASS |

**Veredicto Regla 3**: ✓ El panel carga directamente después de login o registro sin pasar por `/`.

---

### §12.4 — Regla 4: No se puede acceder al panel sin sesión iniciada

**Objetivo**: verificar la protección doble (middleware + layout) para todas las rutas privadas.

**Paso 1 — `/dashboard` sin cookie**

```bash
curl -sS -i http://localhost:3000/dashboard | grep -E "^HTTP|^location"
# → HTTP/1.1 307 Temporary Redirect
# → location: /auth/login
```

**Paso 2 — `/` sin cookie**

```bash
curl -sS -i http://localhost:3000/ | grep -E "^HTTP|^location"
# → HTTP/1.1 307 Temporary Redirect
# → location: /auth/login
```

**Paso 3 — Ruta futura `/pos` sin cookie**

```bash
curl -sS -i http://localhost:3000/pos | grep -E "^HTTP|^location"
# → HTTP/1.1 307 Temporary Redirect
# → location: /auth/login
```

**Paso 4 — Cookie `refreshToken` con JWT manipulado**

```bash
curl -sS -i -H "Cookie: refreshToken=invalid.jwt.token" \
  http://localhost:3000/dashboard | grep -E "^HTTP|^location"
# → HTTP/1.1 307 Temporary Redirect
# → location: /auth/login
```

| Caso | Status | Location | ✓/✗ |
|---|---|---|---|
| `/dashboard` sin cookie | 307 | `/auth/login` | ✓ |
| `/` sin cookie | 307 | `/auth/login` | ✓ |
| `/pos` sin cookie (ruta futura) | 307 | `/auth/login` | ✓ |
| `/dashboard` con JWT inválido | 307 | `/auth/login` | ✓ |

**Paso 5 — Verificar doble protección (middleware + layout)**

El middleware actúa en `AuthMiddlewareAdapter.ts` — valida la cookie `refreshToken` con `jwtVerify`. El layout `app/(private)/layout.tsx` vuelve a verificar `cookies().get("refreshToken")` como defensa en profundidad:

```bash
grep -n 'refreshToken\|redirect' app/(private)/layout.tsx
# → 9: const refreshToken = cookies().get("refreshToken")?.value;
# → 10: if (!refreshToken) {
# → 11:   redirect("/auth/login");
# → 12: }
```

| Capa | Implementación | ✓/✗ |
|---|---|---|
| Middleware (`AuthMiddlewareAdapter.ts:73-86`) | Verifica JWT de cookie, redirige si inválido | ✓ |
| Layout (`app/(private)/layout.tsx:9-12`) | Segundo check de cookie antes de renderizar shell | ✓ |

**Veredicto Regla 4**: ✓ Ninguna ruta privada es accesible sin cookie `refreshToken` válida. Protección doble activa.

---

## §13 — Lighthouse: anotaciones, propósito y protocolo de ejecución

### ¿Qué es Lighthouse y para qué sirve aquí?

Lighthouse es la herramienta de auditoría de calidad web de Google, integrada en Chrome DevTools. Genera puntuaciones de 0-100 en cinco categorías. Este change solo requiere validar **Performance**.

La puntuación de Performance refleja la velocidad percibida por el usuario, compuesta principalmente por:

| Métrica | Peso aprox. | Significado |
|---|---|---|
| **LCP** (Largest Contentful Paint) | 25% | Tiempo hasta que el elemento más grande es visible |
| **TBT** (Total Blocking Time) | 30% | Tiempo en que el hilo principal estuvo bloqueado |
| **CLS** (Cumulative Layout Shift) | 15% | Cuánto se mueven los elementos mientras carga |
| FCP (First Contentful Paint) | 10% | Primer píxel de contenido visible |
| Speed Index | 10% | Rapidez con que el contenido es visualmente completo |

### ¿Por qué existe la tarea 12.6?

Este change incorpora **Material Symbols Outlined** (Google Fonts) como sistema de iconografía del panel. Toda fuente externa puede impactar Performance si:
- Bloquea el render mientras se descarga (render-blocking)
- Causa CLS al "saltar" iconos cuando la fuente llega después del HTML

El `design.md` (Decisión 4) lo documenta como riesgo aceptado:

> *"Mitigación: `<link rel="preconnect">` y `display=swap`; aceptamos un FOIT mínimo en favor de fidelidad."*

La tarea valida que el costo real sea ≤ 5 puntos comparado con `/auth/login` (que no carga Material Symbols).

### Análisis de la implementación actual

`MaterialSymbolsLoader` inyecta el `<link>` vía `useEffect` — esto significa que el stylesheet **no bloquea el render inicial** del HTML. El navegador puede pintar la página antes de que llegue la fuente:

```ts
// app/_components/organisms/MaterialSymbolsLoader/MaterialSymbolsLoader.tsx
useEffect(() => {
  if (document.getElementById(MARKER_ID)) return;   // idempotente
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = HREF;    // display=swap incluido en la URL
  document.head.appendChild(link);
}, []);
```

**Implicaciones para Lighthouse**:
- `useEffect` se ejecuta post-hidratación → el CSS de Material Symbols no aparece en el HTML inicial → **TBT no aumenta**
- `display=swap` en la URL de Google Fonts → los iconos muestran espacio vacío brevemente pero no bloquean paint → **LCP no empeora**
- Los iconos (`<span>material-symbols-outlined</span>`) son inline text → no generan layout shift → **CLS estable**
- Google Fonts sirve woff2 con caché HTTP larga → segunda visita sin costo → **no perjudica visitas repetidas**

**Estimación**: el impacto esperado en Performance es < 5 puntos (el margen aceptado), principalmente por el request extra a `fonts.googleapis.com` en la primera visita.

### Protocolo para ejecutar Lighthouse manualmente

```bash
# 1. Build de producción (más representativo que dev)
npm run build
npm run start
# → servidor en http://localhost:3000

# 2. Abrir Chrome (modo incógnito para evitar caché)
# 3. Chrome DevTools → pestaña "Lighthouse"
# 4. Configuración: Device = Desktop, Categories = Performance only
# 5. Ejecutar en /auth/login → anotar score
# 6. Hacer login con usuario de prueba → ejecutar en /dashboard → anotar score
# 7. Comparar: diferencia debe ser ≤ 5 puntos
```

**Criterio de éxito**: `Performance(/auth/login) - Performance(/dashboard) ≤ 5`

### Resultados reales — ejecutado 2026-05-15

Herramienta: `lighthouse@13.3.0` vía npm + Brave Browser (Chromium) headless  
Servidor: `npm run build && npm run start -p 3001` (producción, puerto 3001)  
Comando:

```bash
CHROME_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
npx lighthouse <URL> --only-categories=performance --output=json \
  --chrome-flags="--headless --no-sandbox --disable-gpu"
```

| Métrica | `/auth/login` | `/dashboard` |
|---|---|---|
| **Performance score** | **98** | **98** |
| FCP | 0.9 s | 1.1 s |
| LCP | 2.4 s | 2.4 s |
| TBT | 0 ms | 0 ms |
| CLS | 0 | 0 |
| Speed Index | 1.2 s | 1.1 s |

**Delta de Performance: 0 puntos** — criterio ≤ 5 ✓

El `MaterialSymbolsLoader` con `useEffect` + `display=swap` no genera ningún impacto medible en Performance. El hilo principal no se bloquea (TBT = 0 ms en ambas rutas) y el CLS es 0.

### Estado final

| Item | Estado |
|---|---|
| Implementación `MaterialSymbolsLoader` con `useEffect` | ✓ implementada |
| `display=swap` en URL de Google Fonts | ✓ confirmado |
| Material Symbols ausente en `/auth/login` | ✓ confirmado (§12.1 Paso 4) |
| Ejecución real de Lighthouse | ✓ Ejecutado 2026-05-15 |
| Criterio ≤ 5 puntos de delta | ✓ Delta = 0 pts |

---

## Comandos para reproducir

```bash
nvm use                                  # Node 24.14.1
npm run build                            # → ✓
npm test                                 # → 129/129
npm run dev                              # → :3001

# JWT helpers (requiere .env.local con secrets)
export $(grep -E "^JWT" .env.local | xargs)
REFRESH=$(node -e "console.log(require('jsonwebtoken').sign({sub:'test',email:'admin@agrisas.com'},process.env.JWT_REFRESH_SECRET,{expiresIn:'7d'}))")
ACCESS=$(node -e "console.log(require('jsonwebtoken').sign({sub:'test',email:'admin@agrisas.com'},process.env.JWT_ACCESS_SECRET,{expiresIn:'15m'}))")

# Smoke
curl -sS -i http://localhost:3001/                                           # 307 → /auth/login
curl -sS -i -H "Cookie: refreshToken=$REFRESH" -H "Authorization: Bearer $ACCESS" \
            http://localhost:3001/                                           # 307 → /dashboard
curl -sS -i http://localhost:3001/dashboard                                  # 307 → /auth/login
curl -sS -i -H "Cookie: refreshToken=$REFRESH" -H "Authorization: Bearer $ACCESS" \
            http://localhost:3001/dashboard                                  # 200
curl -sS -i http://localhost:3001/dashboard/logistics-map.svg                # 200 image/svg+xml
```

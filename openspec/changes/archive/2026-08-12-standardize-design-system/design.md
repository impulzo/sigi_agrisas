# Design — standardize-design-system

## Fuente canónica

Stitch proyecto `5227157529282603342` — "Agrisas Admin & POS Dashboard", design system **Agro-Systemic** (Material 3). El artefacto autoritativo es `designTheme.designMd`, recuperable con:

```
mcp__stitch__get_project(name="projects/5227157529282603342") → .designTheme.designMd
```

De ahí salen paleta, tipografía, radios, spacing y las reglas de prosa (elevación tonal en vez de sombras pesadas, scrim al 40%, tablas densas con cifras tabulares, botones filled/tonal, inputs outlined con label persistente).

`designer.md` es la transcripción operativa de ese `designMd` al vocabulario del repo (clases Tailwind, componentes React). Cuando ambos discrepen, gana `designMd` salvo en las desviaciones registradas explícitamente en la sección "Desviaciones" de `designer.md`.

---

## Decisión 1 — Completar la escala tipográfica en vez de remapear las clases muertas

**Contexto.** 582 usos de 7 clases que no existen. Dos salidas: (a) ampliar `fontSize` para que empiecen a funcionar, (b) un codemod que las reemplace por los 8 tokens existentes.

**Decisión: (a).** Las clases muertas no son errores tipográficos aleatorios — son la escala M3 estándar, escrita por quien asumió que estaba disponible. `text-body-sm` en una celda de tabla y `text-headline-sm` en un título de reporte expresan una intención de jerarquía correcta; lo que falta es el token. Remapear destruiría esa intención y aplanaría la jerarquía (todas las tablas a `body-md`, todos los títulos a `headline-lg`).

**Consecuencia aceptada.** El cambio es visualmente grande en toda la app, y en la dirección correcta: hoy todo renderiza a 16px heredado. Se aísla en su propio commit y se verifica visualmente antes de seguir.

**Desviación registrada.** M3 fija `body-sm` en 12px/16px. Se adopta **13px/18px**. Motivo: `body-sm` es el token de las celdas de las 50 tablas de datos (450 usos), y 12px resulta apretado para lectura prolongada de cifras en el panel administrativo. 13px conserva la distinción clara frente a `body-md` (14px) sin castigar la legibilidad. Registrada en `designer.md`.

## Decisión 2 — Alinear los radios a Stitch con un barrido que preserva píxeles

**Contexto.** La escala del repo está corrida un paso respecto a Stitch. Alinear `tailwind.config.ts` sin tocar el código cambiaría el radio de 758 sitios de golpe.

**Decisión.** Cambiar la escala **y** remapear las clases en la misma operación, de modo que el valor renderizado no cambie:

| Actual | px hoy | Nuevo | px nuevo | |
|---|---|---|---|---|
| `rounded` | 0.25 | `rounded-sm` | 0.25 | idéntico |
| `rounded-sm` | 0.125 | `rounded-sm` | 0.25 | +2px, único uso: `Skeleton` |
| `rounded-md` | 0.375 | `rounded` | 0.5 | intencional — Stitch fija 0.5 para botones e inputs |
| `rounded-lg` | 0.5 | `rounded` | 0.5 | idéntico |
| `rounded-xl` | 0.75 | `rounded-md` | 0.75 | idéntico |
| `rounded-2xl` | 1.0 | `rounded-lg` | 1.0 | idéntico |
| `rounded-full` | — | `rounded-full` | — | intacto |

Es una biyección: cada valor de origen tiene un destino único, y sólo dos celdas cambian píxeles, ambas a propósito.

**Riesgo operativo.** Un `sed` secuencial corrompe el resultado: `rounded-lg`→`rounded` seguido de `rounded`→`rounded-sm` convierte los `rounded-lg` en `rounded-sm`. El remapeo **debe** hacerse en una sola pasada, con una regex de alternancia y una función de reemplazo que consulte la tabla. El codemod es desechable (vive en el scratchpad, no se commitea).

**Alcance de la regex.** Debe cubrir variantes direccionales (`rounded-r-xl`, `rounded-t-sm`) y prefijos de variante (`hover:`, `focus:`, `sm:`, `lg:`). No hay `rounded-[…]` arbitrarios en el repo.

**Segundo paso, semántico.** Tras el barrido mecánico, `Card` queda en `rounded-md` (0.75rem) mientras los paneles de página quedan en `rounded-lg` (1rem). Stitch dice que tarjetas y diálogos usan 1rem. Se corrige `Card` a `rounded-lg` como parte de la fase de primitivas, no del barrido.

## Decisión 3 — El padding de página vive en `PageShell`, no en `<main>`

**Contexto.** Dos formas de arreglar los márgenes: poner el padding en `app/(private)/layout.tsx`, o dárselo a un componente que cada página use.

**Decisión: `PageShell`.** POS necesita full-bleed (`h-[calc(100vh-74px)]`, split-pane sin padding) y el dashboard tiene su propio grid bento. Un padding en `<main>` obligaría a cada excepción a compensarlo con márgenes negativos. `PageShell` con `width="full"` lo resuelve declarativamente.

`<main>` conserva sólo la geometría del chrome: `pl-20 pt-16` — 80px de rail y 64px de barra, exactos. Hoy son `pl-[90px] pt-[74px] pr-2.5`, donde los 10px extra son un padding improvisado y el `pr-2.5` deja la página asimétrica.

**Corolario.** La homogeneidad del margen depende de que toda página use `PageShell`. Por eso la migración de los 26 módulos es parte de este change y no de uno posterior, y por eso el e2e afirma igualdad de padding entre rutas en vez de un valor concreto.

## Decisión 4 — `PageShell` absorbe `CatalogShell` en lugar de envolverlo

`CatalogShell` ya resuelve bien el caso listado y lo usan 15 módulos. Podría conservarse como alias delegando en `PageShell`.

**Decisión: absorberlo y borrarlo.** Un alias deja dos nombres para una cosa y garantiza que el siguiente módulo elija al azar. `PageShell` es un superconjunto estricto (añade `backHref`, `actions`, `width`, y `toolbar`/`panel` opcionales), así que los 15 consumidores migran con un cambio de import y de nombre. El nombre `CatalogShell` además ya mentía: lo usaban `sales`, `quotes`, `returns`, `payments`, `purchases`, `billing` y `waybills`, que no son catálogos.

## Decisión 5 — Header de tabla `bg-surface-container`, no `bg-tertiary-container`

Stitch dice: *"Data Tables: … Header rows use a Tonal Tertiary background"*. En esta paleta `tertiary-container` es `#5c717b` — pizarra oscura con texto claro `#e1f4ff`.

**Decisión: `bg-surface-container` (`#eeeeec`), desviación registrada.** Un header de pizarra oscura en 50 tablas de un tema claro pesa demasiado y compite con el CTA primario por la atención. `bg-surface-container` es el gris tonal que ya usan `users` y `customers`, y respeta la intención de Stitch (distinguir el header del cuerpo mediante una capa tonal) sin el contraste agresivo.

Queda como una constante única en `DataTable`: revertir a la lectura literal de Stitch es cambiar una línea.

## Decisión 6 — El guardarraíl es un test, no una convención

`designer.md` describe; `tests/unit/ui/design-system/tokens.test.ts` obliga. El test escanea `app/**/*.tsx` y falla ante:

- una clase `text-(display|headline|title|body|label)-*` fuera de la escala declarada en `tailwind.config.ts` — es exactamente el bug que originó este change, y sin el test volvería;
- hex crudo o valores arbitrarios de color (`bg-[#…]`, `text-[#…]`);
- `bg-gray-*` / `border-gray-*` / `text-gray-*`;
- `rounded-2xl` / `rounded-3xl`, que dejan de existir tras el barrido;
- `<button` / `<table` / `<select` crudos en `app/(private)/**/_blocks/`, con **allowlist explícita** para lo que la fase 2 aún no ha migrado.

La allowlist es la clave para que el test entre en verde hoy sin diluir la regla: cada entrada es deuda declarada, y la lista sólo puede encoger. Se implementa leyendo la escala real desde `tailwind.config.ts` en vez de duplicarla, para que añadir un token futuro no requiera tocar el test.

**Alternativa descartada:** una regla de ESLint. Habría que escribirla como plugin propio, y el escaneo por texto cubre igual el caso con una fracción del código.

## Decisión 7 — E2E por estilo computado, no por captura

No hay infraestructura de regresión visual en el repo. Añadir `toHaveScreenshot` implicaría baselines binarias que se desincronizan con cada ajuste y que nadie revisa a fondo.

**Decisión: aserciones de estilo computado** sobre 10 rutas representativas. Cada aserción codifica literalmente una queja del cliente:

1. mismo `padding-left`/`padding-top` del contenedor en todas las rutas → margen homogéneo;
2. `h1` a 32px en las de listado → tamaño homogéneo;
3. `th` a 11px en mayúsculas, `td` a 13px → tablas homogéneas;
4. CTA primario `rgb(13, 99, 27)` y `border-radius: 9999px` → botones homogéneos;
5. ningún elemento con clase `text-body-sm` renderizando a 16px → detecta la reintroducción de tokens muertos.

Son deterministas, legibles en el diff y fallan con un mensaje que apunta a la causa. Las capturas se usan como revisión manual complementaria, no como assertion.

---

## Orden de ejecución

El orden importa: cada fase deja el árbol en verde y con un efecto visual acotado y explicable.

1. **Tokens** — efecto visual grande, aislado, revisable de un vistazo.
2. **Barrido de radios** — 218 archivos, efecto visual nulo; se revisa por muestreo, no línea a línea.
3. **Primitivas** + sus tests unitarios — sin efecto visual hasta que alguien las use.
4. **Migración** por grupos (listados / detalles / reports / POS+settings) — aquí aterriza la homogeneidad.
5. **Documentación y guardarraíl** — al final, cuando el árbol ya cumple las reglas que el test va a exigir.

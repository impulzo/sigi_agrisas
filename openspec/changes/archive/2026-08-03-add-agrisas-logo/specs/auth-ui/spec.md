## MODIFIED Requirements

### Requirement: Layout split-panel compartido entre login y registro
Ambas páginas SHALL usar el mismo `app/(public)/auth/layout.tsx` — panel izquierdo únicamente con el logo `logo.png` (reemplazando la ilustración SVG agrícola, el título "Agrisas" y el subtítulo "Gestión agrícola inteligente" previos, ninguno de los tres se renderiza) sobre un fondo en gradiente verde claro que permite distinguir el logo, panel derecho con el slot `children` para el formulario. El layout SHALL ser un Server Component.

#### Scenario: Vista en pantalla ancha (≥1024px)
- **WHEN** el usuario visualiza `/auth/login` o `/auth/register` en pantalla ≥1024px
- **THEN** el layout muestra dos columnas de 50% cada una (logo izquierda, formulario derecha)

#### Scenario: Vista en pantalla pequeña (<1024px)
- **WHEN** el usuario visualiza `/auth/login` o `/auth/register` en pantalla <1024px
- **THEN** el layout apila los paneles verticalmente (logo arriba, formulario abajo)

#### Scenario: Layout es Server Component
- **WHEN** se inspecciona `app/(public)/auth/layout.tsx`
- **THEN** no contiene la directiva `"use client"`

#### Scenario: Logo reemplaza ilustración, título y subtítulo en el panel izquierdo
- **WHEN** un visitante no autenticado visualiza `/auth/login` o `/auth/register`
- **THEN** el panel izquierdo muestra únicamente la imagen `logo.png` (servida desde `/public/logo.png`); ni el `<svg>` agrícola, ni el `<h1>Agrisas</h1>`, ni el texto "Gestión agrícola inteligente" se renderizan

#### Scenario: Fondo del panel izquierdo permite distinguir el logo
- **WHEN** se inspecciona el CSS aplicado a `.leftPanel` en `app/(public)/auth/layout.module.css`
- **THEN** el gradiente usa tonos de verde más claros que los originales (`#1a4d42`/`#2a6b5f`), de modo que el logo `logo.png` se distinga visualmente sobre el fondo

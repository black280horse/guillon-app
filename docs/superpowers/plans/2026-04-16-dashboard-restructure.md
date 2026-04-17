# Dashboard Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar el dashboard para eliminar espacios desperdiciados, mejorar jerarquía visual y lograr apariencia SaaS premium.

**Architecture:** Tres archivos se modifican en orden — `index.css` (layout global y sidebar), `Layout.jsx` (tipografía del sidebar), `Dashboard.jsx` (container, header, KPI cards, tareas, gráfico). Sin nuevos archivos ni dependencias.

**Tech Stack:** React, Tailwind CSS v4, inline styles, Recharts

---

## File Map

| Archivo | Qué cambia |
|---|---|
| `client/src/index.css` | Ancho sidebar, margins, paddings del layout |
| `client/src/components/Layout.jsx` | Tipografía nav labels, gap icono+texto |
| `client/src/pages/Dashboard.jsx` | Container, header, KPI values, tasks padding/line-height, chart margin |

---

### Task 1: Sidebar y layout global (`index.css`)

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Reducir ancho del sidebar**

Localizar el bloque `.sidebar-fixed` (línea ~181) y cambiar width de `232px` a `160px`:

```css
.sidebar-fixed {
  position: fixed;
  inset: 0 auto 0 0;
  width: 160px;          /* era 232px */
  z-index: 40;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
}
```

- [ ] **Step 2: Ajustar margin-left de `.main-content`**

```css
.main-content {
  margin-left: 160px;    /* era 232px */
  flex: 1;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-x: hidden;
}
```

- [ ] **Step 3: Reducir padding de `.main-frame`**

```css
.main-frame {
  flex: 1;
  padding: 12px;         /* era 16px */
  min-width: 0;
}
```

- [ ] **Step 4: Reducir padding de `.page-shell`**

```css
.page-shell {
  padding: 24px 16px;    /* era 28px 30px */
  min-width: 0;
}
```

- [ ] **Step 5: Ajustar breakpoint 1024px**

Localizar el bloque `@media (max-width: 1024px)` (línea ~350):

```css
@media (max-width: 1024px) {
  .sidebar-fixed  { width: 152px; }       /* era 210px */
  .main-content   { margin-left: 152px; } /* era 210px */
  .page-shell     { padding: 20px 16px; } /* era 22px 22px */
}
```

- [ ] **Step 6: Verificar visualmente en el browser**

Abrir la app (`npm run dev` si no está corriendo) y confirmar:
- Sidebar más angosto, sin texto cortado
- Contenido principal más ancho y sin márgenes laterales excesivos

- [ ] **Step 7: Commit**

```bash
git add client/src/index.css
git commit -m "style: reduce sidebar width and page-shell padding for better space usage"
```

---

### Task 2: Tipografía y alineación del sidebar (`Layout.jsx`)

**Files:**
- Modify: `client/src/components/Layout.jsx`

- [ ] **Step 1: Reducir label de nav a 12.5px con line-height 1.4**

Localizar el `<span>` con `text-[13px]` dentro del `NavLink` (línea ~143):

```jsx
<span
  className="text-[12.5px] font-medium leading-[1.4] transition-colors duration-150"
  style={{ color: isActive ? '#F4F4F6' : 'rgba(255,255,255,0.50)' }}
>
  {label}
</span>
```

- [ ] **Step 2: Ajustar gap entre icono y texto en NavLink**

Localizar la clase del `NavLink` (línea ~107). Cambiar `gap-3` a `gap-2`:

```jsx
className={({ isActive }) =>
  `group relative flex items-center gap-2 rounded-[10px] px-3 py-2.5 transition-all duration-150 ${
    isActive
      ? 'bg-white/[0.07]'
      : 'hover:bg-white/[0.04]'
  }`
}
```

- [ ] **Step 3: Mejorar contraste del hover state activo**

El ítem activo ya tiene `bg-white/[0.07]`. Aumentar hover a `bg-white/[0.06]` para más contraste:

```jsx
className={({ isActive }) =>
  `group relative flex items-center gap-2 rounded-[10px] px-3 py-2.5 transition-all duration-150 ${
    isActive
      ? 'bg-white/[0.07]'
      : 'hover:bg-white/[0.06]'
  }`
}
```

- [ ] **Step 4: Compactar padding del brand header del sidebar**

Localizar `px-5 pt-6 pb-5` (línea ~66) y reducir:

```jsx
<div className="px-4 pt-5 pb-4">
```

- [ ] **Step 5: Compactar padding del nav**

Localizar `px-3 py-4` en el `<nav>` (línea ~94):

```jsx
<nav className="flex-1 px-2 py-3 space-y-5 overflow-y-auto">
```

- [ ] **Step 6: Ajustar también el label de Admin (mismo ítem, mismo estilo)**

Localizar el `<span>` del link Admin (línea ~194):

```jsx
<span className="text-[12.5px] font-medium leading-[1.4]"
  style={{ color: isActive ? '#F4F4F6' : 'rgba(255,255,255,0.50)' }}>
  Admin
</span>
```

- [ ] **Step 7: Verificar en browser**

- Sidebar de 160px con texto legible y sin overflow
- Gap icono+texto visualmente equilibrado
- Hover más visible que antes

- [ ] **Step 8: Commit**

```bash
git add client/src/components/Layout.jsx
git commit -m "style: compact sidebar nav typography and spacing for 160px width"
```

---

### Task 3: Dashboard — container y header (`Dashboard.jsx`)

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

- [ ] **Step 1: Eliminar max-width del container**

Localizar línea ~502:

```jsx
<div className="w-full space-y-6 overflow-x-hidden">
```
(era `w-full max-w-[1400px] mx-auto space-y-6 overflow-x-hidden`)

- [ ] **Step 2: Reducir font-size del título y peso**

Localizar el `<h1>` del header (línea ~506):

```jsx
<h1
  className="text-[28px] font-semibold text-white leading-none"
  style={{ letterSpacing: '-0.04em' }}
>
  Dashboard
</h1>
```
(era `text-[30px] font-bold`)

- [ ] **Step 3: Reducir protagonismo visual del subtítulo**

```jsx
<p className="text-[12.5px] mt-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
  Visión consolidada del negocio
</p>
```
(era `text-[13px]` con opacidad 0.38)

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "style: full-width dashboard container and refined header typography"
```

---

### Task 4: Dashboard — KPI cards (`Dashboard.jsx`)

**Files:**
- Modify: `client/src/pages/Dashboard.jsx` — componente `CompactKpi`

- [ ] **Step 1: Ajustar valor KPI a 32px con line-height compacto**

Localizar el `<p>` del valor en `CompactKpi` (línea ~117):

```jsx
<p className="text-[32px] font-bold leading-[1.1] mt-3 tabular-nums"
  style={{ color, letterSpacing: '-0.04em' }}>
  {formatter(animated)}
</p>
```
(era `text-[34px]` con `leading-none` y `mt-2`)

- [ ] **Step 2: Verificar que las 4 cards se ven correctas**

En el browser, confirmar:
- El valor es legible y tiene más aire respecto al label
- Las 4 cards ocupan el ancho disponible sin overflow

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "style: KPI card value 32px with compact line-height and more vertical spacing"
```

---

### Task 5: Dashboard — bloque de tareas (`Dashboard.jsx`)

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

- [ ] **Step 1: Aumentar padding de cada grupo de tareas**

Localizar el `<div>` del grupo de tarea con `p-3.5` (línea ~531):

```jsx
<div key={g.label} className="rounded-[12px]" style={{ background: g.bg, border: `1px solid ${g.border}`, padding: '14px 16px' }}>
```

- [ ] **Step 2: Mejorar line-height del título de cada tarea**

Localizar el `<p>` de la tarea individual (línea ~543):

```jsx
<p className="text-[12px] font-medium text-white truncate" style={{ lineHeight: '1.4' }}>{t.title}</p>
```
(era `leading-snug` que es ~1.375 pero sin el control explícito)

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "style: increase tasks block internal padding and line-height"
```

---

### Task 6: Dashboard — gráfico de tendencia (`Dashboard.jsx`)

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

- [ ] **Step 1: Agregar separación superior al bloque del gráfico**

Localizar el `<div className="h-[340px] md:h-[360px]">` (línea ~623):

```jsx
<div className="h-[340px] md:h-[360px] mt-3">
```

- [ ] **Step 2: Verificar que el gráfico es el foco visual principal**

En el browser confirmar:
- El gráfico tiene espacio visual propio dentro de la card
- No está pegado al `SectionHeader` de arriba

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "style: add top spacing to trend chart for better visual breathing room"
```

---

### Task 7: Build y deploy a producción

**Files:**
- No se modifica código

- [ ] **Step 1: Build del cliente**

```bash
cd client && npm run build
```
Expected: `✓ built in X.Xs` sin errores

- [ ] **Step 2: Verificar que no hay errores de TypeScript/lint**

```bash
npm run build 2>&1 | grep -i "error"
```
Expected: sin output de errores

- [ ] **Step 3: Push a master para trigger en Railway**

```bash
cd ..
git status
git push origin master
```
Expected: `Branch 'master' set up to track remote branch 'master'` y deploy iniciado

- [ ] **Step 4: Verificar deploy en producción**

Esperar 2-3 minutos y verificar que la URL de Railway muestra el nuevo diseño:
- Sidebar angosto (~160px)
- Dashboard full-width sin márgenes laterales excesivos
- KPI cards con valor en 32px
- Gráfico con espacio superior

---

## Self-Review

### Spec coverage

| Req | Task |
|---|---|
| Sidebar 160px | Task 1 Step 1-2 |
| Sidebar hover/active mejorado | Task 2 Step 3 |
| Sidebar gap 8px icono+texto | Task 2 Step 2 |
| Layout padding máx 16px lateral | Task 1 Step 4-5 |
| Header 28px semibold | Task 3 Step 2 |
| DatePicker menos prominente | No aplica (componente autónomo, color ya suave) |
| KPI value 32px line-height 1.1 | Task 4 Step 1 |
| KPI label separación mayor | Task 4 Step 1 (mt-3) |
| Tasks padding 14px 16px | Task 5 Step 1 |
| Tasks line-height 1.4 | Task 5 Step 2 |
| Gráfico margin-top | Task 6 Step 1 |
| Build y deploy | Task 7 |

### Sin placeholders ✓
### Tipos consistentes ✓

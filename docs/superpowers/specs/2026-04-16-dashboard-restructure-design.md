# Dashboard Restructure — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

## Objetivo

Eliminar sensación de compresión, mejorar jerarquía visual y lograr un dashboard con apariencia SaaS premium.

---

## Cambios confirmados

### 1. Sidebar (`index.css`)
- `sidebar-fixed` width: `232px → 160px`
- Responsive 1024px: `210px → 152px`
- `main-content` margin-left: igual que sidebar
- Alineación interna de ítems: gap consistente de 8px entre icono y texto
- Hover/active con más contraste visual

### 2. Layout principal (`index.css`)
- `main-frame` padding: `16px → 12px`
- `page-shell` padding: `28px 30px → 24px 16px` (máx 16px lateral visible)

### 3. Dashboard container (`Dashboard.jsx`)
- Eliminar `max-w-[1400px] mx-auto` → usar `w-full`

### 4. Header (`Dashboard.jsx`)
- Título: `text-[30px] → text-[28px]`, `font-bold → font-semibold`
- DatePicker: reducir contraste visual (color más suave)

### 5. KPI cards (`Dashboard.jsx` — `CompactKpi`)
- Label: confirmar `text-[10.5px]` con menor opacidad (ya ~0.35)
- Valor: `text-[34px] → text-[32px]`, `leading-none → leading-[1.1]`
- Separación vertical entre label y valor: `mt-2 → mt-3`

### 6. Bloque de Tareas (`Dashboard.jsx`)
- Padding interno del grupo: `p-3.5 → p-[14px_16px]`
- Line-height de títulos de tarea: `leading-snug → leading-[1.4]`

### 7. Gráfico Tendencia (`Dashboard.jsx`)
- Agregar `mt-3` al bloque de chart para separación superior interna
- Mantener altura `340px / 360px`

### 8. Sidebar tipografía (`Layout.jsx`)
- Nav label: `text-[13px] → text-[12.5px]`, `line-height: 1.4`

---

## Deploy

Una vez aplicados todos los cambios:
- `npm run build` en `/client`
- Push a `master` para trigger en Railway
- Verificar que la versión pública refleje el nuevo diseño

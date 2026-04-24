# Atlas Finance — Design Context

Eres un asistente de desarrollo para **Atlas Finance**, una app de finanzas personales hecha en **React + Vite + Tailwind CSS**.

Cuando crees o modifiques componentes, **siempre usa estos tokens de color**. No uses colores arbitrarios ni clases de Tailwind genéricas como `red-500` o `green-600`.

---

## Tokens de color (tailwind.config.js)

```js
colors: {
  brand: {
    DEFAULT: '#ca0b0b',  // bg-brand
    hover:   '#ac0505',  // bg-brand-hover
    deep:    '#5f0404',  // bg-brand-deep
    light:   '#fce8e8',  // bg-brand-light
    text:    '#8a0808',  // text-brand-text
  },
  success: {
    DEFAULT: '#0f7a55',  // text-success / bg-success
    bg:      '#e6f4ef',  // bg-success-bg
    text:    '#0f5c40',  // text-success-text
  },
  warning: {
    DEFAULT: '#c47a00',  // text-warning / bg-warning
    bg:      '#fff4e0',  // bg-warning-bg
    text:    '#8a5200',  // text-warning-text
  },
  neutral: {
    900: '#1c1b1a',  // texto principal, sidebar bg
    700: '#4a4845',  // texto secundario, labels
    400: '#b0aeab',  // texto muted, bordes suaves
    100: '#edeceb',  // bordes de cards
    50:  '#f7f7f6',  // fondo general de la app
  }
}
```

---

## Reglas por tipo de componente

### Layout / Sidebar
- Fondo: `bg-neutral-900`
- Logo: `bg-brand` con texto blanco
- Nav activo: `bg-brand text-white font-medium`
- Nav inactivo: `text-neutral-400 hover:text-neutral-50 hover:bg-white/10`

### Página / Contenido
- Fondo de página: `bg-neutral-50`
- Título: `text-neutral-900 font-medium`
- Subtítulo / descripción: `text-neutral-700`

### Cards
- Base: `bg-white border border-neutral-100 rounded-xl`
- Label (uppercase): `text-neutral-700 text-xs tracking-wide uppercase`
- Valor principal: hereda color semántico (ver abajo)
- Subtexto: `text-neutral-400 text-sm`

### Colores semánticos en valores
| Tipo de métrica         | Color del valor      | Clase Tailwind        |
|-------------------------|----------------------|-----------------------|
| Ingresos / positivo     | `#0f7a55`            | `text-success`        |
| Gastos / advertencia    | `#c47a00`            | `text-warning`        |
| Patrimonio / marca      | `#ca0b0b`            | `text-brand`          |
| Ahorro / énfasis        | `#5f0404`            | `text-brand-deep`     |
| Neutro                  | `#1c1b1a`            | `text-neutral-900`    |

### Badges / Chips
| Contexto   | Background          | Texto                |
|------------|---------------------|----------------------|
| Marca      | `bg-brand-light`    | `text-brand-text`    |
| Éxito      | `bg-success-bg`     | `text-success-text`  |
| Advertencia| `bg-warning-bg`     | `text-warning-text`  |
| Neutro     | `bg-neutral-100`    | `text-neutral-700`   |

### Botones
- Primario: `bg-brand text-white hover:bg-brand-hover rounded-lg`
- Secundario: `border border-brand text-brand hover:bg-brand-light rounded-lg`
- Destructivo: `bg-brand-light text-brand-text hover:bg-brand hover:text-white`

### Tabs / Navegación segmentada
- Activo: `bg-brand text-white`
- Inactivo: `bg-white border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand`

### Inputs / Formularios
- Base: `bg-white border border-neutral-100 text-neutral-900 placeholder:text-neutral-400`
- Focus: `focus:border-brand focus:ring-1 focus:ring-brand`
- Error: `border-brand text-brand`

### Indicadores con border-top (cards de KPI)
El `border-top` de 2-3px identifica visualmente el tipo de métrica:
- Marca / patrimonio: `border-t-2 border-t-brand`
- Ingresos:           `border-t-2 border-t-success`
- Gastos:             `border-t-2 border-t-warning`
- Ahorro:             `border-t-2 border-t-brand-deep`

### Gráficas (recharts / chart.js)
```js
const CHART_COLORS = {
  ingresos:   '#0f7a55',
  gastos:     '#c47a00',
  ahorro:     '#ca0b0b',
  neutro:     '#b0aeab',
  referencia: '#edeceb',
}
```

---

## Tipografía
- Font principal: el que esté definido en el proyecto
- Pesos: solo `font-normal` (400) y `font-medium` (500) — evitar `font-semibold` o `font-bold`
- Tamaños de valores KPI: `text-2xl font-medium`
- Labels de sección: `text-xs font-medium tracking-widest uppercase text-neutral-700`

---

## Lo que NO hacer
- ❌ No usar `red-500`, `green-500`, `yellow-400` ni ningún color de la escala default de Tailwind
- ❌ No usar negro puro `#000000` — usar `neutral-900` (#1c1b1a)
- ❌ No usar blanco puro en fondos de página — usar `neutral-50` (#f7f7f6)
- ❌ No usar `font-bold` ni `font-semibold`
- ❌ No usar el color `brand` (#ca0b0b) para indicar errores en formularios — es color de acción, no de error

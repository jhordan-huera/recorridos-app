// tailwind.config.js
// Escala y paleta derivadas de las Human Interface Guidelines de Apple.
// Los colores viven como canales RGB en variables CSS (src/index.css) para que
// el mismo utility sirva en claro y oscuro y siga aceptando modificadores de
// opacidad (`bg-surface/60`).
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- Fondos y superficies ---
        canvas: withAlpha('--c-canvas'),
        surface: {
          DEFAULT: withAlpha('--c-surface'),
          secondary: withAlpha('--c-surface-2'),
          tertiary: withAlpha('--c-surface-3'),
        },
        // --- Texto (jerarquía de labels de Apple) ---
        label: {
          DEFAULT: withAlpha('--c-label'),
          secondary: withAlpha('--c-label-2'),
          tertiary: withAlpha('--c-label-3'),
          quaternary: withAlpha('--c-label-4'),
        },
        // --- Rellenos y separadores ---
        fill: {
          DEFAULT: withAlpha('--c-fill'),
          secondary: withAlpha('--c-fill-2'),
          tertiary: withAlpha('--c-fill-3'),
        },
        separator: {
          DEFAULT: withAlpha('--c-separator'),
          opaque: withAlpha('--c-separator-opaque'),
        },
        // --- Colores del sistema ---
        accent: withAlpha('--c-accent'),
        positive: withAlpha('--c-green'),
        critical: withAlpha('--c-red'),
        caution: withAlpha('--c-orange'),
        info: withAlpha('--c-teal'),
        brand: withAlpha('--c-indigo'),
        highlight: withAlpha('--c-purple'),
        // Compatibilidad: `primary-600` etc. siguen resolviendo al acento.
        primary: {
          50: withAlpha('--c-accent-50'),
          100: withAlpha('--c-accent-100'),
          200: withAlpha('--c-accent-200'),
          300: withAlpha('--c-accent-300'),
          400: withAlpha('--c-accent-400'),
          500: withAlpha('--c-accent'),
          600: withAlpha('--c-accent-600'),
          700: withAlpha('--c-accent-700'),
          800: withAlpha('--c-accent-800'),
          900: withAlpha('--c-accent-900'),
        },
      },

      // Escala tipográfica: el tracking es específico por tamaño (negativo en
      // títulos, ~0 en cuerpo, positivo en texto diminuto) y el leading se
      // ajusta inversamente al tamaño.
      fontSize: {
        'caption2': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.008em' }],
        'caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.004em' }],
        'footnote': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '-0.004em' }],
        'subhead': ['0.9375rem', { lineHeight: '1.25rem', letterSpacing: '-0.008em' }],
        'callout': ['1rem', { lineHeight: '1.3125rem', letterSpacing: '-0.011em' }],
        'body': ['1.0625rem', { lineHeight: '1.4375rem', letterSpacing: '-0.014em' }],
        'headline': ['1.0625rem', { lineHeight: '1.375rem', letterSpacing: '-0.014em' }],
        'title3': ['1.25rem', { lineHeight: '1.5625rem', letterSpacing: '-0.017em' }],
        'title2': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.019em' }],
        'title1': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.022em' }],
        'large-title': ['2.125rem', { lineHeight: '2.5rem', letterSpacing: '-0.026em' }],
        'display': ['clamp(2.25rem, 5vw, 3.25rem)', { lineHeight: '1.06', letterSpacing: '-0.032em' }],
      },

      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display',
          'Inter', 'Segoe UI', 'system-ui', 'sans-serif',
        ],
        mono: ['SF Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      // Tailwind solo genera opacidades en pasos de 5. Los tintes de esta
      // paleta viven por debajo de ese salto (una superficie al 12% y otra al
      // 15% se distinguen), así que se añaden los pasos que faltan; sin esto
      // `bg-accent/12` se descarta en silencio y el fondo desaparece.
      opacity: {
        8: '0.08',
        12: '0.12',
        14: '0.14',
        16: '0.16',
        18: '0.18',
        22: '0.22',
      },

      borderRadius: {
        // Radios continuos al estilo de los contenedores de iOS.
        'field': '0.625rem',
        'control': '0.75rem',
        'card': '1rem',
        'sheet': '1.25rem',
        'panel': '1.75rem',
      },

      boxShadow: {
        'level-1': 'var(--shadow-1)',
        'level-2': 'var(--shadow-2)',
        'level-3': 'var(--shadow-3)',
        'level-4': 'var(--shadow-4)',
        'focus': '0 0 0 4px rgb(var(--c-accent) / 0.25)',
      },

      backdropBlur: {
        'thin': '12px',
        'regular': '20px',
        'thick': '32px',
        'chrome': '40px',
      },

      transitionTimingFunction: {
        // Curvas espejadas: la de salida es la inversa de la de entrada, para
        // que una transición reversible recorra el mismo camino de vuelta.
        'out-apple': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'in-apple': 'cubic-bezier(1, 0, 0.68, 0.28)',
      },

      keyframes: {
        // Reservado para estados no gestuales (skeletons, indicadores).
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}

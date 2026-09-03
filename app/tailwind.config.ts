import type { Config } from 'tailwindcss';

// Tailwind 3.4.x, NUNCA v4 (rompe el piso R-05, RG-09). Los colores son tokens
// semánticos definidos en estilos/tokens.css con variantes claro/oscuro; ningún
// componente usa un color literal (plan 2.5 §8).
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-tema="oscuro"]'],
  theme: {
    extend: {
      colors: {
        fondo: 'rgb(var(--color-fondo) / <alpha-value>)',
        superficie: 'rgb(var(--color-superficie) / <alpha-value>)',
        elevada: 'rgb(var(--color-elevada) / <alpha-value>)',
        borde: 'rgb(var(--color-borde) / <alpha-value>)',
        texto: 'rgb(var(--color-texto) / <alpha-value>)',
        'texto-secundario': 'rgb(var(--color-texto-secundario) / <alpha-value>)',
        acento: 'rgb(var(--color-acento) / <alpha-value>)',
        'acento-texto': 'rgb(var(--color-acento-texto) / <alpha-value>)',
        exito: 'rgb(var(--color-exito) / <alpha-value>)',
        'exito-fondo': 'rgb(var(--color-exito-fondo) / <alpha-value>)',
        aviso: 'rgb(var(--color-aviso) / <alpha-value>)',
        'aviso-fondo': 'rgb(var(--color-aviso-fondo) / <alpha-value>)',
        alerta: 'rgb(var(--color-alerta) / <alpha-value>)',
        'alerta-fondo': 'rgb(var(--color-alerta-fondo) / <alpha-value>)',
        peligro: 'rgb(var(--color-peligro) / <alpha-value>)',
        'peligro-fondo': 'rgb(var(--color-peligro-fondo) / <alpha-value>)',
        foco: 'rgb(var(--color-foco) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        mono: ['"Cascadia Mono"', 'Consolas', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Escritorio: 13 px por defecto, 11 px mínimo (referencia de tipografía).
        xs: ['11px', '16px'],
        sm: ['12px', '16px'],
        base: ['13px', '20px'],
        md: ['14px', '20px'],
        lg: ['16px', '24px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
      },
      spacing: {
        control: 'var(--alto-control)',
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
    },
  },
  plugins: [],
} satisfies Config;

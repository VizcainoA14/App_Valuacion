// Configuración plana de ESLint 10 (T-A-04, plan FASE_4/4.2 §2).
// Las reglas de frontera "duras" viven en .dependency-cruiser.cjs; aquí están
// las de pureza del motor, dinero y piso de compatibilidad.
import tseslint from 'typescript-eslint';
import compat from 'eslint-plugin-compat';

export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
  },

  ...tseslint.configs.recommended,

  // 1. M-1/M-6: el motor de cálculo no importa de ningún sitio impuro y no usa Date.
  {
    files: ['src/compartido/motor/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@main/*', '@renderer/*', 'electron', 'fs', 'path', 'better-sqlite3', 'node:*'],
              message: 'M-1: el motor de cálculo debe ser puro. Ver plan FASE_2/2.6.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'M-6: la fecha entra como dato. Usa el puerto Reloj.' },
      ],
    },
  },

  // 2. RG-02: prohibido operar dinero con aritmética nativa de number.
  //    Heurística: producirá algún falso positivo; se acepta (plan 4.2 §2).
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'BinaryExpression[operator=/^[*\\/+-]$/] > Identifier[name=/[Cc]ent$|Costo|Valor|Saldo/]',
          message:
            'RG-02: usa decimal.js o las funciones de motor/dinero.ts. Nunca aritmética nativa sobre dinero.',
        },
      ],
    },
  },

  // 3. R-05: piso de compatibilidad de 4 años, verificado contra .browserslistrc.
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'src/compartido/**/*.ts'],
    plugins: { compat },
    rules: { 'compat/compat': 'error' },
  },

  // 4. R-02: el renderer no toca Node ni Electron; solo habla por window.api.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'El renderer solo habla por window.api.' },
            { name: 'fs' },
            { name: 'path' },
            { name: 'better-sqlite3' },
          ],
          patterns: [{ group: ['node:*'], message: 'El renderer no usa APIs de Node.' }],
        },
      ],
    },
  },
);

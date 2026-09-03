/**
 * Reglas de frontera D-1…D-6 (T-A-04, plan FASE_1/1.2 §4 y FASE_4/4.2 §3).
 * `npm run boundaries` falla la construcción si se violan.
 * La resolución de alias usa tsconfig.depcruise.json (une los paths de los 4 tsconfig).
 */
module.exports = {
  forbidden: [
    {
      name: 'motor-puro',
      comment: 'D-2/M-1: dentro de src, el motor solo importa de motor, tipos, enums y errores.',
      severity: 'error',
      from: { path: '^src/compartido/motor' },
      to: { path: '^src/', pathNot: '^src/compartido/(motor|tipos|enums|errores)' },
    },
    {
      name: 'motor-solo-decimaljs',
      comment: 'M-4: la única dependencia externa del motor es decimal.js.',
      severity: 'error',
      from: { path: '^src/compartido/motor' },
      to: { path: 'node_modules', pathNot: 'node_modules/decimal\\.js' },
    },
    {
      name: 'compartido-no-depende-de-nadie',
      comment: 'D-2: lo compartido no conoce main, renderer ni preload.',
      severity: 'error',
      from: { path: '^src/compartido' },
      to: { path: '^src/(main|renderer|preload)' },
    },
    {
      name: 'renderer-no-toca-main',
      comment: 'D-3/R-02: el renderer solo habla con el main por IPC.',
      severity: 'error',
      from: { path: '^src/renderer' },
      to: { path: '^src/main' },
    },
    {
      name: 'main-no-toca-renderer',
      comment: 'D-3: el main no importa código del renderer.',
      severity: 'error',
      from: { path: '^src/main' },
      to: { path: '^src/renderer' },
    },
    {
      name: 'preload-minimo',
      comment: 'D-4: el preload solo importa del contrato compartido.',
      severity: 'error',
      from: { path: '^src/preload' },
      to: { path: '^src/(main|renderer)' },
    },
    {
      name: 'sin-imports-profundos-entre-modulos',
      comment: 'D-6: entre módulos de dominio solo se importa el index.ts.',
      severity: 'error',
      from: { path: '^src/main/modules/([^/]+)/' },
      to: { path: '^src/main/modules/(?!$1)([^/]+)/.+', pathNot: 'index\\.ts$' },
    },
    {
      name: 'motor-sin-node',
      comment: 'M-1: el motor no usa módulos de Node (fs, path, crypto…).',
      severity: 'error',
      from: { path: '^src/compartido' },
      to: { dependencyTypes: ['core'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.(test|spec)\\.ts$' },
  },
};

# 09 · Pruebas y calidad

## La puerta

Antes de cerrar cualquier tarea, desde `/app`:

```
npm run verificar:todo
```

Que es: `typecheck` → `lint` → `boundaries` → `test` → `trazabilidad`.

**Al cerrar un hito**, además:

```
npx electron-vite build && npx playwright test
npx electron-builder --dir && PROBAR_PAQUETE=1 npx playwright test
```

Ese último no es adorno. `out/` no basta: hubo un fallo real que **solo** aparecía en el paquete —
`uuid` 14, que es solo ESM, no se resolvía desde el `asar` y tumbaba el proceso principal al
arrancar. Se sustituyó por una implementación propia de UUID v7.

## Qué hay

| | Cuánto | Con qué |
|---|:-:|---|
| Unitarias e integración | **379** en 35 archivos | Vitest |
| Rendimiento | 5 en 3 archivos | Vitest, sin paralelismo |
| Extremo a extremo | **15** en 12 archivos | Playwright sobre la app real |

Los E2E se ejecutan **dos veces**: contra `out/` y contra el paquete (`PROBAR_PAQUETE=1`).

### Las pruebas de extremo a extremo

Cada una recibe **su propia instalación** vía `--user-data=<temporal>`. Antes compartían
directorio y el bloqueo de instancia única las hacía colisionar.

| Prueba | Qué cubre |
|---|---|
| `arranque` (3) | Ventana, SQLite, y que el renderer esté aislado (**conductual**) |
| `arranque-datos` (2) | `--user-data`, migración, respaldo, y que una UNC bloquee el arranque |
| `paso01` | Entidad → sedes → parámetros → ejercicio → puede avanzar |
| `entidadDesdePl01` | La entidad nace del `PL-01` diligenciado, sin teclear nada |
| `eliminarEntidad` | Se elimina antes del ejercicio, y después ya no |
| `formatos` | Las plantillas están dentro y se descargan |
| `inventario` | Listado: filtra, ordena, selecciona, cobertura |
| `calculo` | Calcular y revisar el resultado |
| `bajas` | Proponer y recorrer la decisión |
| `informe` | Generar el PDF |
| `demostracion` | Cargar, recorrer y borrar el hospital de demostración |
| `recorrido-demo` | Todas las pantallas **sin errores del renderer** |

`_lanzar.ts` limpia `ELECTRON_RUN_AS_NODE`, que convierte el binario de Electron en un Node pelado y
rompe el arranque.

## Reglas de las pruebas

**Los valores esperados del motor no se cambian sin justificarlo en la bitácora.** Riesgo `RG-01`.
Si se ajustan al código, el motor queda validado contra sí mismo.

**Las mediciones de rendimiento van en `*.perf.test.ts`**, nunca mezcladas con la suite en paralelo:
darían números sin sentido. `npm run test:rendimiento`, y en la CI un paso propio.

**Un test que compara texto generado debe normalizar los finales de línea.** Lo enseñó la CI: el
`checkout` de Windows convirtió a CRLF la migración de disparadores que se compara byte a byte. Se
añadió `.gitattributes` **y** normalización dentro del test — las dos cosas, porque una sola deja el
agujero abierto.

## Integración continua

`.github/workflows/ci.yml`, matriz **Windows + Linux**, en cada push:

```
Versiones congeladas → Tipos → Lint → Fronteras → Pruebas
→ Rendimiento → Trazabilidad → Empaquetar → E2E sobre el paquete
→ Auditoría de dependencias
```

En Linux los E2E van con `xvfb-run`. Se **empaqueta en cada commit** (riesgo `RG-06`): un fallo de
empaquetado descubierto el día de la entrega es un fallo caro.

### Los tres defectos que encontró la CI, y su lección común

1. **Linux** — `isAbsolute` de `node:path` usaba la plataforma anfitriona: `Z:\valuacion` era
   «relativa» en Linux y el bloqueo de red no saltaba.
2. **Windows** — el `checkout` convirtió a CRLF el archivo comparado byte a byte.
3. **Linux** — `posix.resolve` antepuso el directorio de trabajo a una ruta UNC y la destruyó.

**Los tres son el mismo error de fondo: lógica que parecía determinista pero dependía de la máquina
donde corría.** Desconfíe de cualquier uso de `node:path` sin plataforma explícita.

## Trazabilidad

`npm run trazabilidad` extrae los códigos de `/especificacion/teoria` y comprueba que `docs/trazabilidad.csv` los
cubra todos. **380 requisitos**: 102 `RF`, 79 `RN`, 108 `VAL`, 70 `EN`, 11 `EN-G`, 10 `INT`.

Estado actual: 110 implementados, 10 parciales, 3 no implementados, 257 pendientes.

Los **no implementados** lo son por decisión escrita, no por olvido: `RF-02-01` y `RF-02-02` por
ADR-015 (no hay captura en campo) y `TR-12`/`ANEXO_B` §7.2 por ADR-027 (no hay catálogo de
responsables).

## Otras verificaciones

| Comando | Qué comprueba |
|---|---|
| `npm run verificar:versiones` | Que ninguna dependencia se haya movido |
| `npm run boundaries` | Las 8 fronteras |
| `npm run db:triggers` | Regenera los disparadores; un test exige que `0002` coincida |
| `npm run compat` | Objetivo de navegador del renderer |

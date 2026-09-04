# Estado actual del desarrollo

> **LEER ESTE ARCHIVO PRIMERO.** Es el punto de entrada obligatorio para cualquier persona o agente
> que retome el trabajo. Ver `.claude/config_sesion.json` § *protocolo_inicio*.

**Última actualización:** 2026-09-04
**Actualizado por:** Claude (sesión de implementación — núcleo de ADR-026 completo + defecto de `PL-03`)
**Versión del plan:** 1.1 + **ADR-026** · **Versión de `/Teoria`:** 2.1

---

## 1. Resumen en una frase

**El núcleo de [ADR-026](../plan_desarrollo/DECISIONES/adr_producto.md) está completo: las 6 etapas.**
Un hospital configura la entidad, descarga sus formatos, importa el inventario, **calcula la
depreciación y la obsolescencia**, propone y decide las bajas, y **se lleva su informe en PDF**. El
motor reproduce las cifras de `ANEXO_C` al dígito y tarda 1,27 s en 20.000 bienes.
**386 tests + 5 de rendimiento + 15 E2E**, también sobre el instalador. Lo que queda son las
**extensiones**, que ya no son el camino principal.

> **El orden de trabajo lo fija ADR-026**, no el grafo de hitos A→H. Ver
> [`roadmap_progreso.md`](roadmap_progreso.md) § *Orden de trabajo vigente*.

---

## 2. Última tarea realizada

**Defecto reportado en la importación de `PL-03`**, el 2026-09-04.

| Qué | Dónde |
|---|---|
| **28 de 41 filas se rechazaban** | La clase se comparaba con una clave que solo pasaba a mayúscula. El catálogo sugerido dice «Equipo médico-científico» y quien llena el formato escribe «EQUIPO MEDICO CIENTIFICO». **Una tilde y un guion tumbaban 23 bienes** |
| **Corrección** | `importarPl03.ts`: índice doble (clave exacta y clave laxa sin tildes ni puntuación). La exacta se prueba primero, así que la tolerancia nunca le roba una fila a otra clase |
| **El error ahora es accionable** | Enumera las clases, sedes o servicios que sí están en el catálogo, en vez de mandar a importar `PL-02` sin decir contra qué se comparó |
| **Dónde queda la frontera** | «cómputo» ≠ «computación»: eso sigue siendo error. Adivinar la clase es adivinar la vida útil y la depreciación de un bien que después se firma. El test de regresión fija ese límite |
| **Corpus de prueba** | `COM` se alineó con el catálogo sugerido. Filas que fallarían contra el catálogo precargado: **de 28 a 0** |

**Antes**, el 2026-09-03: **etapas 5 y 6 del núcleo (`T-F-01`, `T-F-02`, `T-D-07`, `T-D-10`, `T-G-03`)**.

| Qué | Dónde |
|---|---|
| **Eliminar entidad** | `entidad:eliminar`, solo mientras **no exista ningún ejercicio** (`ejercicio.entidad_id` es `restrict` e `INT-03` protege los bienes). Exige motivo; la bitácora conserva el `ELIMINAR` |
| **`PL-01` crea la entidad** | *Nueva entidad → Crear desde PL-01*: el formato diligenciado da razón social, NIT, gerente y parámetros. Las demás plantillas siguen exigiendo entidad existente |
| **Instructivo para quien llena** | `npm run instructivo` → `Datos_de_prueba/INSTRUCTIVO_DILIGENCIAMIENTO.md`, generado desde las definiciones del importador: columna por columna, valores admitidos y errores frecuentes. **Solo 5 de las 28 plantillas se llenan hoy** |
| **Datos de prueba** | `npm run datos:prueba` → `/Datos_de_prueba`: hospital ficticio con 41 bienes, y un segundo juego con defectos a propósito. Probado por `datosPrueba.test.ts` |
| **Defecto de navegación corregido** | El `Layout` deducía la entidad solo de la URL; entrar en `/formatos` (que no lleva `:entidadId`) deshabilitaba las demás etapas. Ahora manda la ruta y, si no la trae, la última entidad elegida |
| **Etapa 5 · bajas** | `compartido/motor/baja.ts` (RN-09-03 y RN-09-05) + `main/modules/bajas/`. Bandeja con los motivos del motor, justificación individual exigida (RN-09-06), recorrido de ANEXO_B §6.3, rechazo que devuelve el bien a ACTIVO. `renderer/features/bajas/` |
| **Cierre del inventario** | `bien:activarValidados` (VALIDADO → ACTIVO). Explícito, no un efecto colateral de proponer una baja |
| **Pasos 05 y 06 completos** | `modules/calculo/validaciones/val-05-06.ts` y `modules/bajas/validaciones/val-09.ts`: el catálogo pasa de 27 a **58 validaciones y todas tienen predicado** |
| **Etapa 6 · informe (`T-G-03`)** | `infraestructura/documental/pdf/generarPdf.ts` (ventana oculta, `printToPDF`, Carta) + `modules/informe/`. Método declarado en el encabezado y en el pie de cada página (RF-06-08) |
| **Defectos encontrados por las pruebas** | La bandeja de bajas servía caché rancia tras calcular; el diálogo ofrecía "Libros de Excel" para un PDF |

**Antes**, el 2026-09-02: **etapa 4 — el motor de cálculo**.

| Qué | Dónde |
|---|---|
| **Casos de prueba primero** | `compartido/motor/calculo.test.ts`: 42 casos escritos **antes** del motor y verificados fallando. Todo valor esperado sale de `ANEXO_C`. **No se cambia ninguno sin justificarlo en la bitácora** (`RG-01`) |
| **El motor** | `compartido/motor/{obsolescencia,depreciacion,deterioro,candidatoBaja,resultado}.ts`. Dominio puro: 200 módulos sin violaciones de frontera |
| **Aplicación** | `main/modules/calculo/`: `calcularEjercicio` (ANEXO_C §10), repositorio con upsert masivo, canales `calculo:*` |
| **Interfaz** | `renderer/features/calculo/`: una acción (*Calcular*), totales contables, semáforo navegable y **qué quedó fuera y por qué** |
| **CT-20** | `umbral_semaforo_naranja` existía en `ANEXO_B` pero `ANEXO_C` §2.6 usaba un 1,0 literal. Manda el parámetro. `/Teoria` **no se tocó** |
| **Rendimiento** | 20.050 bienes en **1,27 s** (recálculo 1,13 s). **ADR-020 queda sin objeto**: no hace falta hilo aparte |

**Antes**, el mismo día: **etapa 3 — `T-C-07` y `T-C-08`**.

| Qué | Dónde |
|---|---|
| **Orquestación única de importación** | `infraestructura/documental/excel/orquestadorImportacion.ts`. Cada módulo registra su `ImportadorPlantilla`; el canal `importacion:*` se registra en `registrarHandlers`, no en el paso 01. `previsualizar` acepta `ejercicioId` (lo exigen `PL-03` y `PL-05`) |
| **`PL-03` · los bienes** | `modules/inventario/importacion/`. Resuelve clase/sede/servicio contra el catálogo con mapas cargados una vez. RN-02-01, RN-02-05, VAL-02-03 |
| **`PL-05` · fecha y costo** | `modules/hojas-vida/importacion/` + `repositorio/hojaVida.repo.ts`. RN-03-01/02/04/06, VAL-03-02. `SIN_SOPORTE` genera el soporte `AVALUO_RECONOCIMIENTO_INICIAL` con el SHA-256 del libro importado |
| **Pantalla de la etapa 3** | `features/inventario/paginas/ImportarInventario.tsx`; el paso 02 abre por ahí, no por el listado |
| **Rendimiento** | 10.000 altas en 0,66 s (`importacion.perf.test.ts`) |

**Antes**, el mismo día: ADR-026 y las etapas 1-2 del núcleo.

| Qué | Dónde |
|---|---|
| **ADR-026 · reenfoque** | `plan_desarrollo/DECISIONES/adr_producto.md`. `/Teoria` intacta; cambia el orden. Núcleo + extensiones. El backlog maestro lo advierte en cabecera |
| **`T-G-01`/`T-G-02` · plantillas en la app** | Las 28 viajan en el instalador (`extraResources`); `infraestructura/documental/excel/{catalogoPlantillas,entregarPlantilla}.ts` inyecta clases/sedes/servicios como listas desplegables; pantalla `features/plantillas` |
| **Interfaz simplificada** | `app/Layout.tsx`: de 11 pasos a las 6 etapas del núcleo, con las extensiones aparte y las razones visibles |
| **Aislamiento de los E2E** | `tests/e2e/_lanzar.ts` da a cada prueba su propia instalación: la instancia única ya no las hace colisionar |

**Antes**, el mismo día: `T-C-01` y `T-C-02`, la corrección del fallo de interfaz reportado, y el
hito B completo (`T-B-01` … `T-B-11`).

| Qué | Dónde |
|---|---|
| **Corrección del fallo reportado** | Tres causas: `window.alert` bloqueante al avanzar de paso, el aviso de éxito que se perdía al remontarse el formulario de parámetros, y `frame-ancestors` inválido en la CSP. Detalle en la bitácora |
| **Red de seguridad** | `renderer/app/LimiteError.tsx`: una excepción de render ya no deja la ventana en blanco; muestra el error y lo envía al registro técnico del main (`app:registrarErrorRenderer` → `userData/logs/`) |
| **`T-C-01` motor de validaciones** | `compartido/reglas/validaciones.ts` (27 `VAL-*` de los pasos 01-03) + `modules/validaciones` (motor y canal único) + predicados en `configuracion/val-01`, `inventario/val-02`, `hojas-vida/val-03` |
| **`T-C-02` `<TablaDatos>`** | `componentes/TablaDatos` virtualizado + `modules/inventario` (listado con filtro/orden/paginación en el main, FTS5, cobertura) + pantallas del paso 02 |
| **Rendimiento** | `scripts/sembrar.ts`, `*.perf.test.ts` y `npm run test:rendimiento` (sin paralelismo, paso propio en CI) |

**Antes**, el mismo día: `T-B-01` … `T-B-11` (hito B completo).

| Capa | Qué se añadió en esta parte |
|---|---|
| `src/compartido` | `parametros/parametrosCalculo.ts` (los 16 parámetros de ANEXO_B §2.5 + `metodo_conteo_meses_confirmado`), `reglas/validaciones.ts` (metadatos de VAL-01-01…10), `reglas/codigoInstitucional.ts` (RN-01-02), DTOs de configuración e importación, 32 canales nuevos en el contrato |
| `src/main/infraestructura/documental/excel` | TR-02: lector (detección de encabezados y fila de ejemplo por color), normalizador (ANEXO_C §9), importador genérico con informe fila por fila |
| `src/main/modules/configuracion` | Repositorios, casos de uso (entidad + semillas + clonación, sedes/servicios, clases, parámetros, convención, ejercicio), `validaciones/val-01.ts`, importación PL-01/02/02b, hospital de demostración |
| `recursos/semillas` | `clases_sugeridas`, `abreviaturas`, `subcuentas`, `parametros_defecto`, `hospital_demo` |
| `src/renderer` | Tailwind 3.4 con tokens semánticos claro/oscuro (contraste ≥ 4,5:1), `formato/` es-CO, Zustand, TanStack Query sobre IPC, router en memoria, layout con los 11 pasos, primitivas accesibles, `<PanelValidaciones>`, `<AsistentePasos>`, `<Dialogo>`, y las 5 pantallas del paso 01 + diálogo de importación |
| `tests/e2e` | `paso01.spec.ts` (criterio del backlog de T-B-10) y `demostracion.spec.ts` (T-B-11) |

**Decisiones y hallazgos** (detalle en la bitácora):

1. **CT-18**: la plantilla `PL-01` real difiere de `ANEXO_B` §2.5 (tildes en claves, 4 parámetros
   ausentes, `fecha_corte_ejercicio`). El importador la tolera; conviene regenerarla.
2. `VAL-01-07` se cumple solo con **confirmación explícita por acta** (`metodo_conteo_meses_confirmado`),
   nunca con el valor sugerido (CT-02). Cambiar el método la invalida. Al confirmar, los ejercicios
   aún `ABIERTO` reciben la copia refrescada (RN-01-01 se aplica desde que el ejercicio avanza).
3. `VAL-01-08` (manual de políticas como soporte) queda siempre en advertencia hasta el almacén de
   soportes del hito C.
4. La marca de agua "EJEMPLO — SIN VALIDEZ" de la demostración la aplicará el generador documental
   del hito G leyendo `entidad.es_demostracion`.
5. Rutas del paso 01: `/entidad/:entidadId/paso/01/<subpaso>` (nivel entidad, el ejercicio nace ahí);
   los pasos 02-11 irán bajo `/ejercicio/:id/...` como fija el plan 2.5 §3.
6. **`uuid` retirado:** el paquete instalado fallaba al cargar el main porque `uuid` 14 (solo ESM) no
   se resolvía desde el asar. UUID v7 propio en `infraestructura/db/identificadores.ts`. **Regla:**
   `PROBAR_PAQUETE=1 npx playwright test` en cada cierre de hito; `out/` no basta.

---

## 3. Tarea actual en ejecución

**Ninguna.** Checkpoint limpio: `verificar:todo` (387 tests), `test:rendimiento` (5), 13 E2E
(también sobre el instalador) y `boundaries` en verde (223 módulos).

> **La CI corrió por primera vez el 2026-09-03 y encontró dos defectos**, ya corregidos: el detector
> de unidades de red usaba el `path` del anfitrión en vez de la plataforma que recibe como parámetro
> (falló en Linux), y el `checkout` de Windows convertía a CRLF la migración de triggers que se
> compara byte a byte (se añadió `.gitattributes`). **Falta ver `pack` y los E2E en verde sobre
> Linux:** en la segunda corrida llegó hasta los E2E y falló uno —la UNC dejaba de serlo al
> resolverla con `path` de POSIX—, ya corregido. **Van tres defectos de la CI y los tres son el
> mismo error de fondo: lógica que parecía determinista pero dependía del equipo.** Desconfíe de
> cualquier uso de `node:path` sin plataforma explícita en el arranque.

---

## 4. Siguiente paso inmediato

**El núcleo está cerrado.** No hay una etapa siguiente en el camino principal; lo que queda son
mejoras y extensiones, y el orden lo decide el propietario. Por utilidad:

1. **`T-C-03`** — ficha editable del bien. Hoy, corregir un dato exige arreglar el Excel y reimportar.
   Es el fleco del núcleo y lo más útil de lo que queda.
2. **Comité y resoluciones** (`T-F-03` … `T-F-09`) — desbloquean el final del paso 09: hoy una baja
   llega hasta RESOLUCION_EMITIDA y no puede ejecutarse porque INT-07 exige el acta, que es correcto.
3. **Conciliación contable** (`T-D-08`, `T-D-09`) — activa `VAL-06-07` y el cuadre en tres niveles.
4. **Valuación de muebles e inmuebles** (hito E), **entrega contractual y cierre** (paso 11).

Fleco del propietario: el primer **push** (`T-A-08`) para ver la CI en verde.

Flecos del propietario: primer **push** (`T-A-08`); confirmar **CT-16**, **CT-17**, **CT-18** y
**CT-19** cuando convenga.

---

## 5. Bloqueos y decisiones pendientes

### 5.1 Bloqueos

**Ninguno.**

### 5.2 Pendientes menores, que no bloquean

| # | Asunto | Estado |
|:-:|---|---|
| `CT-16` | Valores de `ValuacionMueble.estado_aprobacion` | Provisional; confirmar antes del hito E |
| `CT-17` | Catálogos de 15 atributos "estado/tipo" | Texto libre; fijar antes de los hitos D y F |
| `CT-18` | `PL-01` desalineada con `ANEXO_B` §2.5 | Tolerada por el importador; regenerar la plantilla |
| `CT-19` | `VAL-03-07` compara contra un dato que `ANEXO_B` no modela | Validación inactiva; requiere `Entidad.fecha_creacion` |
| `T-A-08` | Primer push para activar la CI | Pendiente del propietario |
| `T-D-02` | Golden test contra el archivo real del hospital | Opcional |
| `T-H-02` | Firma de código del instalador | Aplazada al hito H |
| `B-13` | Revisión de fórmulas por el contador | Validación final |

---

## 6. Contexto imprescindible para quien retome

1. **`/Teoria` manda**, versión **2.1**; `ANEXO_C` prevalece en cálculo.
2. **Dinero = `Centavos`** (entero) fuera del motor y `Decimal` dentro; `aCentavos` es la única puerta.
   ESLint bloquea `costoCent * 2`. Los parámetros monetarios de configuración (umbrales) son números
   en pesos: son configuración, no importes contables.
3. **El motor es puro** y tres barreras lo garantizan (tsc, ESLint, dependency-cruiser).
4. **La base defiende sola sus reglas** (119 triggers generados por `npm run db:triggers`; un test
   exige que la migración 0002 coincida con el generador).
5. **Un canal IPC nuevo** = `canales.ts` + `contrato.ts` + `registro.registrar(...)` en el módulo.
   Los que mutan son síncronos (transacción) y escriben bitácora con `ctx.bitacora`. El renderer
   usa `useCanal` / `useMutacion` (`renderer/ipc/consultas.ts`) declarando qué claves invalida.
6. **Una pantalla nueva**: primitivas de `componentes/ui`, formularios con RHF + los esquemas Zod
   del contrato, textos en oración, icono + texto en todo semáforo, controles ≥ 28 px. Invocar la
   skill `apple-design` antes de diseñar.
7. **Importar una plantilla nueva**: definir sus hojas/columnas en `importacion/plantillas.ts`, reusar
   `leerYNormalizar`, añadir reglas de negocio con `rechazarFila` y un aplicador en transacción.
8. Los E2E usan `--user-data=<tmp>`; los selectores por rol (el asterisco de "obligatorio" está en
   la etiqueta, fuera del nombre accesible). `ELECTRON_RUN_AS_NODE` se limpia en `_lanzar.ts`.
8b. **`npm run dev` escribe en la MISMA base que la app instalada.** Electron deriva `userData` de
    `productName`, y ese nombre es idéntico en desarrollo y en el instalador: los dos abren
    `%APPDATA%/Valuación de Activos/valuacion.db`. Desarrollar así aplica las migraciones de la rama
    a la base real, y el instalador —más viejo— puede quedarse sin poder abrirla. Usar
    **`npm run dev:aislado`** (`scripts/dev-aislado.ts`), que da una instalación propia en
    `app/.datos-dev` y **empieza en blanco cada vez** (`-- --conservar` para mantenerla;
    `-- <nombre>` para escenarios paralelos). La limpieza es **al abrir, no al cerrar**: un cierre
    brusco se saltaría la de cierre y la ejecución siguiente arrancaría con restos. Con la app
    instalada abierta, `npm run dev` ni arranca: comparte también el bloqueo de instancia única.
9. Puerta de calidad: `npm run verificar:todo`; E2E: `npx electron-vite build && npx playwright test`;
   **al cerrar un hito**, además `npx electron-builder --dir && PROBAR_PAQUETE=1 npx playwright test`.
10. **Una validación nueva** = entrada en `compartido/reglas/validaciones.ts` + predicado en el
    `val-NN.ts` de su módulo. El motor no puede importar módulos de dominio (ciclo): los predicados
    se inyectan desde `ipc/registrarHandlers.ts`.
11. **Un listado nuevo** usa `<TablaDatos>` con un canal paginado que filtre y ordene **en el main**;
    nunca traer todo al renderer. Las mediciones van en `*.perf.test.ts` (`npm run test:rendimiento`),
    nunca mezcladas con la suite en paralelo.
12. Si el usuario reporta "no muestra nada", mirar `userData/logs/app-*.log`: el límite de error del
    renderer registra ahí toda excepción con su pila.
13. **El orden de trabajo lo fija ADR-026**, no el grafo de hitos. Antes de tomar una tarea, mirar la
    sección *Orden de trabajo vigente* del roadmap: lo que no está en el núcleo va después.
14. **Una plantilla nueva** se declara en `documental/excel/catalogoPlantillas.ts` (dónde está, qué
    columna recibe qué catálogo, en qué etapa se usa). El archivo real va en
    `Plantillas_Valuacion_Activos/` y viaja al instalador por `extraResources`.
15. **El motor no se toca sin sus pruebas.** Toda fórmula vive en `compartido/motor`; los casos de
    `compartido/motor/calculo.test.ts` salen de `ANEXO_C` y **ningún valor esperado se cambia sin una
    entrada en la bitácora que lo justifique** (`RG-01`). El caso de uso `calcularEjercicio` no
    contiene aritmética: lee, llama al motor y persiste.
16. **Un resultado que no se pudo calcular nunca es un cero.** El motor devuelve `NO_APLICA`,
    `NO_CALCULABLE` o `ERROR_DATOS` con su motivo, y la interfaz los muestra por separado: significan
    cosas distintas para quien tiene que arreglarlos.
17. **La app registra estados; no decide.** Ninguna baja se ejecuta desde el código: la propuesta
    recorre `ANEXO_B` §6.3 y el paso a EJECUTADO lo bloquea INT-07 hasta que exista el acta del
    Comité. Si algo parece que "el sistema decidió", está mal planteado.
18. **Toda validación declarada tiene predicado.** El catálogo de `compartido/reglas/validaciones.ts`
    (58 códigos) y `codigosSinPredicado()` deben seguir cuadrando: añadir una entrada sin su predicado
    rompe la prueba a propósito.

---

## 7. Estado por fase

| Fase | Planificada | Ejecutada | Nota |
|---|:-:|:-:|---|
| 1 · Análisis | ✅ | ✅ | Conteos corregidos; CT-16, CT-17, CT-18 registradas |
| 2 · Arquitectura | ✅ | 🟡 | Procesos, IPC, persistencia, motor (base) y renderer (base) en pie |
| 3 · Stack | ✅ | ✅ | Congelado; librerías de interfaz añadidas con versión exacta |
| 4 · Inicialización | ✅ | ✅ | |
| 5 · Implementación | ✅ | 🟡 | **Núcleo ADR-026: 6 de 6 etapas ✅** · 34/64 tareas |
| 6 · Testing | ✅ | 🟡 | 386 unit/integración + 5 de rendimiento + 15 E2E (también sobre el paquete) |
| 7 · Seguridad | ✅ | 🟡 | CSP, sandbox, lista blanca IPC, P-1 (el main abre los diálogos), triggers |
| 8 · Build | ✅ | 🟡 | Instalador regenerado con la interfaz nueva; firma pendiente (hito H) |
| 9 · Validación | ✅ | ❌ | — |

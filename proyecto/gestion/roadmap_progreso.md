# Roadmap de progreso

**Sincronizado con:** `/proyecto/plan` v1.1
**Última actualización:** 2026-09-24 *(ADR-029: el proceso es lo principal; ADR-028: las extensiones quedan omitidas)*

> **Regla de sincronización.** Este archivo debe reflejar siempre las fases y tareas definidas en
> `/proyecto/plan/FASE_5_IMPLEMENTACION/5.0_backlog_maestro.md`. Si el backlog cambia, este archivo
> se actualiza en la misma sesión. Ver `.claude/config_sesion.json` § *sincronizacion*.

## Alcance vigente (ADR-028 y ADR-029)

**Desde el 2026-09-24 el alcance lo fijan [ADR-028 y ADR-029](../plan/DECISIONES/adr_producto.md).**
Lo principal es el **proceso de valuación**: se inicia (hospital + fecha de corte), se configura, se
carga su inventario por barridos, se calcula a su fecha, se registran las bajas, se saca el informe
sin firmas y se **finaliza**. Cada proceso es independiente. **Las extensiones de ADR-026 se
retiraron** y sus tareas quedan ⏭️.

### El producto

| # | Sección | Tareas | Estado |
|:-:|---|---|:-:|
| 0 | **Procesos**: iniciar, continuar, **finalizar** (solo lectura) | ADR-029 | ✅ |
| 1 | **Configurar** el proceso: hospital, clases y parámetros | `T-B-10`, ADR-029 | ✅ |
| 2 | **Formatos**: las 5 plantillas desde la aplicación, con sus catálogos | `T-G-01`, `T-G-02` | ✅ |
| 3 | **Inventario**: barridos (`PL-03`) y datos económicos (`PL-05`) | `T-C-07` ✅, `T-C-08` ✅, ADR-028 ✅, `T-C-03` ⬜ | 🟡 |
| 4 | **Calcular** a la fecha de corte del proceso ★ | `T-D-01`, `T-D-03` … `T-D-06`, ADR-029 | ✅ |
| 5 | **Bajas**: candidatos y registro | `T-D-07`, `T-D-10`, `T-F-01`, ADR-028 | ✅ |
| 6 | **Informe** del proceso | `T-G-03`, ADR-028 | ✅ |

★ El cálculo es la razón de ser del producto: el resto existe para alimentarlo y para explicar su
resultado.

### Omitidas por ADR-028

| Lo retirado | Pasos | Tareas |
|---|:-:|---|
| Conciliación físico-contable | 04 | `T-D-08`, `T-D-09` ⏭️ |
| Valuación técnica de muebles | 07 | `T-E-01` … `T-E-04` ⏭️ |
| Inmuebles y avalúos | 08 | `T-E-05` … `T-E-08` ⏭️ |
| Comité, resoluciones, consolidación y propuestas de baja | 09-10 | `T-F-02` (flujo del Comité), `T-F-03` … `T-F-09` ⏭️ |
| Entrega contractual y cierre del ejercicio | 11 | `T-F-10`, `T-F-11`, `T-G-07`, `T-G-08` ⏭️ |
| Soporte físico (fotos, etiquetas, custodia) | 02 | `T-C-05`, `T-C-06`, `T-G-06` ⏭️ |

Las tablas por hito de más abajo se conservan como **registro histórico** del plan original; **no se
remarcaron fila por fila**. Donde discrepen con esta sección, manda esta sección.

---

## Leyenda de estados

| Símbolo | Estado | Significado |
|:-:|---|---|
| ⬜ | **Pendiente** | No iniciado |
| 🟡 | **En curso** | Alguien está trabajando en ello |
| ✅ | **Completado** | Cumple su criterio de verificación y su definición de terminado |
| 🔵 | **Bloqueado** | No puede avanzar: falta una dependencia o una decisión |
| ⏭️ | **Omitido** | Decidido no hacer. Requiere justificación escrita |

---

## Resumen

| | Total | ✅ | 🟡 | ⬜ | 🔵 |
|---|:-:|:-:|:-:|:-:|:-:|
| **Fases del plan** | 9 | 3 | 5 | 1 | 0 |
| **Tareas de implementación** | 64 | **34** | **1** | 29 | **0** |

**Avance de implementación: 53 % (34/64 completadas; `T-A-08` espera el primer push) · Tareas bloqueadas: ninguna**
**Núcleo de ADR-026: 6 de 6 etapas ✅** — configurar → formatos → importar → calcular → bajas → informe. Un hospital recorre el proceso completo y sale con su informe en PDF. Lo que queda son las **extensiones**.

---

## Fases del plan de desarrollo

| Fase | Documentación | Ejecución | Documento |
|---|:-:|:-:|---|
| **1 · Análisis** | ✅ | ✅ | [`FASE_1_ANALISIS/`](../plan/FASE_1_ANALISIS/) — conteos de 1.1 §1 corregidos (2026-09-02) |
| **2 · Arquitectura** | ✅ | 🟡 | [`FASE_2_ARQUITECTURA/`](../plan/FASE_2_ARQUITECTURA/) — esqueleto de procesos + IPC mínimo |
| **3 · Stack tecnológico** | ✅ | ✅ | [`FASE_3_STACK/`](../plan/FASE_3_STACK/) — congelado en `app/docs/decisiones-runtime.md` |
| **4 · Inicialización** | ✅ | ✅ | [`FASE_4_INICIALIZACION/`](../plan/FASE_4_INICIALIZACION/) — `/app` creado |
| **5 · Implementación** | ✅ | 🟡 | [`FASE_5_IMPLEMENTACION/`](../plan/FASE_5_IMPLEMENTACION/) — hito A 6✅+2🟡 |
| **6 · Testing** | ✅ | 🟡 | [`FASE_6_TESTING/`](../plan/FASE_6_TESTING/) — Vitest y Playwright operativos |
| **7 · Seguridad** | ✅ | 🟡 | [`FASE_7_SEGURIDAD/`](../plan/FASE_7_SEGURIDAD/) — CSP/sandbox/aislamiento probados |
| **8 · Build y distribución** | ✅ | 🟡 | [`FASE_8_BUILD/`](../plan/FASE_8_BUILD/) — NSIS funcional, sin firma |
| **9 · Validación final** | ✅ | ⬜ | [`FASE_9_VALIDACION/`](../plan/FASE_9_VALIDACION/) |

---

## HITO A — Esqueleto ejecutable · 7/8 (+1 🟡)

**Estado: 🟡 Casi cerrado (2026-09-02) · Fleco: primer push para ver la CI verde (`T-A-08`)**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-A-01` | Congelar versiones (Electron, Node, React, TS) | ✅ | — | Electron 44.1.1 · TS 5.9.3 · React 19.2.8. Ver `app/docs/decisiones-runtime.md` |
| `T-A-02` | Andamiaje electron-vite (main/preload/renderer) | ✅ | `T-A-01` | HMR verificado; CSP por entorno; preload CJS por sandbox |
| `T-A-03` | Instalador NSIS con `better-sqlite3` integrado | ✅ | `T-A-02` | Instalador 98,9 MB; E2E sobre el paquete ✓; **el propietario confirmó el 2026-09-02** que instala, muestra "SQLite conectada" y desinstala |
| `T-A-04` | ESLint, Prettier, Stylelint, compat, fronteras | ✅ | `T-A-02` | Probado: `import 'fs'` en el motor falla por 3 vías; `Object.groupBy` falla |
| `T-A-05` | Medición base: tamaño y arranque | ✅ | `T-A-03` | 98,9/120 MB · 324/350 MB · 193 kB/2,5 MB · ≈5 s frío. Hardware objetivo → Fase 9 |
| `T-A-06` | Script de trazabilidad `/especificacion/teoria` → CSV | ✅ | `T-A-02` | 380 requisitos (378 PENDIENTE + 2 NO_IMPLEMENTADO ADR-015). Conteos 1.1 §1 corregidos |
| `T-A-07` | Test de configuración segura de Electron | ✅ | `T-A-02` | 11 unit + verificación conductual E2E (sin `require`/`process` en el renderer) |
| `T-A-08` | CI completa con empaquetado y E2E | 🟡 | `T-A-03`…`T-A-07` | 2026-09-03: **primera corrida**. Encontró 2 defectos reales (rutas de red dependientes del anfitrión en Linux; CRLF en la migración de triggers en Windows), ya corregidos. Falta ver `pack` y los E2E en verde sobre Linux |

---

## HITO B — Núcleo · 11/11

**Estado: ✅ Cerrado (2026-09-02) · Pendiente de la etiqueta `v0.2.0-hito-B` tras el primer push**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-B-01` | Tipos base, 15 enums, jerarquía de errores | ✅ | Hito A | 2026-09-02. 15 catálogos canónicos + 14 auxiliares con registro; test de exhaustividad contra la tabla de ANEXO_B. CT-16 detectada |
| `T-B-02` | `Centavos`, `decimal.js`, fechas, 3 métodos de conteo | ✅ | `T-B-01` | 2026-09-02. RED-01…06; JDN sin `Date`; caso ANEXO_C §3.3 reproducido (86 / 86,1109 · 11.342.100,44 / 11.356.724,23); propiedades con fast-check |
| `T-B-03` | Esquema SQLite, migraciones, respaldos | ✅ | `T-B-01` | 2026-09-02. 44 tablas Drizzle con CHECK desde catálogos; SQL por drizzle-kit; migrador propio con `user_version`; respaldo verificado antes de migrar; FTS5 por triggers. 20 tests |
| `T-B-04` | `INT-01`…`INT-10` como restricciones y triggers | ✅ | `T-B-03` | 2026-09-02. `generar-triggers.ts` → 118 triggers (INT-09 sobre 33 tablas, indirectas incluidas); INT-03 exceptúa solo al hospital demo; 16 tests por SQL directo; test de sincronía generador↔migración |
| `T-B-05` | Máquinas de estado como datos | ✅ | `T-B-01` | 2026-09-02. 4 máquinas en `compartido/estados`; triggers generados desde los datos (estado inicial + transiciones); RN-09-04 incluida |
| `T-B-06` | Arranque, instancia única, bloqueo de unidad de red | ✅ | `T-B-03` | 2026-09-02. `arrancar()` inyectable; config.json (Zod); `--datos`/`--user-data`/`--log`; UNC + DriveType/df; log rotativo 14 d; respaldo diario (10); E2E: la UNC bloquea y no crea la base |
| `T-B-07` | Catálogo de responsables (sin login) | ✅ | `T-B-03` | 2026-09-02. Módulo `plataforma`: repo Drizzle, casos de uso, 4 canales; perito exige R.A.A; nunca se borra, se desactiva; bitácora en cada cambio. 8 tests |
| `T-B-08` | Infraestructura IPC con middleware | ✅ | `T-B-01`, `T-B-07` | 2026-09-02. Contrato Zod + `satisfies` contra la lista blanca (sin Zod en el preload); cadena 1-2-5-6-7-8-9; transacción + bitácora; sobre `RespuestaIpc`; `GestorTareas` (250 ms, cancelación); test canales==contrato; E2E claves de `window.api` |
| `T-B-09` | Bitácora con justificación obligatoria | ✅ | `T-B-04`, `T-B-08` | 2026-09-02. `registrarCambios` (una fila por campo) rechaza los 8 sensibles sin justificación; trigger `RNF-07` en base; misma transacción que el caso de uso (probado con reversión) |
| `T-B-10` | **Paso 01 completo** (parametrización) | ✅ | `T-B-05`…`T-B-09` | 2026-09-02. Backend (30 canales, semillas, VAL-01-01…10, importación PL-01/02/02b contra plantillas reales) + sistema de diseño (Tailwind 3.4 con tokens claro/oscuro, primitivas accesibles, `<PanelValidaciones>`, `<AsistentePasos>`) + las 5 pantallas. E2E: entidad → sedes → parámetros → ejercicio congelado → el panel bloquea y luego permite avanzar. RF-01-07 (oficio Word) llega con el hito G |
| `T-B-11` | **Hospital de demostración** | ✅ | `T-B-10` | 2026-09-02. `hospital_demo.json` (2 sedes, 8 servicios, 6 clases, 7 responsables, 50 bienes con hoja de vida, inmueble con avalúo, ejercicio con método confirmado); banda visible permanente; borrado de un clic verificado sin residuos (unit + E2E). La marca de agua la aplica el generador documental (hito G) leyendo `es_demostracion` |

---

## HITO C — Levantamiento (pasos 02 y 03) · 2/8

**Estado: 🟡 En curso (2026-09-02) · `T-C-01` y `T-C-02` cerradas**

> `T-C-04` eliminada por ADR-015: la app no se usa en campo. `T-C-07` (importador) es la tarea
> crítica del hito.

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-C-01` | Motor de validaciones + `<PanelValidaciones>` | ✅ | Hito B | 2026-09-02. Catálogo declarativo (27 `VAL-*` de los pasos 01-03) + motor con predicados por módulo + canal único `validaciones:evaluar`. Un código sin predicado se reporta, no pasa en silencio |
| `T-C-02` | `<TablaDatos>` virtualizada | ✅ | Hito B | 2026-09-02. Virtualización, filtro/orden **en el main** (FTS5 + catálogos), selección sobre el filtro completo, anchos persistidos, estados vacío/carga/error diferenciados. Presupuesto verificado con 20.000 bienes en `npm run test:rendimiento` |
| `T-C-03` | CRUD y ficha editable de bienes + código institucional | ⬜ | `T-C-01`, `T-C-02` | |
| `T-C-05` | Almacén de archivos y fotos | ⬜ | `T-C-03` | CT-14 |
| `T-C-06` | Movimientos y actas de custodia | ⬜ | `T-C-03` | |
| `T-C-07` | **Importador Excel genérico — CRÍTICA** | ✅ | `T-B-08` | 2026-09-02, corregido el 2026-09-04 (la clase se comparaba sin ignorar tildes ni puntuación: rechazaba 28 de 41 filas). Orquestación única en `infraestructura/documental/excel/orquestadorImportacion`; cada módulo registra su plantilla. `PL-03` (bienes) y `PL-05` (fecha y costo, mantenimientos, avalúo de reconocimiento inicial) con RN-02-01, RN-02-05, RN-03-01/02/04/06 y VAL-02-03, VAL-03-02. 10.000 altas en 0,66 s |
| `T-C-08` | Probar el importador con los `.xlsx` reales | ✅ | `T-C-07` | 2026-09-02. Las 5 plantillas con definición (`PL-01`, `PL-02`, `PL-02b`, `PL-03`, `PL-05`) se prueban sobre el archivo real, no sobre uno sintético; incluye ida y vuelta descarga → diligenciar → importar |
| `T-C-09` | **Paso 03 completo** (hojas de vida) | 🟡 | `T-C-05`, `T-C-07` | 2026-09-02: hecha la **parte económica** (importar `PL-05`, marcado automático de incompletos, mantenimientos, RN-03-04). Falta la ficha editable y el PDF de hoja de vida |

---

## HITO D — Conciliación y cálculo (pasos 04, 05, 06) · 7/10

**Estado: 🟡 Los pasos 05 y 06 están completos y probados contra `ANEXO_C`. La conciliación (paso 04, `T-D-08` y `T-D-09`) es extensión, no núcleo (ADR-026).**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-D-01` | **Casos de prueba del motor (primero)** | ✅ | Hito C | 2026-09-02. 42 casos en `compartido/motor/calculo.test.ts`, escritos **antes** que el motor y verificados fallando. Todos los valores esperados salen de `ANEXO_C` §2.3, §2.4, §2.6, §2.7, §3.2-3.4, §4 y §11 |
| `T-D-02` | Golden test contra archivo real | ⬜ | `T-D-01` | **Opcional**, si el cliente lo entrega |
| `T-D-03` | `motor/obsolescencia.ts` | ✅ | `T-D-01` | 2026-09-02. Reproduce §2.3 al dígito (3.780 d → 10,3491 → 0,6899 → AMARILLO → fin 2030-02-23). Semáforo con los 3 umbrales (CT-04, **CT-20**) |
| `T-D-04` | `motor/candidatoBaja.ts` | ✅ | `T-D-03` | 2026-09-02. Devuelve **los motivos**, no un booleano: la propuesta de baja va a resolución firmada |
| `T-D-05` | `motor/depreciacion.ts` + deterioro | ✅ | `T-D-01` | 2026-09-02. Los tres métodos de §3.3 reproducen las tres cifras publicadas y su diferencia exacta de $14.623,79. Deterioro de §4 |
| `T-D-06` | Medición del cálculo masivo (20.000) | ✅ | `T-D-05` | 2026-09-02. **20.050 bienes en 1,27 s** (recálculo 1,13 s); presupuesto 10 s. Sin necesidad de hilo aparte: ADR-020 no hace falta |
| `T-D-07` | **Paso 05 completo** | ✅ | `T-D-03`, `T-D-04` | 2026-09-03. Cálculo, semáforo navegable, listado por bien, obsolescencia funcional y **los 9 predicados VAL-05-***. Quedan fuera del núcleo las gráficas (RF-05-06) y la exportación de `PL-08` (RF-05-07) |
| `T-D-08` | Motor de emparejamiento `RN-04-01` | ⬜ | `T-C-07` | `RG-13` |
| `T-D-09` | **Paso 04 completo** + cuadre 3 niveles | ⬜ | `T-D-08` | |
| `T-D-10` | **Paso 06 completo** | ✅ | `T-D-05`, `T-D-06` | 2026-09-03. Motor, totales, excluidos con motivo, consolidado por subcuenta en el informe y **los 10 predicados VAL-06-***. `VAL-06-07` queda NO IMPLEMENTADO: necesita la depreciación de libros del paso 04 (extensión) |

---

## HITO E — Valuación (pasos 07 y 08) · 0/8

**Estado: ⬜ Pendiente**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-E-01` | `motor/valuacionMueble.ts` | ⬜ | Hito D | `ANEXO_C` §5 |
| `T-E-02` | Paso 07: bandeja y ficha de valuación | ⬜ | `T-E-01` | Compara contra `valor_neto_libros` |
| `T-E-03` | Valuación masiva por familia | ⬜ | `T-E-02` | Cohorte CT-12 |
| `T-E-04` | Biblioteca de referencias de mercado | ⬜ | `T-E-02` | Vigencia 12 meses |
| `T-E-05` | Registro de inmuebles | ⬜ | Hito D | |
| `T-E-06` | Avalúo, lista de chequeo, vigencia | ⬜ | `T-E-05` | Alerta 60 días |
| `T-E-07` | Estudio de mercado con dispersión | ⬜ | `T-E-05` | `ANEXO_C` §6.1 |
| `T-E-08` | Legalización de predios | ⬜ | `T-E-06` | `RN-08-07` |

---

## HITO F — Bajas, consolidación y cierre (pasos 09, 10, 11) · 0/11

**Estado: ⬜ Pendiente**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-F-01` | Bandeja de candidatos a baja | ✅ | `T-D-04` | 2026-09-03. Alimentada por `calculo_obsolescencia`; muestra **los motivos que dio el motor**, no un booleano. Incluye el cierre del inventario (VALIDADO → ACTIVO) |
| `T-F-02` | Propuestas con justificación individual | ✅ | `T-F-01` | 2026-09-03. Rechaza la justificación genérica (RN-09-06); relación reparación/reposición (RN-09-03); efecto contable desde el paso 06 (RN-09-05); recorrido PROPUESTO → EN_REVISION → APROBADO_COMITE, y el rechazo devuelve el bien a ACTIVO (RN-09-04) |
| `T-F-03` | Flujo de aprobación + Comité | ⬜ | `T-F-02`, `T-B-05` | `INT-07` |
| `T-F-04` | Efecto contable, disposición, custodia | ⬜ | `T-F-03` | `RN-09-02` |
| `T-F-05` | `motor/consolidacion.ts` | ⬜ | `T-F-04` | Regla de exclusión mutua |
| `T-F-06` | Cuadre en tres niveles como puerta | ⬜ | `T-F-05` | `RN-10-02` |
| `T-F-07` | Actas del Comité con quórum | ⬜ | `T-F-03` | |
| `T-F-08` | Actos administrativos y congelado | ⬜ | `T-F-06`, `T-F-07`, Hito G | `RN-10-07` |
| `T-F-09` | Instructivo de causación | ⬜ | `T-F-08` | `EN-10-07` |
| `T-F-10` | Matriz de productos y Manual | ⬜ | `T-F-08` | `RN-11-02` |
| `T-F-11` | **Cierre del ejercicio** (hash, inmutable) | ⬜ | `T-F-10` | `INT-09` |

---

## HITO G — Documental · 0/8

**Estado: ⬜ Pendiente · Transversal, corre en paralelo desde el hito B**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-G-01` | Exportador Excel con catálogos | ✅ | Hito B | 2026-09-02. `entregarPlantilla.ts`: inyecta clases, sedes y servicios como listas desplegables (hoja auxiliar si superan el límite de Excel) y sustituye el membrete |
| `T-G-02` | Las 20 plantillas `PL-*` en blanco | ✅ | `T-G-01` | 2026-09-02. **Las 28** (20 Excel + 8 Word) viajan en el instalador y se descargan desde la pantalla *Formatos*. Prueba de ida y vuelta: descargar → diligenciar → volver a importar |
| `T-G-03` | Generador PDF (`printToPDF`) | ✅ | Hito B | 2026-09-03. Ventana oculta sin Node ni JavaScript; tamaño Carta; método de conteo declarado en el pie de cada página (RF-06-08). Con él se genera el **informe de valuación** completo |
| `T-G-04` | **Auditoría de las 8 plantillas Word** | ⬜ | Hito B | `RG-08` · hacer pronto |
| `T-G-05` | Generador Word con docxtemplater | ⬜ | `T-G-04` | |
| `T-G-06` | Etiquetas Code128/QR | ⬜ | `T-C-03` | Probar con escáner real |
| `T-G-07` | Compilador de expediente | ⬜ | `T-G-03`, `T-G-05` | |
| `T-G-08` | Exportación editable y `.valz` | ⬜ | `T-G-01`, `T-B-03` | `RN-11-04` |

---

## HITO H — Empaquetado y distribución · 0/5

**Estado: ⬜ Pendiente**

| Tarea | Descripción | Estado | Depende de | Notas |
|---|---|:-:|---|---|
| `T-H-01` | Instalador NSIS definitivo | ⬜ | `T-A-03` | No borrar `userData` |
| `T-H-02` | Firma de código | ⬜ | `T-H-01` | Decisión aplazada al hito H |
| `T-H-03` | Instaladores macOS y Linux | ⬜ | `T-H-01` | Solo si se solicitan |
| `T-H-04` | Manuales de instalación y usuario | ⬜ | Hito F | |
| `T-H-05` | **Prueba de aceptación de punta a punta** | ⬜ | F, G, `T-H-01` | Los 18 pasos de Fase 9 §I |

---

## Tareas bloqueadas

**Ninguna.** Al resolverse las quince contradicciones el 2026-09-01 se desbloquearon las ocho tareas
que lo estaban:

| Tarea | Estaba bloqueada por | Resolución |
|---|---|---|
| `T-B-07` | CT-08 | Sin login; pasa a ser catálogo de responsables |
| ~~`T-C-04`~~ | CT-05 | **Eliminada.** La app no se usa en campo |
| `T-D-01` | CT-01 | La fórmula manda; ejemplos corregidos en `/especificacion/teoria` v2.1 |
| `T-D-02` | CT-01 | Pasa a **opcional** |
| `T-D-05` | CT-02 | `dias_exactos` por defecto |
| `T-E-02` | CT-03 | Compara contra `valor_neto_libros` |
| `T-F-05` | CT-11 | Regla de exclusión mutua definida |
| `T-H-02` | Firma de código | Decisión aplazada al hito H, no bloquea |

**El núcleo de ADR-026 está completo.** Un hospital configura la entidad, descarga sus formatos,
importa el inventario, calcula la depreciación y la obsolescencia, propone y decide las bajas, y
genera su informe en PDF. Lo que sigue ya no es el camino principal:

1. **`T-C-03`** — ficha editable del bien, para corregir un dato sin volver al Excel. Es el fleco del
   núcleo y lo más útil de lo que queda.
2. **Extensiones**, en el orden en que un hospital las pide: Comité y resoluciones (`T-F-03` …
   `T-F-09`, que desbloquean EJECUTADO en las bajas), conciliación contable (`T-D-08`, `T-D-09`),
   valuación de muebles e inmuebles, entrega contractual y cierre.

Fleco del propietario: el primer push para ver la CI verde (`T-A-08`).

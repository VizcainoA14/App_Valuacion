# Plan de Desarrollo — Aplicación de Valuación de Activos (E.S.E / Hospitales)

**Versión del plan:** 1.0
**Fecha:** 2026-09-01
**Fuente funcional autoritativa:** `/especificacion/teoria` (v2.0) y `/especificacion/plantillas`
**Estado:** planificación cerrada · implementación NO iniciada

---

## 1. Qué es este documento

Este directorio contiene el **plan técnico de construcción** de la aplicación descrita en `/especificacion/teoria`.
No contiene teoría de negocio ni código. Su único propósito es que cualquier desarrollador o agente
pueda construir la aplicación **desde cero**, en orden, sin ambigüedad y sin volver a discutir
decisiones ya tomadas.

### Reglas de precedencia (importante)

| Orden | Fuente | Qué manda |
|:-:|---|---|
| 1 | `/especificacion/teoria/ANEXO_C_FORMULAS_Y_REGLAS.md` | Motor de cálculo. Prevalece sobre cualquier paso. |
| 2 | `/especificacion/teoria/*` (resto) | Requisitos funcionales, reglas de negocio, validaciones, entregables. |
| 3 | `/proyecto/plan/*` | **Cómo** construirlo: arquitectura, stack, orden, verificación. |
| 4 | `/proyecto/gestion/*` | **Dónde vamos**: estado, progreso, bitácora. |

> Este plan **nunca** contradice a `/especificacion/teoria`. Las 15 discrepancias detectadas dentro de `/especificacion/teoria` se
> resolvieron el **2026-09-01**: las que exigían corregir la base teórica ya se aplicaron —`/especificacion/teoria`
> pasó a la versión **2.1**, con el registro completo en
> [`/especificacion/teoria/CORRECCIONES.md`](../../especificacion/teoria/CORRECCIONES.md)— y el análisis se conserva en
> [1.4 Contradicciones](FASE_1_ANALISIS/1.4_contradicciones_teoria.md).

---

## 2. Restricciones fijas del proyecto (no re-discutir)

| # | Restricción | Origen |
|:-:|---|---|
| R-01 | Aplicación de **escritorio**, no web ni móvil | Solicitud del cliente |
| R-02 | Arquitectura **monolítica** (un solo ejecutable, una sola base de datos local) | Solicitud del cliente |
| R-03 | **Electron** como framework de escritorio | Solicitud del cliente |
| R-04 | **React** para la interfaz gráfica | Solicitud del cliente |
| R-05 | Piso de compatibilidad de navegador: **~4 años** (Chrome/Edge 105, Firefox 104, Safari 15.6) | Solicitud del cliente · ver [ADR-022](DECISIONES/adr_arquitectura.md#adr-022--compatibilidad-de-navegadores) |
| R-09 | **Monousuario, sin inicio de sesión.** Se instala a una persona en el hospital | Decisión 2026-09-01 · [ADR-016](DECISIONES/adr_arquitectura.md#adr-016--modelo-de-usuario-y-despliegue) |
| R-10 | El inventario entra **solo por importación** de `PL-03`. La app no se usa en campo | Decisión 2026-09-01 · [ADR-015](DECISIONES/adr_arquitectura.md#adr-015--captura-de-inventario-en-campo-rf-02-01) |
| R-06 | Nada "quemado" en el código: todo dato variable entre hospitales es parámetro | `/especificacion/teoria/README.md` §4 |
| R-07 | Nunca borrar, siempre versionar; un ejercicio cerrado es inmutable | `/especificacion/teoria/00_MARCO_GENERAL.md` §10.5, `INT-09` |
| R-08 | Ningún ajuste sin soporte documental y sin responsable identificado | `/especificacion/teoria/00_MARCO_GENERAL.md` §5.6 |

---

## 3. Estructura de este directorio

```
proyecto/plan/
├── README.md                              ← este archivo (índice maestro)
├── 00_RESUMEN_EJECUTIVO.md                ← una página: qué se construye y en qué orden
│
├── FASE_1_ANALISIS/
│   ├── 1.1_requerimientos.md              Catálogo consolidado RF/RN/VAL/EN + priorización
│   ├── 1.2_modulos_y_dominios.md          Descomposición en 12 módulos y sus fronteras
│   ├── 1.3_riesgos.md                     Registro de riesgos con mitigación y disparador
│   └── 1.4_contradicciones_teoria.md      ★ Las 15 discrepancias y su resolución (TODAS resueltas)
│
├── FASE_2_ARQUITECTURA/
│   ├── 2.1_arquitectura_general.md        Monolito modular hexagonal, capas, dependencias
│   ├── 2.2_procesos_electron.md           Main / Preload / Renderer / utilityProcess
│   ├── 2.3_contrato_ipc.md                Contrato IPC tipado y validado
│   ├── 2.4_persistencia.md                SQLite, esquema, migraciones, respaldos, ficheros
│   ├── 2.5_estado_renderer.md             Zustand + TanStack Query, navegación, formularios
│   └── 2.6_motor_de_calculo.md            Diseño del núcleo de cálculo (ANEXO_C)
│
├── FASE_3_STACK/
│   ├── 3.1_stack_y_versiones.md           Versiones fijadas y justificadas
│   ├── 3.2_compatibilidad.md              ★ Browserslist, transpilación, auditoría de librerías
│   └── 3.3_matriz_dependencias.md         Dependencia → uso → riesgo → alternativa
│
├── FASE_4_INICIALIZACION/
│   ├── 4.1_estructura_carpetas.md         Árbol de directorios del repositorio de código
│   ├── 4.2_scripts_y_tooling.md           package.json, lint, format, hooks, CI
│   └── 4.3_configuracion_y_entorno.md     Variables de entorno y configuración en runtime
│
├── FASE_5_IMPLEMENTACION/
│   ├── 5.0_backlog_maestro.md             ★ Todas las tareas, con dependencias y verificación
│   ├── 5.1_hito_A_esqueleto.md            Andamiaje ejecutable
│   ├── 5.2_hito_B_nucleo.md               Dominio + persistencia + IPC + parametrización
│   ├── 5.3_hito_C_levantamiento.md        Pasos 02, 03
│   ├── 5.4_hito_D_conciliacion_calculo.md Pasos 04, 05, 06
│   ├── 5.5_hito_E_valuacion.md            Pasos 07, 08
│   ├── 5.6_hito_F_bajas_cierre.md         Pasos 09, 10, 11
│   └── 5.7_hito_G_documental.md           Excel / Word / PDF / etiquetas
│
├── FASE_6_TESTING/6.1_estrategia_testing.md
├── FASE_7_SEGURIDAD/7.1_seguridad.md
├── FASE_8_BUILD/8.1_build_y_distribucion.md
├── FASE_9_VALIDACION/9.1_checklist_final.md
│
└── DECISIONES/
    ├── README.md                          Índice de las 25 decisiones técnicas (ADR)
    ├── adr_stack.md                       ADR-001 … ADR-014 (tecnología)
    └── adr_arquitectura.md                ADR-015 … ADR-025 (arquitectura y proceso)
```

---

## 4. Orden de lectura para quien retoma el trabajo

1. `/proyecto/gestion/estado_actual.md` — **siempre primero**. Dice en qué punto está el desarrollo.
2. `00_RESUMEN_EJECUTIVO.md` — panorama en una página.
3. `FASE_1_ANALISIS/1.4_contradicciones_teoria.md` — qué está pendiente de aclarar con el cliente.
4. `DECISIONES/README.md` — qué ya está decidido y **no** debe volver a discutirse.
5. `FASE_5_IMPLEMENTACION/5.0_backlog_maestro.md` — la siguiente tarea y sus dependencias.
6. El documento de la fase en la que se esté trabajando.

---

## 5. Convención de códigos de este plan

| Prefijo | Significado | Ejemplo |
|---|---|---|
| `T-<hito>-<nn>` | Tarea de implementación | `T-B-04` |
| `ADR-<nnn>` | Decisión técnica registrada | `ADR-006` |
| `RG-<nn>` | Riesgo del proyecto | `RG-03` |
| `CT-<nn>` | Contradicción detectada en `/especificacion/teoria` | `CT-02` |
| `MOD-<nn>` | Módulo de la aplicación | `MOD-05` |
| `CV-<nn>` | Criterio de verificación | `CV-12` |

Los códigos de `/especificacion/teoria` (`RF-`, `RN-`, `VAL-`, `EN-`, `IN-`, `PL-`, `INT-`) se citan tal cual,
nunca se renumeran.

---

## 6. Estado de este plan

| Fase | Documentada | Ejecutada |
|---|:-:|:-:|
| 1 · Análisis | Sí | — |
| 2 · Arquitectura | Sí | — |
| 3 · Stack | Sí | — |
| 4 · Inicialización | Sí | No |
| 5 · Implementación | Sí | No |
| 6 · Testing | Sí | No |
| 7 · Seguridad | Sí | No |
| 8 · Build | Sí | No |
| 9 · Validación | Sí | No |

El estado vivo se lleva en `/proyecto/gestion/roadmap_progreso.md`. Esta tabla es solo el corte
del momento en que se redactó el plan.

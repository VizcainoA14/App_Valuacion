# App de Valuación de Activos — Instrucciones del repositorio

> **PROTOCOLO DE INICIO OBLIGATORIO.** Antes de responder, proponer o modificar cualquier cosa en
> este repositorio, lee `proyecto/gestion/estado_actual.md`. Contiene la última tarea realizada, la
> tarea en curso, el siguiente paso y los bloqueos. Trabajar sin leerlo produce trabajo duplicado o
> destruido.
>
> El protocolo completo está en la skill **`gestion-memoria`** (invócala con `/gestion-memoria`) y en
> `.claude/config_sesion.json`.

## Qué es este proyecto

Aplicación de escritorio (Electron + React + TypeScript) que ejecuta el proceso de valuación de
activos de una E.S.E colombiana: 11 pasos, desde la parametrización de la entidad hasta el cierre
inmutable del ejercicio y la emisión de las resoluciones de saneamiento contable.

**Estado: el núcleo está completo.** Al 2026-09-03 un hospital recorre el proceso entero solo:
configura la entidad, descarga sus formatos, importa el inventario, **calcula la depreciación y la
obsolescencia**, propone y decide las bajas, y genera su **informe en PDF**. Lo que queda son las
extensiones. El estado fino vive en `proyecto/gestion/estado_actual.md` — ese archivo manda, no esta
línea.

> **El orden de trabajo lo fija [ADR-026](proyecto/plan/DECISIONES/adr_producto.md)**, no el grafo
> de hitos A→H: primero el **núcleo** de seis etapas que un hospital recorre solo (configurar →
> formatos → importar → **calcular** → bajas → informe), después las extensiones. `/especificacion/teoria` sigue
> intacta; lo que cambió es el orden.

## Mapa del repositorio

Cuatro carpetas en la raíz: **qué** debe hacer la app (`especificacion/`), **cómo se construye y en
qué va** (`proyecto/`), la **app** misma (`app/`) y los **datos de prueba** (`datos_de_prueba/`).

| Carpeta | Qué contiene | Se modifica |
|---|---|---|
| **`especificacion/`** | | |
| `especificacion/teoria/` | **Especificación funcional autoritativa**, versión **2.1**. 11 pasos + 4 anexos + `CORRECCIONES.md` | Solo con decisión explícita del propietario, con nota al pie y entrada en `CORRECCIONES.md` |
| `especificacion/normatividad/` | Verificación del proceso contra la norma colombiana (CGN, saneamiento contable) | Sí |
| `especificacion/plantillas/` | Las 28 plantillas `.xlsx` y `.docx` de referencia. El instalador las empaqueta (`electron-builder.yml`) | No |
| **`proyecto/`** | | |
| `proyecto/plan/` | Plan técnico: 9 fases, 25 decisiones (ADR), backlog de 64 tareas | Sí, con registro en bitácora |
| `proyecto/gestion/` | Estado, roadmap y bitácora | **Sí, obligatoriamente en cada sesión** |
| **`app/`** | La aplicación (Electron + React + TS; creada en el hito A) | Sí |
| `app/docs/` | **Cómo está construida la aplicación**: 10 documentos. Empezar por `app/docs/README.md` | Sí, cuando el código cambie |
| **`datos_de_prueba/`** | Juego de datos de un hospital **ficticio** para probar el flujo completo. Se regenera con `npm run datos:prueba` | Sí, editando el script |
| `.claude/` | Skills y configuración de sesión | Sí |

## Reglas que no se negocian

1. **`/especificacion/teoria` manda** (versión 2.1). El plan y el código nunca la contradicen. Cuando `/especificacion/teoria` se
   contradice a sí misma, se documenta como `CT-*` en
   `proyecto/plan/FASE_1_ANALISIS/1.4_contradicciones_teoria.md` y, si hay que corregirla, se deja
   nota al pie y entrada en `/especificacion/teoria/CORRECCIONES.md`. **Nunca se corrige en silencio.**
2. **`ANEXO_C` prevalece** sobre los documentos de paso en todo lo relativo al motor de cálculo. Lo
   dice el propio anexo.
3. **El dinero nunca es un `number` de pesos.** Enteros de centavos en la base, `decimal.js` en el
   motor. ADR-006.
4. **El motor de cálculo es dominio puro.** No importa `fs`, `electron`, `sqlite`, `react` ni `Date`.
5. **Un ejercicio cerrado es inmutable**, también frente a SQL directo. Triggers, no validaciones de
   formulario. ADR-017.
6. **No hay inicio de sesión ni usuarios.** Los perfiles de `ANEXO_B` §7.2 son un catálogo de
   responsables para atribuir firmas. ADR-016.
7. **La app no se usa en campo.** El inventario entra solo por importación de `PL-03`. ADR-015.
8. **Ningún valor esperado en los tests del motor se modifica sin justificarlo en la bitácora.**
   Riesgo `RG-01`.
9. **Las decisiones de `proyecto/plan/DECISIONES/` están cerradas** (25 + ADR-026). No se reabren;
   si hay información nueva, se abre un ADR nuevo.
10. **Al terminar una tarea o una sesión, se actualizan los tres archivos de `proyecto/gestion/`.**
11. **Un cálculo que no se pudo hacer nunca es un cero.** El motor devuelve `NO_APLICA`,
    `NO_CALCULABLE` o `ERROR_DATOS` con su motivo, y la interfaz los muestra por separado: significan
    cosas distintas para quien tiene que resolverlos, y un cero los escondería dentro de una cifra que
    después se firma.

## Antes de empezar a implementar

Las 15 contradicciones de `/especificacion/teoria` quedaron **resueltas el 2026-09-01** y la base teórica se corrigió
a la versión 2.1. **No hay ninguna tarea bloqueada.**

La siguiente acción concreta está siempre en `proyecto/gestion/estado_actual.md` §4. La puerta de
calidad antes de cerrar cualquier tarea es `npm run verificar:todo` (desde `/app`).

## Skills disponibles

| Skill | Cuándo usarla |
|---|---|
| `gestion-memoria` | Al iniciar y al cerrar toda sesión de trabajo |
| `electron` | Procesos main/preload/renderer, IPC, empaquetado, actualizaciones |
| `apple-design` | Al diseñar o revisar cualquiera de las 52 pantallas |

## Idioma

El código, los nombres de tabla, los enums y la documentación están en **español**, igual que
`/especificacion/teoria`. Excepciones: las APIs de las librerías y las palabras clave del lenguaje.

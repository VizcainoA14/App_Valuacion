# Resumen Ejecutivo

## 1. Qué se construye

Una **aplicación de escritorio monolítica** (Electron + React + TypeScript) que ejecuta de punta a
punta el proceso de valuación de activos de una E.S.E colombiana: 11 pasos, desde la parametrización
de la entidad hasta el cierre inmutable del ejercicio y la generación de las resoluciones.

La aplicación es **reutilizable en cualquier hospital**: todo dato variable entre entidades es
parámetro persistido, nunca constante en el código.

## 2. Los tres corazones del sistema

| Núcleo | Qué hace | Dónde vive | Riesgo si falla |
|---|---|---|---|
| **Motor de cálculo** | Obsolescencia, depreciación, deterioro, valuación, consolidación (`ANEXO_C`) | Paquete de dominio puro, sin Node ni Electron | Los estados financieros de un hospital público quedan mal ajustados |
| **Importador / normalizador** | Lee Excel sucio y lo convierte en datos válidos, o lo rechaza fila por fila. **Única vía de entrada de inventario** (ADR-015) | Main process | Datos inventados en silencio = fraude documental; y sin él no hay forma de cargar el inventario |
| **Generador documental** | Excel (`PL-*`), Word (resoluciones, actas), PDF | Main process | No hay entregable contractual |

Todo lo demás —pantallas, tablas, filtros— es envoltura sobre estos tres.

## 3. Decisiones estructurales ya tomadas

| Tema | Elección | ADR |
|---|---|:-:|
| Lenguaje | TypeScript en modo `strict` | 001 |
| Build | electron-vite (dev/bundle) + electron-builder (instaladores) | 003 |
| Persistencia | SQLite local vía `better-sqlite3`, un archivo por instalación | 004 |
| Dinero | Enteros de **centavos** en base de datos + `decimal.js` en el motor. **Nunca `number` flotante.** | 006 |
| IPC | Canales namespaced con contrato compartido y validación **Zod en el main** | 007 |
| UI | React 19 + Radix UI + **Tailwind CSS v3.4** (v4 rompe el piso de compatibilidad) | 009 |
| Tablas de 20.000 filas | TanStack Table + TanStack Virtual | 010 |
| Word | `docxtemplater` (sintaxis compatible con los marcadores de `ANEXO_A` §4.1) | 012 |
| PDF | `webContents.printToPDF` de Chromium — cero dependencias nuevas | 013 |
| Captura móvil (`RF-02-01`) | **Fuera de alcance.** El inventario entra solo por importación de `PL-03` | 015 |
| Usuarios | **Sin inicio de sesión.** Monousuario; catálogo de responsables para atribuir firmas. **Prohibido** SQLite sobre unidad de red | 016 |
| Base de comparación del avalúo | `valor_neto_libros` (con deterioro descontado) | CT-03 |
| Método de conteo de meses | `dias_exactos` sugerido; **acta del contador sigue siendo obligatoria** | CT-02 |
| Inmutabilidad | Triggers SQLite `RAISE(ABORT)` + hash SHA-256 del ejercicio al cerrar | 017 |

Las 25 decisiones completas, con alternativas comparadas, están en [DECISIONES/](DECISIONES/README.md).

## 4. Orden de construcción (7 hitos)

```
A. Esqueleto            Electron+React+TS arranca, empaqueta y pasa CI.        (sin negocio)
        │
B. Núcleo               Dominio + SQLite + IPC + Paso 01 (parametrización).    ← habilita todo
        │
C. Levantamiento        Pasos 02 y 03: bienes, hojas de vida, importación.
        │
D. Conciliación+Cálculo Pasos 04, 05, 06: emparejamiento, obsolescencia, depreciación.
        │
E. Valuación            Pasos 07 y 08: muebles e inmuebles.
        │
F. Bajas y cierre       Pasos 09, 10, 11: propuestas, consolidación, actos, cierre.
        │
G. Documental           Excel/Word/PDF/etiquetas — transversal, se avanza desde B.
```

**Por qué este orden y no otro:** el orden reproduce la dependencia real de los datos. No se puede
calcular obsolescencia (05) sin fecha de adquisición (03), ni conciliar (04) sin bienes (02), ni
consolidar (10) sin bajas (09) ni valuación (07/08). La única excepción es el hito G, que corre en
paralelo desde B porque el generador documental es una capa horizontal.

## 5. Contradicciones de `/Teoria`: resueltas

El análisis detectó **15 discrepancias** dentro de `/Teoria`, cuatro de ellas bloqueantes. Todas se
resolvieron el **2026-09-01**. Las que exigían corregir la base teórica ya se aplicaron: `/Teoria`
pasó a la versión **2.1** y cada cambio está registrado en
[`/Teoria/CORRECCIONES.md`](../Teoria/CORRECCIONES.md).

Las cuatro de mayor consecuencia:

| # | Hallazgo | Resolución |
|:-:|---|---|
| CT-01 | Los ejemplos numéricos de `ANEXO_C` §2.3 y §3.3 **no eran reproducibles** con las fórmulas del propio anexo | **La fórmula manda.** Ejemplos recalculados: índice 0,6899 (no 0,6922); depreciación 11.356.724,23 con `dias_exactos` |
| CT-02 | El método de conteo de meses no tenía valor por defecto | **`dias_exactos`** como sugerido. El acta del contador sigue siendo obligatoria antes de calcular |
| CT-05 | `RF-02-01` pedía captura móvil offline | **Fuera de alcance.** El inventario entra solo por importación de `PL-03` |
| CT-08 | `ANEXO_B` §7 describía un sistema multiusuario | **Sin inicio de sesión.** Catálogo de responsables para atribuir firmas |

**No queda ninguna tarea bloqueada.** La siguiente acción es `T-A-01`.

## 6. Criterio de éxito

El proyecto está terminado cuando un ejercicio real de un hospital puede recorrerse completo dentro
de la aplicación, cerrarse en estado `CERRADO` inmutable, y producir los 11 entregables globales
`EN-G-01` … `EN-G-11` en formato editable y PDF, con el cuadre en tres niveles verificado
(diferencia ≤ $1) y la bitácora completa. La lista de verificación está en
[FASE_9](FASE_9_VALIDACION/9.1_checklist_final.md).

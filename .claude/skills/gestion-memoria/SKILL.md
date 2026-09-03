---
name: gestion-memoria
description: >-
  Protocolo obligatorio de continuidad entre sesiones para el proyecto App de Valuación de Activos.
  Invocar SIEMPRE al iniciar una sesión de trabajo en este repositorio, antes de responder, proponer
  o modificar cualquier cosa; y de nuevo al terminar una tarea importante o antes de cerrar la
  sesión. Palabras clave: retomar, continuar, en qué punto vamos, estado del proyecto, siguiente
  paso, actualizar progreso, cerrar sesión, bitácora, roadmap.
---

# Gestión de memoria del proyecto

Este proyecto se desarrolla a lo largo de muchas sesiones, posiblemente por personas y agentes
distintos. La continuidad **no** depende de la memoria de nadie: depende de tres archivos en
`/gestion_proyecto`. Esta skill define cómo leerlos y cómo mantenerlos.

Configuración legible por máquina: `.claude/config_sesion.json`.

---

## 1. Protocolo de INICIO — obligatorio

> **Antes de responder, proponer o modificar cualquier cosa.**

### Paso 1 · Recuperar el contexto (siempre)

Leer `gestion_proyecto/estado_actual.md`. Contiene:
- La última tarea realizada.
- La tarea actual en ejecución.
- El siguiente paso inmediato.
- Los bloqueos y decisiones pendientes.

### Paso 2 · Ver el progreso (siempre)

Leer `gestion_proyecto/roadmap_progreso.md`: qué está completado, en curso, pendiente o bloqueado.

### Paso 3 · Entender lo reciente (siempre)

Leer las **2 o 3 entradas más recientes** de `gestion_proyecto/bitacora.md`. No el archivo entero.

### Paso 4 · Según la tarea

| Si la tarea toca… | Leer también |
|---|---|
| Arquitectura, stack o dependencias | `plan_desarrollo/DECISIONES/README.md` — **las 25 decisiones están cerradas, no se reabren** |
| Motor de cálculo, importación o responsables | `plan_desarrollo/FASE_1_ANALISIS/1.4_contradicciones_teoria.md` — consultar la resolución adoptada. Las 15 `CT-*` están **resueltas** y `/Teoria` está en la versión **2.1** |
| Cualquier implementación | `plan_desarrollo/FASE_5_IMPLEMENTACION/5.0_backlog_maestro.md` — localizar la tarea, sus dependencias y su criterio de verificación |
| Interfaz de usuario | Invocar la skill `apple-design` |
| Procesos de Electron, IPC, empaquetado | Invocar la skill `electron` |

### Regla de oro

**Si el estado registrado y el código real no coinciden, detenerse.** Informar la discrepancia y
actualizar el estado antes de seguir. Trabajar sobre un estado desactualizado produce trabajo
duplicado o destruido.

---

## 2. Protocolo de ACTUALIZACIÓN — obligatorio

### Cuándo

- Se completó una tarea del backlog (`T-*`).
- Se resolvió o cambió de estado una contradicción (`CT-*`).
- Se tomó una decisión técnica no trivial.
- Se cambió la versión de una dependencia.
- Se midió el rendimiento de algo.
- **Se modificó un valor esperado en los tests del motor de cálculo.**
- La sesión va a terminar, **aunque la tarea quede a medias**.

### Qué actualizar

**1. `gestion_proyecto/estado_actual.md`** — las cuatro secciones: última tarea, tarea actual,
siguiente paso, bloqueos. Y la fecha y el autor.

**2. `gestion_proyecto/roadmap_progreso.md`** — el estado de las tareas afectadas, la tabla de
resumen y la tabla de tareas bloqueadas.

| Símbolo | Estado |
|:-:|---|
| ⬜ | Pendiente |
| 🟡 | En curso |
| ✅ | Completado |
| 🔵 | Bloqueado |
| ⏭️ | Omitido (requiere justificación en la bitácora) |

**3. `gestion_proyecto/bitacora.md`** — una entrada nueva **arriba**:

```markdown
## AAAA-MM-DD · <quién> · <título en una línea>

**Tareas:** T-X-nn (completada) · T-X-mm (en curso)

- Qué se hizo.
- Qué decisión se tomó y por qué.
- Qué quedó pendiente.

**Siguiente:** qué toca ahora.
```

**4. `app/docs/trazabilidad.csv`** — marcar como `IMPLEMENTADO` los requisitos que la tarea cubre
(cuando el archivo exista).

### Prohibido

- Terminar una sesión sin actualizar `estado_actual.md`.
- Marcar una tarea como completada sin que cumpla su criterio de verificación.
- Marcar una tarea como omitida sin justificación escrita.
- Borrar o reescribir entradas pasadas de la bitácora. Si algo estaba mal, se corrige en una entrada
  nueva.

---

## 3. Sincronización con el plan

`roadmap_progreso.md` debe reflejar siempre las fases y tareas de `/plan_desarrollo`.

- Si cambia el backlog maestro, se actualiza el roadmap **en la misma sesión**.
- Los identificadores `T-*` son estables: no se renumeran. Una tarea cancelada se marca Omitida, no
  se borra.
- Los códigos de `/Teoria` (`RF-`, `RN-`, `VAL-`, `EN-`, `IN-`, `PL-`, `INT-`) **nunca** se renumeran
  ni se inventan.
- Verificación antes de cerrar sesión: el número de tareas del roadmap coincide con el del backlog.

---

## 4. Reglas de trabajo que esta skill hace cumplir

### Precedencia documental

```
1. /Teoria/ANEXO_C_FORMULAS_Y_REGLAS.md   ← manda en el motor de cálculo
2. /Teoria/*                              ← especificación funcional
3. /plan_desarrollo/*                     ← cómo construirlo
4. /gestion_proyecto/*                    ← dónde vamos
```

### Nunca contradecir `/Teoria`

La versión vigente es la **2.1**. Cuando `/Teoria` se contradice a sí misma, se documenta como una
`CT-*` nueva en `1.4_contradicciones_teoria.md`, con severidad y resolución propuesta. Si la
resolución exige **corregir** `/Teoria`, se aplica con nota al pie fechada en el documento afectado y
entrada en `/Teoria/CORRECCIONES.md`. **Nunca se corrige en silencio.**

### Las decisiones cerradas no se reabren

Las 25 ADR están cerradas. Si aparece información nueva que invalide una, se abre un ADR **nuevo**
que la sustituye; el original no se edita.

### Regla especial del motor de cálculo

**Ningún valor esperado en los tests del motor se modifica sin una entrada en la bitácora que lo
justifique.** Es la mitigación de `RG-01`: si los valores esperados se ajustan al código, el motor
queda validado contra sí mismo, y sus errores llegan a resoluciones firmadas por el Gerente de una
entidad pública.

---

## 5. Restricciones de producto que hay que conocer

Decididas el 2026-09-01. **No se re-discuten.**

| # | Restricción |
|:-:|---|
| 1 | **Monousuario, sin inicio de sesión.** Los perfiles de `ANEXO_B` §7.2 son un catálogo de `Responsable` para atribuir firmas, no cuentas de acceso (ADR-016) |
| 2 | **El inventario entra solo por importación de `PL-03`.** No hay captura en campo, ni cámara, ni escáner, ni app móvil. `RF-02-01` y `RF-02-02` están NO IMPLEMENTADOS (ADR-015) |
| 3 | **El dinero es entero de centavos** en la base y `decimal.js` en el motor. Nunca `number` de pesos (ADR-006) |
| 4 | **El motor de cálculo es dominio puro:** no importa `fs`, `electron`, `sqlite`, `react` ni `Date` |
| 5 | **Un ejercicio cerrado es inmutable**, también frente a SQL directo (ADR-017) |
| 6 | **Prohibido** poner la base SQLite en una unidad de red compartida |
| 7 | El avalúo se compara contra **`valor_neto_libros`**; el conteo de meses por defecto es **`dias_exactos`**, con acta obligatoria |

## 6. Estado actual del proyecto (resumen)

Al 2026-09-01:

- **Planificación completa.** `/plan_desarrollo` con 9 fases, 25 ADR y 64 tareas.
- **Las 15 contradicciones de `/Teoria`, resueltas.** `/Teoria` corregida a la versión **2.1**.
- **Ninguna tarea bloqueada.**
- **Implementación no iniciada.** El directorio `/app` no existe.
- **Siguiente acción: `T-A-01`** (congelar versiones).

Para el detalle, leer `gestion_proyecto/estado_actual.md`. Este resumen puede quedar desactualizado;
ese archivo, no.

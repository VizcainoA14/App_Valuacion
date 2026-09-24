# 04 · La base de datos

SQLite mediante **better-sqlite3** (síncrono, sin `async` en el acceso a datos) y **Drizzle ORM**
para el esquema y las consultas. **18 tablas** y **68 disparadores**: 15 de reglas puntuales, 50
que congelan un proceso finalizado y 3 de la búsqueda FTS5.

> ADR-028 rehízo el modelo (barridos, bajas registradas, sin ejercicio ni extensiones: 26 de las 44
> tablas anteriores) y ADR-029 puso el **proceso** en el centro: la tabla `entidad` pasó a ser
> `proceso`, con su fecha de corte y su estado. Como ningún hospital tenía datos, las migraciones se
> regeneraron desde cero las dos veces.

## El modelo en una frase

Un **proceso** de valuación tiene los datos del hospital, una **fecha de corte** y su propio
inventario; cada **barrido** (una importación de `PL-03`) lo actualiza; su **corte** —uno solo—
calcula todo el inventario a la fecha del proceso; las **bajas** registran lo que el hospital
decidió. Al **finalizar**, nada del proceso vuelve a cambiar.

```
proceso ─┬─ sede ── servicio
         ├─ clase_activo · parametro_calculo · convencion_codigo · abreviatura_tipo
         ├─ barrido                      (una importación de PL-03; inmutable)
         ├─ bien ─┬─ hoja_vida · mantenimiento · soporte_documental
         │        └─ baja                (se registra y, si fue un error, se anula)
         └─ corte ─┬─ calculo_obsolescencia   (uno por proceso: ux_corte_proceso)
                   ├─ calculo_depreciacion      (inmutables)
                   └─ calculo_exclusion
bitacora (sin claves foráneas; inmutable)
```

## El principio: la base defiende sus propias reglas

Las reglas críticas **no** son validaciones de formulario. Son disparadores, y se cumplen aunque
alguien abra el archivo con un cliente de SQLite y escriba `UPDATE` a mano.

Los disparadores se **generan** con `npm run db:triggers`, y **un test comprueba que la migración
`0002` coincide byte a byte con lo que produce el generador**. Nadie puede editar un disparador a
mano sin que la CI lo note.

## Tipos físicos

`esquema/_columnas.ts` define los ayudantes que hacen legible el tipo físico:

| Ayudante | Tipo real | Para qué |
|---|---|---|
| `centavos('costo')` | `INTEGER costo_cent` | **Dinero. Siempre.** |
| `x10k('indice')` | `INTEGER indice_x10k` | Factores e índices con 4 decimales |
| `fecha('fecha_corte')` | `TEXT` | `AAAA-MM-DD` |
| `marcaTiempo('creado_en')` | `TEXT` | ISO 8601 UTC |
| `booleano('activo')` | `INTEGER` 0/1 + `CHECK` | |
| `enumCatalogo('estado', X)` | `TEXT` + `CHECK IN (...)` | |

### Por qué el dinero es un entero de centavos

Porque `0.1 + 0.2 !== 0.3` en coma flotante, y aquí se suman millones de pesos. En la base son
**enteros de centavos**; en el motor, `decimal.js`. En medio, el tipo nominal `Centavos` y una única
puerta de conversión (`aCentavos`).

**ESLint bloquea `costoCent * 2`.** Multiplicar centavos directamente es el error que este diseño
existe para impedir.

Excepción deliberada: los parámetros monetarios de configuración (umbrales) son números en pesos.
Son *configuración*, no importes contables.

### Los `CHECK` de enums se generan del catálogo

Un valor nuevo en un enum de `compartido/enums/` exige una migración: **nunca aparece en la base sin
pasar por ahí**.

## Las reglas de la base

| Disparador | Qué protege |
|---|---|
| `INT-02` | Un bien no cambia de proceso |
| `INT-03` | Un bien nunca se borra (`RN-09-09`), salvo los del proceso de demostración. Por eso un proceso con inventario no se elimina |
| `INT-10` | No hay cálculo de depreciación para una clase no depreciable |
| `RNF-07` | Un campo sensible no cambia en la bitácora sin justificación |
| `trg_baja_inmutable` | Una baja registrada **solo se anula, con motivo**; no se reescribe su causal ni se "desanula" |
| Máquina del bien | Todo bien nace `ACTIVO`; solo transita `ACTIVO ↔ NO_ENCONTRADO`, `→ DADO_DE_BAJA` y la anulación `DADO_DE_BAJA → ACTIVO` |
| Máquina del proceso | Todo proceso nace `EN_CURSO` y solo pasa a `FINALIZADO`; no se reabre |
| `trg_finalizado_*` | Un proceso `FINALIZADO` no admite INSERT, UPDATE ni DELETE en **ninguna** de sus tablas (ADR-029) |
| Inmutabilidad | `corte`, `calculo_*`, `barrido` y `bitacora` **rechazan todo `UPDATE`** |

### Lo calculado no se reescribe

Es la versión de ADR-017 para el modelo de ADR-028 y ADR-029, en dos niveles:

- **Un corte no se corrige.** Mientras el proceso sigue en curso, recalcular **reemplaza** el corte
  entero (el viejo se borra y sus resultados caen en cascada) y cambiar la fecha de corte del
  proceso lo descarta. Nunca se reescribe una cifra dentro de un corte.
- **Un proceso finalizado no cambia.** `scripts/generar-triggers.ts` exige que **toda** tabla del
  esquema declare cómo llega a su proceso —columna `proceso_id` o una ruta indirecta
  (`servicio` por su sede, `hoja_vida`/`baja`/… por su bien, `calculo_*` por su corte)— y emite
  tres disparadores por tabla. Una tabla nueva sin esa declaración **rompe la construcción**: la
  regla no se puede olvidar. `proceso` y `bitacora` tienen su propia regla.

Lo mismo vale para el barrido —la huella de un archivo importado— y la bitácora.

### Uniques con condición

`ux_baja_vigente` es un índice único **parcial**: un bien tiene a lo sumo una baja *no anulada*. Una
baja anulada queda en el historial y no impide registrar otra.

## Las tablas

| Archivo | Tablas | Qué guarda |
|---|:-:|---|
| `configuracion.ts` | 7 | proceso (con los datos del hospital), sede, servicio, clase, parámetros, convención, abreviaturas |
| `inventario.ts` | 2 | `barrido` y `bien` (con su estado y la obsolescencia funcional declarada) |
| `hojasVida.ts` | 3 | fecha y costo, mantenimientos, soportes |
| `calculo.ts` | 4 | `corte` (uno por proceso) y sus resultados: obsolescencia (con los motivos de baja), depreciación y exclusiones |
| `bajas.ts` | 1 | las bajas registradas |
| `bitacora.ts` | 1 | la bitácora |

### Por qué las exclusiones se guardan

Regla 11: lo que no se pudo calcular no es un cero. Antes el motivo se devolvía al calcular y se
perdía; el informe lo reconstruía mirando los datos *de hoy*. Con `calculo_exclusion` el informe de
un proceso finalizado relaciona exactamente lo que su cálculo dejó fuera, aunque los datos de
origen se hubieran corregido después en otro proceso.

Por la misma razón `calculo_obsolescencia.motivos_baja` guarda los motivos del candidato tal como se
dijeron ese día.

## La bitácora

Registra qué cambió, cuándo, con qué valor anterior y nuevo, y con qué justificación. Se escribe
**dentro de la misma transacción** que el cambio: no puede existir un cambio sin su registro.

Los **8 campos sensibles** (`ANEXO_B` §7.1) exigen justificación obligatoria: `costo_adquisicion`,
`fecha_adquisicion`, `clase_activo_id`, `valor_avaluo_final`, `vida_util_tecnica_override`,
`deterioro`, `causal_baja` y `fecha_corte`.

## Búsqueda

FTS5 sobre el inventario (migración `0001`). Un hospital con 20.000 bienes necesita buscar por
descripción sin recorrer la tabla entera.

**Cuidado con el disparador de actualización de `bien_fts`**: se activa por *nombrar* la columna en
el `SET`, cambie o no el valor, y su borrado recorre el índice entero (la clave `bien_id` no está
indexada). Por eso el barrido actualiza la descripción, la marca, el modelo y la serie en una
sentencia aparte y **solo si cambiaron**: sin eso, un barrido de 10.000 bienes tardaba 17 s en vez de
0,3 s.

## Rendimiento medido

| Operación | Tiempo |
|---|---|
| Cálculo de un corte de 20.050 bienes | **1,18 s** |
| Recalcular (reemplaza el corte anterior) | 1,16 s |
| Barrido: 10.000 altas | 0,43 s |
| Barrido: 10.000 actualizaciones | 0,28 s |

Las mediciones viven en `*.perf.test.ts` y se ejecutan con `npm run test:rendimiento`, sin
paralelismo y en un paso propio de la CI: mezclarlas con la suite normal daría números sin sentido.

## Una base anterior a ADR-028 no abre

Su versión de esquema (`PRAGMA user_version`) es 4 y la aplicación solo conoce hasta la 3: el
migrador la rechaza con el mensaje de "versión más nueva". Ningún hospital tenía datos, así que la
solución es borrar la carpeta de datos de desarrollo. Si algún día apareciera una base real de antes,
haría falta un migrador de rescate.

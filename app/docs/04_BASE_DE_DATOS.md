# 04 · La base de datos

SQLite mediante **better-sqlite3** (síncrono, sin `async` en el acceso a datos) y **Drizzle ORM**
para el esquema y las consultas. **44 tablas** y **119 disparadores**.

## El principio: la base defiende sus propias reglas

Las reglas críticas **no** son validaciones de formulario. Son disparadores, y se cumplen aunque
alguien abra el archivo con un cliente de SQLite y escriba `UPDATE` a mano.

Suena excesivo hasta que se recuerda qué custodia este archivo: los números que van a una resolución
firmada por el Gerente de una entidad pública. Una validación de formulario protege contra el error;
un disparador protege contra el error **y** contra el atajo.

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

Porque `0.1 + 0.2 !== 0.3` en coma flotante, y aquí se suman millones de pesos que después alguien
firma. En la base son **enteros de centavos**; en el motor, `decimal.js`. En medio, el tipo nominal
`Centavos` y una única puerta de conversión (`aCentavos`).

**ESLint bloquea `costoCent * 2`.** Multiplicar centavos directamente es el error que este diseño
existe para impedir.

Excepción deliberada: los parámetros monetarios de configuración (umbrales) son números en pesos.
Son *configuración*, no importes contables.

### Los `CHECK` de enums se generan del catálogo

Un valor nuevo en un enum de `compartido/enums/` exige una migración: **nunca aparece en la base sin
pasar por ahí**. Es lo que mantiene sincronizados los desplegables de la interfaz y las restricciones
de la base.

## Las reglas de integridad (`INT-*`)

| Código | Qué protege |
|---|---|
| `INT-02` | Coherencia de la jerarquía entidad → sede → servicio |
| `INT-03` | No se borran bienes de una entidad real |
| `INT-04` | Coherencia del cálculo con su ejercicio |
| `INT-07` | **Una baja no pasa a EJECUTADO sin el acta del Comité** |
| `INT-08` | Coherencia de los estados del bien |
| `INT-09` | **Un ejercicio CERRADO es inmutable**: ninguna tabla suya admite escritura |
| `INT-10` | Trazabilidad de la bitácora |

`INT-09` merece atención. La comprobación se aplica a **toda tabla que cuelga de un ejercicio**, en
`INSERT`, `UPDATE` y `DELETE`. Las tablas de configuración que **no** pertenecen a un ejercicio
—`entidad`, `sede`, `servicio`, `clase_activo`, `parametro_calculo`, `convencion_codigo`,
`abreviatura_tipo`, `responsable`, `factor_estado`, `inmueble`, `documento_inmueble`— quedan fuera a
propósito: se pueden corregir aunque haya ejercicios cerrados, porque describen la entidad, no el
ejercicio.

La máquina de estados del bien también vive en disparadores. **Todo bien nace en `BORRADOR`**; para
llegar a `INCOMPLETO` hay que pasar por el camino válido. Esa regla atrapó un error real durante el
desarrollo: el importador insertaba bienes directamente como `INCOMPLETO`, y la base lo rechazó.

## Los grupos de tablas

| Archivo | Tablas | Qué guarda |
|---|:-:|---|
| `configuracion.ts` | 10 | entidad, sede, servicio, clase, parámetros, convención, abreviaturas, responsable, ejercicio, factor de estado |
| `inventario.ts` | 5 | bienes y su estado |
| `hojasVida.ts` | 4 | fecha, costo, mantenimientos, soportes |
| `calculo.ts` | 3 | resultados de depreciación, obsolescencia y deterioro |
| `bajas.ts` | 3 | propuestas, actas de Comité, decisiones |
| `cierre.ts` | 4 | cierre del ejercicio y verificaciones |
| `conciliacion.ts` | 4 | paso 04 (aún no implementado) |
| `consolidacion.ts` | 4 | actos administrativos y resoluciones |
| `inmuebles.ts` | 4 | paso 08 (aún no implementado) |
| `valuacion.ts` | 2 | paso 07 (aún no implementado) |
| `bitacora.ts` | 1 | la bitácora |

**Hay tablas de pasos que todavía no se implementaron.** Están desde la migración inicial a
propósito: el esquema completo evita migraciones destructivas más adelante, y sus claves foráneas
mantienen coherente el modelo.

## La bitácora

Registra qué cambió, cuándo, con qué valor anterior y nuevo, y con qué justificación. Se escribe
**dentro de la misma transacción** que el cambio: no puede existir un cambio sin su registro.

Los **8 campos sensibles** (`ANEXO_B` §7.1) exigen justificación obligatoria: `costo_adquisicion`,
`fecha_adquisicion`, `clase_activo_id`, `valor_avaluo_final`, `vida_util_tecnica_override`,
`deterioro`, `causal_baja` y `fecha_corte`.

## Búsqueda

FTS5 sobre el inventario (migración `0001`). Un hospital con 20.000 bienes necesita buscar por
descripción sin recorrer la tabla entera.

## Rendimiento medido

| Operación | Tiempo |
|---|---|
| Cálculo completo de 20.050 bienes | **1,27 s** |
| Recálculo | 1,13 s |
| Importación de 10.000 bienes | 0,66 s |

Estas cifras hicieron **innecesario** el hilo aparte que preveía ADR-020. Las mediciones viven en
`*.perf.test.ts` y se ejecutan con `npm run test:rendimiento`, sin paralelismo y en un paso propio
de la CI: mezclarlas con la suite normal daría números sin sentido.

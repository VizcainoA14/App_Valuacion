# 07 · Importación de plantillas Excel

El inventario **solo** entra por aquí (ADR-015). No hay captura en campo.

## Las 28 plantillas viajan dentro

Las plantillas de `Plantillas_Valuacion_Activos/` se empaquetan en el instalador con
`extraResources`, así que el hospital **no tiene que buscarlas en ningún correo**. La etapa 2 las
entrega, y al descargarlas se les inyectan los catálogos de la entidad como **listas desplegables**:
las clases, sedes y servicios que ese hospital registró.

De las 28, **hoy se leen 5**: `PL-01`, `PL-02`, `PL-02b`, `PL-03` y `PL-05`. Las demás se
diligencian pero aún no se importan. `npm run instructivo` genera el manual de diligenciamiento
**desde las definiciones reales del importador**, así que no puede quedar desactualizado.

## Una sola orquestación

`infraestructura/documental/excel/orquestadorImportacion.ts`. Cada módulo registra su importador:

```ts
interface ImportadorPlantilla {
  codigo: PlantillaImportable;
  requiereEjercicio: boolean;
  requiereEntidad?: boolean;          // false solo en PL-01: la crea
  leer(archivo, formatoFecha): Promise<LecturaNormalizada>;
  validarNegocio(ambito, lectura, ctx): void;
  aplicar(ambito, lectura, ctx, archivo): ResultadoAplicacion;
}
```

Una sola pantalla importa cualquiera de las cinco: **reconoce qué plantilla se le entrega** en vez
de obligar a elegirla de una lista (ADR-026).

## Previsualizar, luego confirmar

Dos canales, y ese orden importa:

1. **`importacion:previsualizar`** — lee, normaliza, valida y devuelve un informe **fila por fila**
   sin escribir nada. Un token identifica la previsualización.
2. **`importacion:confirmar`** — aplica lo aceptado, dentro de una transacción.

Nadie importa a ciegas. El informe dice cuántas filas se leyeron, cuántas son válidas, cuántas
tienen error, y **el motivo de cada rechazo con su número de fila y su columna**.

Las incidencias tienen dos severidades:

- **ERROR** — la fila no entra.
- **ADVERTENCIA** — la fila entra igual, pero conviene mirarla. Una serie repetida, por ejemplo:
  es normal en equipos idénticos (`RN-02-05`) y bloquearla sería un estorbo.

## Cómo se lee un Excel

`importador.ts` detecta la fila de encabezados y **omite la fila de ejemplo por su color**. El
normalizador aplica `ANEXO_C` §9 a los valores.

## Resolver contra el catálogo

`PL-03` trae los nombres de clase, sede y servicio como texto. Hay que convertirlos en identificadores.

El catálogo se carga **una vez por importación** en mapas en memoria: resolver 20.000 filas con una
consulta por fila serían 60.000 viajes a SQLite.

Cada catálogo se indexa **dos veces**, y este detalle tiene historia:

| Índice | Clave |
|---|---|
| **Exacto** | Mayúsculas, espacios colapsados |
| **Laxo** | Además sin tildes, con la puntuación como separador |

Se prueba **primero el exacto**, así que una coincidencia literal siempre gana y la tolerancia nunca
puede robarle una fila a otra clase.

> **Por qué existe el índice laxo.** El catálogo sugerido de `/Teoria` §5 dice
> «Equipo médico-científico»; quien llena el formato escribe «EQUIPO MEDICO CIENTIFICO», en mayúscula
> sostenida y sin tildes, como se llena un formato en papel. **Una tilde y un guion rechazaban 23 de
> 41 bienes** (reportado el 2026-09-04).
>
> **Dónde está la frontera:** la tolerancia llega a la ortografía, **no al vocabulario**. «cómputo» y
> «computación» son palabras distintas y esa fila sigue siendo un error. Adivinarla sería adivinar a
> qué clase pertenece un bien —y con ella su vida útil y su depreciación— en un cálculo que después
> se firma.

Cuando una fila se rechaza, **el mensaje enumera lo que sí hay en el catálogo**. La diferencia entre
un callejón sin salida y algo que se puede arreglar.

## Las cinco plantillas que se leen

| Plantilla | Qué aporta | Reglas |
|---|---|---|
| `PL-01` | Datos de la entidad y parámetros. **Puede crear la entidad** si no existe | CT-18 |
| `PL-02` | Clases de activo, vida útil, subcuenta | |
| `PL-02b` | Sedes y servicios | |
| `PL-03` | **Los bienes** | `RN-02-01` código y placa únicos · `RN-02-05` serie repetida solo advierte · `VAL-02-03` catálogo |
| `PL-05` | **Fecha y costo**, mantenimientos, avalúo inicial | `RN-03-01/02/04/06` · `VAL-03-02` |

El orden importa: `PL-02` y `PL-02b` **antes** que `PL-03`, porque definen los nombres que `PL-03`
referencia. El instructivo lo explica.

### Por qué los bienes nacen incompletos

`PL-03` no trae fecha de adquisición ni costo: los trae `PL-05`. Así que un bien recién importado
queda **`INCOMPLETO`** y **fuera del cálculo** hasta que se resuelva (`RN-03-01`). La pantalla de
cobertura muestra cuántos faltan.

## El archivo importado se conserva

Antes de aplicar, el libro se guarda en el almacén con su **SHA-256**. No es por si acaso: `PL-05`
puede generar un soporte de tipo `AVALUO_RECONOCIMIENTO_INICIAL` que **cita ese archivo como
evidencia**. Si el archivo no estuviera, el soporte apuntaría al vacío.

Para `PL-01` sin entidad todavía, se guarda bajo `_entidades_nuevas`.

## Datos de prueba

`npm run datos:prueba` genera en `/Datos_de_prueba` un hospital ficticio completo: 41 bienes, 6
clases, 2 sedes, 8 servicios, y un segundo juego **con defectos puestos a propósito** para ver cómo
se comporta el rechazo. Un test comprueba que ese corpus sigue importando limpio.

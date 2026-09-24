# Registro de correcciones a la base teórica

**Versión de la base teórica:** 2.1
**Fecha de las correcciones:** 2026-09-01

Este archivo registra toda modificación aplicada a `/especificacion/teoria` después de su versión 2.0, con el
motivo, el antes y el después. Ninguna corrección se aplica en silencio: cada una deja una nota en el
documento afectado que apunta a la sección correspondiente de aquí.

Las correcciones provienen del análisis documentado en
[`/proyecto/plan/FASE_1_ANALISIS/1.4_contradicciones_teoria.md`](../../proyecto/plan/FASE_1_ANALISIS/1.4_contradicciones_teoria.md)
y fueron aprobadas por el propietario del proyecto el 2026-09-01.

> **Cambio de ubicación, 2026-09-24 (no es una corrección de contenido).** Por decisión del
> propietario, la base teórica pasó de `/Teoria` a `/especificacion/teoria` dentro de la
> reorganización del repositorio. Ningún documento cambió de contenido ni de versión: solo se
> actualizaron las rutas de este archivo. Detalle en la bitácora (`/proyecto/gestion/bitacora.md`).

---

## Índice

| # | Corrección | Origen | Documentos afectados |
|:-:|---|:-:|---|
| C-01 | Caso de verificación de obsolescencia: cifras no reproducibles | CT-01 | `ANEXO_C` §2.3 · `05` `RN-05-01` |
| C-02 | Caso de verificación de depreciación: cifras no reproducibles | CT-01 | `ANEXO_C` §3.3 · `06` `RN-06-01` |
| C-03 | Ejemplo de valuación técnica: heredaba el índice erróneo | CT-01 | `ANEXO_C` §5.3 · `07` `RN-07-04` |
| C-04 | `saldo_por_depreciar` y base de comparación del avalúo | CT-03 | `ANEXO_C` §5.4 · `06` `RN-06-01` · `07` `RN-07-07` |
| C-05 | Regla de exclusión mutua en la consolidación | CT-11 | `ANEXO_C` §7.0 · `10` `RN-10-01` |
| C-06 | Parámetros usados pero no declarados | CT-09 | `ANEXO_B` §2.5 · `01` `RN-01-04` |
| C-07 | Valor por defecto del método de conteo de meses | CT-02 | `ANEXO_B` §2.5 · `01` `RN-01-04` |
| C-08 | Enum de `Bien.estado_registro` incompleto | CT-06 | `ANEXO_B` §6.2 · `02` §10.1 |
| C-09 | Usuarios y roles → catálogo de responsables | CT-08 | `ANEXO_B` §7.1 y §7.2 · §1 |
| C-10 | Captura móvil y almacenamiento de fotografías | CT-05, CT-14 | `ANEXO_B` §9 · `02` §10.2 y §10.3 |
| C-11 | Umbrales del semáforo con huecos entre rangos | CT-04 | `01` `RN-01-05` |
| C-12 | `fecha_fin_vida_util`: dos definiciones | CT-13 | `ANEXO_C` §2.5 · `05` `RN-05-01` |

---

## C-01 · Caso de verificación de obsolescencia

**Problema.** El caso de `ANEXO_C` §2.3 declaraba 3.780 días transcurridos y a continuación escribía
dos valores de edad distintos —10,3491 y 10,3833— calculando el índice con el segundo. El valor
10,3833 corresponde a 3.792,5 días, no a los 3.780 declarados. El error se propagaba a `RN-05-01`,
que reproduce el mismo caso.

**Corrección.**

| Magnitud | Antes | Después |
|---|---|---|
| Días transcurridos | 3.780 | 3.780 *(sin cambio, era correcto)* |
| `edad_actual_anios` | 10,3833 | **10,3491** |
| `indice_obsolescencia` | 0,6922 | **0,6899** |
| Porcentaje | 69,22 % | **68,99 %** |
| `anios_restantes` | 4,6167 | **4,6509** |
| Semáforo | AMARILLO | AMARILLO *(sin cambio)* |

**Decisión aplicada:** prevalece la fórmula sobre el ejemplo. `edad = días / 365,25` es la definición
de `ANEXO_C` §2.1 y no se altera; lo que se corrige es la cifra que el ejemplo publicaba.

---

## C-02 · Caso de verificación de depreciación

**Problema.** La tabla comparativa de métodos de `ANEXO_C` §3.3 publicaba tres cifras, ninguna
reproducible con las fórmulas de §3.1 y mutuamente incoherentes entre sí:

- `mes_completo` declaraba 86 meses pero una acumulada de 11.510.502,22, que corresponde a 87,2765
  meses.
- `dias_exactos` declaraba 87,3908 meses pero una acumulada de 11.696.594,45, que corresponde a
  88,6879 meses.
- El "valor del archivo de referencia", 11.522.343,13, implica 87,3667 meses.

Entre 2018-04-27 y 2025-06-30 transcurren **2.621 días**, que dan 86,1109 meses por `dias_exactos` y
86 por `mes_completo`. El error se propagaba a `RN-06-01`.

**Corrección.**

| Método | Meses (antes) | Meses (después) | Dep. acumulada (antes) | Dep. acumulada (después) |
|---|:-:|:-:|---|---|
| `mes_completo` | 86 | **86** | 11.510.502,22 | **11.342.100,44** |
| `dias_exactos` | 87,3908 | **86,1109** | 11.696.594,45 | **11.356.724,23** |
| `fraccion_anual` | *(no figuraba)* | **86,1109** | — | **11.356.724,23** |

Se eliminó la fila "valor del archivo de referencia": no era reproducible y no se dispone del archivo
original que la habría explicado.

**Efecto sobre la afirmación de magnitud.** El texto decía que la diferencia entre métodos "supera
los $180.000 en un solo bien". La diferencia real es de **$14.623,79**. El argumento de fondo —el
método debe fijarse por acta antes de calcular— se conserva, pero se reformula: el problema no es el
monto unitario, sino que si contabilidad y la aplicación usan métodos distintos las cifras no cuadran
nunca y el ejercicio no puede cerrarse (`ANEXO_C` §7.1).

---

## C-03 · Ejemplo de valuación técnica

**Problema.** `ANEXO_C` §5.3 y `RN-07-04` partían del índice 0,6922 del caso corregido en C-01.

**Corrección.**

```
ANTES:  factor_vida_restante = 1 − 0,6922 = 0,3078
        valor_avaluo = 10.000.000 × 0,3078 × 1,00 = 3.078.000

DESPUÉS: factor_vida_restante = 1 − 0,6899 = 0,3101
         valor_avaluo = 10.000.000 × 0,3101 × 1,00 = 3.101.000
```

---

## C-04 · `saldo_por_depreciar` y base de comparación del avalúo

**Problema doble.**

1. `RN-06-01` definía `saldo_por_depreciar = saldo_final_ajustado − depreciacion_acumulada − deterioro`,
   colapsando en un solo campo dos conceptos que `ANEXO_B` §4.3 modela por separado y que
   `ANEXO_C` §3.1 define como magnitudes distintas.
2. `RN-07-07` y `ANEXO_C` §5.4 comparaban el avalúo contra `saldo_por_depreciar`, que no descuenta el
   deterioro. Como el deterioro ya se reconoció en el paso 06, volver a restarlo dentro de la
   desvalorización lo cuenta dos veces y puede **invertir el signo del ajuste**.

**Corrección.**

```
saldo_por_depreciar = saldo_final_ajustado − depreciacion_acumulada
valor_neto_libros   = saldo_final_ajustado − depreciacion_acumulada − deterioro

diferencia = valor_avaluo_final − valor_neto_libros     (antes: − saldo_por_depreciar)
```

**Ilustración del efecto:**

```
  costo + adiciones        10.000.000
  − depreciación acumulada  6.000.000
  = saldo_por_depreciar     4.000.000
  − deterioro               1.000.000
  = valor_neto_libros       3.000.000   ← lo que figura en el balance
  avalúo final              3.500.000

  contra valor_neto_libros:   +500.000 → VALORIZACION      ✔
  contra saldo_por_depreciar: −500.000 → DESVALORIZACION   ✘
```

Signos opuestos sobre el mismo bien. Se adopta `valor_neto_libros` porque el ajuste que ordena la
resolución lleva el activo desde la cifra del balance hasta su valor razonable.

Se añade el parámetro `base_comparacion_avaluo` (`ANEXO_B` §2.5, por defecto `valor_neto_libros`)
para entidades cuya política contable exija lo contrario.

---

## C-05 · Regla de exclusión mutua en la consolidación

**Problema.** `RN-10-01` y `ANEXO_C` §7 suman `ajustes_de_valor` **y**
`valorizaciones/desvalorizaciones` sin declarar qué alimenta cada columna. Como `RN-07-07` clasifica
toda diferencia de avalúo como valorización o desvalorización, y `RN-04-02` genera partidas de tipo
`DIFERENCIA_VALOR` con acción `AJUSTAR_VALOR`, un mismo bien podía aportar a ambas.

```
  Bien X en libros                        10.000.000
  Conciliación: costo mal registrado      − 2.000.000   (ajustes_de_valor)
  Valuación: desvalorización, misma causa − 2.000.000   (desvalorizaciones)
  nuevo_saldo                             =  6.000.000
  correcto                                =  8.000.000   ← 2.000.000 de más descontados
```

**Corrección.** Se añade `ANEXO_C` §7.0 y una tabla equivalente en `RN-10-01` que asigna a cada
columna un origen único y excluyente: `ajustes_de_valor` recoge **correcciones de errores de
registro**; `valorizaciones/desvalorizaciones` recogen **cambios de medición a valor razonable**. Si
un bien tiene avalúo, su partida conciliatoria de valor queda marcada como *absorbida*. El motor
emite un **error de consolidación** si detecta un bien en ambas columnas.

---

## C-06 · Parámetros usados pero no declarados

**Problema.** `ANEXO_C` §3.2 usaba `parametros.usa_puesta_en_servicio` y §3.6 describía dos enfoques
de adiciones, pero ninguno figuraba en la tabla de claves obligatorias de `ANEXO_B` §2.5.

**Corrección.** Se añaden tres claves:

| Clave | Tipo | Por defecto | Implementa |
|---|---|---|---|
| `usa_puesta_en_servicio` | booleano | `no` | `ANEXO_C` §3.2, `RN-03-03` |
| `enfoque_adiciones` | enum `simplificado` / `componente_separado` | `simplificado` | `ANEXO_C` §3.6 |
| `base_comparacion_avaluo` | enum `valor_neto_libros` / `saldo_por_depreciar` | `valor_neto_libros` | C-04 |

---

## C-07 · Valor por defecto del método de conteo de meses

**Problema.** `metodo_conteo_meses` era el único parámetro obligatorio sin valor por defecto, lo que
obliga a una decisión sin referencia en cada instalación nueva.

**Corrección.** Se fija **`dias_exactos`** como valor **sugerido**, por coherencia con el divisor
365,25 que ya usa el índice de obsolescencia y porque evita los saltos bruscos del conteo por meses
calendario.

**Lo que no cambia:** sigue siendo obligatorio confirmarlo por acta (`IN-06-04`) antes de calcular.
`VAL-01-07` y `VAL-06-01` **no se levantan con el valor sugerido**, solo con la confirmación
explícita del contador. La aplicación ofrece el simulador comparativo (`RF-06-07`) para que la
decisión se tome con cifras a la vista.

---

## C-08 · Enum de `Bien.estado_registro`

**Problema.** El §10.1 del paso 02 listaba cuatro estados (`borrador`, `validado`, `incompleto`,
`dado_de_baja`) mientras `ANEXO_B` §6.2 describía seis. Además, `ANEXO_B` §6.2 no declaraba la
transición de regreso `PROPUESTO_BAJA → ACTIVO` que `RN-09-04` sí exige ("un bien rechazado vuelve a
`ACTIVO`").

**Corrección.** El enum canónico tiene **seis** estados y está en `ANEXO_B` §6.2, ahora con la tabla
completa de transiciones válidas, incluida la de regreso tras el rechazo del Comité. El paso 02
remite a esa sección.

---

## C-09 · Usuarios y roles → catálogo de responsables

**Problema.** `ANEXO_B` §7.2 modelaba 10 roles con permisos de acceso, y §7.1 registraba la dirección
IP de origen. Eso describe un sistema cliente-servidor multiusuario.

**Decisión del propietario (2026-09-01):** la aplicación es de **escritorio, monousuario y sin inicio
de sesión**. La maneja una sola persona en el hospital.

**Corrección.** Los perfiles se conservan, pero como **dato de atribución**, no como control de
acceso. Los documentos siguen exigiendo decir quién certificó, quién valuó, quién avaluó y quién
firma:

| Antes | Después |
|---|---|
| `Usuario` + `Rol` con permisos | `Responsable`: catálogo de personas con perfil, cargo, tarjeta profesional y registro R.A.A |
| Autenticación y matriz de permisos | No hay. No hay contraseñas ni sesión |
| `Bitacora.usuario_id` | `Bitacora.responsable_id`, opcional |
| `Bitacora.ip` | `Bitacora.origen` (equipo + usuario del SO). El campo `ip` queda sin uso |
| "Bandejas de trabajo por especialista" | Filtros sobre la misma base local |

**Lo que no cambia:** la bitácora sigue siendo obligatoria y completa. No tener usuarios no significa
no tener trazabilidad — la Resolución 193 de 2016 exige poder reconstruir qué cambió, cuándo y con
qué justificación, y eso se conserva íntegro.

---

## C-10 · Captura móvil y almacenamiento de fotografías

**Problema.** `RF-02-01` pedía "captura móvil de inventario con funcionamiento offline y
sincronización posterior", `RF-02-02` lectura de códigos con la cámara, y `ANEXO_B` §9 recomendaba
"base local con sincronización diferencial y resolución de conflictos por marca de tiempo". Eso
describe una aplicación móvil con sincronización.

**Decisión del propietario (2026-09-01):** fuera de alcance. La aplicación no se usa en campo.

**Corrección.**

| Requisito | Estado | Cómo se cubre la necesidad |
|---|---|---|
| `RF-02-01` captura móvil offline | **Fuera de alcance** | El conteo se hace sobre `PL-03` (impresa o en Excel) y se **importa** con `RF-02-07` |
| `RF-02-02` lectura con cámara | **Fuera de alcance** | La aplicación **genera** las etiquetas (`RF-02-04`, que sí se mantiene); no las lee |
| Sincronización diferencial | **Descartada** | — |

Se descarta expresamente la "resolución de conflictos por marca de tiempo": cuando el dato en disputa
es el costo de un activo, resolver automáticamente por la hora de edición es inaceptable.

La pantalla "Captura en campo (móvil)" del §10.3 del paso 02 se sustituye por **"Importador de
inventario"**.

**Fotografías (CT-14).** "Almacenamiento de objetos" presuponía infraestructura en la nube. En una
aplicación local el equivalente es el sistema de archivos:
`<datos>/almacen/<ejercicio>/<bien>/`, con la ruta relativa y una suma SHA-256 en la base. Los campos
`*_url` del modelo son **rutas relativas al almacén**, no URL.

---

## C-11 · Umbrales del semáforo con huecos entre rangos

**Problema.** `RN-01-05` publicaba los rangos como Verde 0,00–0,50, Amarillo 0,51–0,80, Naranja
0,81–0,99, Rojo ≥ 1,00. Eso deja sin clasificar los índices entre 0,50 y 0,51 y entre 0,80 y 0,81,
que sí existen: el índice se guarda con **cuatro decimales** (`ANEXO_B` §4.2), de modo que 0,5043 era
un valor real sin semáforo asignado.

**Corrección.** Las fronteras son `≤`, tal como ya lo hacía el pseudocódigo de `ANEXO_C` §2.6:

```
índice ≤ 0,50           → VERDE
0,50 < índice ≤ 0,80    → AMARILLO
0,80 < índice < 1,00    → NARANJA
índice ≥ 1,00           → ROJO
```

Los tres umbrales siguen siendo parámetros configurables por entidad.

---

## C-12 · `fecha_fin_vida_util`: dos definiciones

**Problema.** `ANEXO_C` §2.1 la definía como `fecha_adquisicion + (vida_util × 365,25 días)`, pero el
pseudocódigo de §2.5 escribía `+ años(vida_util)` y `RN-05-01` sumaba años calendario. Para 15 años
las dos definiciones difieren en unos 4 días.

**Corrección.** Prevalece `ANEXO_C` §2.1 (× 365,25), por coherencia con el divisor usado para la
edad: de lo contrario, `edad = vida_util` no coincidiría con `fecha_corte = fecha_fin_vida_util`. Se
corrigió el pseudocódigo de §2.5 y la fórmula de `RN-05-01`.

Cuando el resultado cae a mitad de día, se redondea al día más cercano con desempate hacia arriba
(`RED-06`).

---

## Contradicciones documentadas que NO requirieron corregir `/especificacion/teoria`

Cuatro discrepancias se resolvieron por criterio de implementación, sin alterar la base teórica.
Están documentadas en `1.4_contradicciones_teoria.md`:

| # | Asunto | Resolución |
|:-:|---|---|
| CT-07 | `ANEXO_A` §3.1 dice que los encabezados de las plantillas están en la fila 4; `LEEME_PLANTILLAS` §2 dice fila 6 | El importador **detecta** la fila de encabezados buscando los nombres de columna esperados, en lugar de fijarla por constante. Absorbe ambas versiones |
| CT-10 | El pseudocódigo de `ANEXO_C` atribuye a `Bien` campos que viven en `HojaVida` y `ClaseActivo` | Es taquigrafía de pseudocódigo. El motor recibe un objeto de entrada aplanado que el caso de uso construye |
| CT-12 | Con índice ≥ 1 el método por defecto arroja valor cero incluso para bienes funcionales | Se implementa la fórmula tal cual; la interfaz aísla esa cohorte y exige decisión explícita del especialista |
| CT-15 | `Inmueble` cuelga de `Entidad` pero se valúa por `Ejercicio` | El modelo es correcto y deliberado: el predio persiste entre cortes, el avalúo es del corte |

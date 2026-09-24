# 06 · El motor de cálculo

`src/compartido/motor/`. Es el corazón de la aplicación y la parte que más cuidado exige, porque sus
cifras acaban en una resolución firmada por el Gerente de una entidad pública.

> **`ANEXO_C` prevalece** sobre los documentos de paso en todo lo relativo al cálculo. Lo dice el
> propio anexo. Si `06_DEPRECIACION_Y_DETERIORO.md` y `ANEXO_C` discrepan, manda `ANEXO_C`.

## Qué contiene

| Archivo | Qué hace |
|---|---|
| `dinero.ts` | `Decimal`, redondeo, conversión a centavos. Las seis reglas `RED-01`…`RED-06` |
| `fechas.ts` | Aritmética de fechas civiles **sin `Date`** |
| `depreciacion.ts` | Línea recta sobre costo − valor residual |
| `obsolescencia.ts` | Índice de obsolescencia y semáforo |
| `deterioro.ts` | Deterioro del valor |
| `candidatoBaja.ts` | Si un bien cumple criterio de baja, y por qué |
| `baja.ts` | Relación reparación/reposición (`RN-09-03`) y efecto contable |
| `resultado.ts` | El tipo `Resultado<T>` que impide devolver ceros falsos |

## La regla que gobierna todo: un cálculo imposible nunca es cero

`resultado.ts` distingue cuatro desenlaces, y los distingue **porque significan cosas distintas para
quien tiene que resolverlos**:

| Estado | Qué significa | Qué hay que hacer |
|---|---|---|
| `CALCULADO` | Hay cifra | Nada |
| `NO_APLICA` | La regla no le corresponde a este bien | Nada — un terreno no se deprecia |
| `NO_CALCULABLE` | **Falta un dato del bien** | Conseguir la fecha o el costo (`PL-05`) |
| `ERROR_DATOS` | **Hay un dato imposible o mal parametrizado** | Corregir antes de cerrar |

Un bien `NO_CALCULABLE` se excluye de los totales y aparece en el listado de pendientes; uno con
`ERROR_DATOS` impide cerrar. **Devolver 0 escondería el problema dentro de una cifra que después se
firma**, y además afirmaría algo falso: que la depreciación es cero.

> Esta decisión, tomada por prudencia de ingeniería, resultó estar **alineada con la norma**. La
> Guía de Aplicación 003 de la CGN dice que *«el deterioro se reconoce solo cuando existen
> indicios»*. Un cero habría sido afirmar que no hay deterioro. Ver `/especificacion/normatividad`, ficha 04.

La interfaz los muestra **por separado**, nunca sumados.

## El dinero

`Decimal` de decimal.js dentro del motor; entero de centavos fuera. Redondeo `ROUND_HALF_UP`, y las
seis reglas de redondeo `RED-01`…`RED-06` de `ANEXO_C` implementadas explícitamente.

El tipo nominal `Centavos` impide pasar pesos donde se esperan centavos, y `aCentavos` es la única
puerta de conversión. `X10k` hace lo propio con los factores de cuatro decimales.

## Las fechas, sin `Date`

`fechas.ts` implementa `ANEXO_C` §3.3 con **número de día juliano**. No hay `Date` en ninguna parte
del motor.

La razón es concreta: `Date` arrastra zona horaria y horario de verano, y una fecha de corte que se
mueve un día cambia la depreciación de miles de bienes. Con día juliano no hay husos que valgan.

`DIAS_POR_ANIO = 365.25` es el divisor de `ANEXO_C` §2.1 y §3.3.

### Los tres métodos de conteo de meses

`contarMeses` implementa los tres que admite la norma:

| Método | |
|---|---|
| `mes_completo` | Cuenta meses enteros |
| `dias_exactos` | **Por defecto** |
| `fraccion_anual` | |

El método de conteo cambia las cifras, así que conviene acordarlo con el contador **antes** de
calcular. Hasta ADR-028 el cálculo se negaba a correr sin una "confirmación por acta"
(`metodo_conteo_meses_confirmado`); se retiró porque hacía depender la aplicación de un documento
externo. Lo que garantiza la trazabilidad ahora es que **cada corte guarda el método que usó** —en
sus parámetros y en cada fila de depreciación— y el informe lo declara en el encabezado y en el pie
de cada página.

## Depreciación

Línea recta sobre `costo − valor residual`, con **tope en la base depreciable**: la acumulada nunca
puede superarla. Al alcanzarla, el bien queda `totalmente_depreciado` y su saldo por depreciar es el
valor residual (o cero).

Valor residual configurable, **0 % por defecto** (`ANEXO_C` §210).

## Obsolescencia y semáforo

`clasificarSemaforo` usa **tres umbrales**, todos parámetros del proceso.

> **CT-20.** El parámetro `umbral_semaforo_naranja` existía en `ANEXO_B`, pero `ANEXO_C` §2.6 usaba
> un `1,0` literal. Se resolvió a favor del parámetro y quedó documentado como contradicción.
> **`/especificacion/teoria` no se modificó.**

## Bajas

El motor **propone**; no da de baja nada. `esCandidatoBaja` evalúa estado físico, obsolescencia y
depreciación total, y devuelve el motivo. `evaluarReparacion` calcula la relación
reparación/reposición contra el umbral (`RN-09-03`).

La justificación de cada propuesta es **individual y obligatoria**: hay una lista de justificaciones
genéricas que se rechazan y un mínimo de 20 caracteres. «Está dañado» no es una justificación.

## Cómo se prueba, y la regla que lo protege

`calculo.test.ts` contiene **42 casos escritos antes que el motor** y verificados fallando primero.
**Todo valor esperado sale de `ANEXO_C`.**

> **Ningún valor esperado se modifica sin una entrada en la bitácora que lo justifique.** Es la
> mitigación del riesgo `RG-01`: si los valores esperados se ajustan al código, el motor queda
> validado contra sí mismo, y sus errores llegan a resoluciones firmadas.

Si un test del motor falla, la primera hipótesis es que el código está mal, no el test.

## Dónde acaba el motor y empieza la aplicación

`main/modules/calculo/` orquesta; **no contiene aritmética**. `calcularCorte` lee la fecha de corte y
los parámetros vigentes del proceso, llama al motor bien por bien y guarda un **corte** —que
reemplaza al anterior del mismo proceso (ADR-029)— con una copia de
esos parámetros, sus resultados y sus exclusiones. Si encuentra aritmética en un caso de uso, está en
el sitio equivocado.

Dos decisiones del caso de uso, no del motor:

- **Un bien adquirido después de la fecha de corte no existía ese día.** No se le pide al motor
  (que respondería `ERROR_DATOS`, "edad negativa"): se excluye con `NO_APLICA` y ámbito `GENERAL`.
- **No se reconoce deterioro.** Exige indicios y un avalúo que la aplicación no hace; el acumulado
  entra al motor en cero y el informe lo dice.

ADR-028 no tocó el motor: **ni un carácter de `compartido/motor/`** cambió, y sus casos de
verificación pasan con los mismos valores esperados.

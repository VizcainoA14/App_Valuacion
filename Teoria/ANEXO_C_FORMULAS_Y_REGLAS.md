# Anexo C — Fórmulas y Reglas del Motor de Cálculo

Especificación completa del motor de cálculo, con casos borde y pseudocódigo. Este anexo es la referencia autoritativa: si un paso y este anexo difieren, **prevalece este anexo**.

---

## 1. Parámetros de entrada del motor

| Parámetro | Origen | Obligatorio |
|---|---|:-:|
| `fecha_corte` | Ejercicio | Sí |
| `metodo_conteo_meses` | Parámetro de entidad | Sí |
| `deprecia_mes_adquisicion` | Parámetro de entidad | Sí |
| `valor_residual_pct` | Parámetro de entidad | Sí |
| `decimales_calculo` | Parámetro de entidad | Sí |
| `umbrales_semaforo` | Parámetro de entidad | Sí |

---

## 2. Cálculo de edad e índice de obsolescencia

### 2.1 Fórmulas

```
edad_actual_anios    = (fecha_corte − fecha_adquisicion) / 365.25

indice_obsolescencia = edad_actual_anios / vida_util_tecnica_anios

porcentaje           = indice_obsolescencia × 100

anios_restantes      = vida_util_tecnica_anios − edad_actual_anios

fecha_fin_vida_util  = fecha_adquisicion + (vida_util_tecnica_anios × 365.25 días)
```

### 2.2 Por qué 365.25
Compensa los años bisiestos. Es el divisor usado en los cálculos de referencia y produce resultados reproducibles. **No cambiarlo sin recalcular todo el histórico.**

### 2.3 Caso de verificación

> **Corregido el 2026-09-01.** La versión anterior mezclaba dos valores de edad (10,3491 y 10,3833)
> y calculaba el índice con el segundo, que no se deriva de los 3.780 días declarados. Ver
> `CORRECCIONES.md` § C-01. Las cifras de abajo son las que producen las fórmulas de §2.1.

| Dato | Valor |
|---|---|
| Fecha de adquisición | 2015-02-23 |
| Fecha de corte | 2025-06-30 |
| Vida útil técnica | 15 años |

```
días transcurridos = 3.780
edad_actual        = 3.780 / 365.25   = 10,3491
indice             = 10,3491 / 15     = 0,6899
porcentaje         = 68,99 %
anios_restantes    = 15 − 10,3491     = 4,6509
fin_vida_util      = 2015-02-23 + (15 × 365.25 días) = 2030-02-23
semaforo           = AMARILLO
```

> **Sobre `fin_vida_util`:** 15 × 365,25 = 5.478,75 días, que caen a mitad del 2030-02-22. Se
> redondea al día más cercano con desempate hacia arriba (`RED-06`) → **2030-02-23**.

### 2.4 Casos borde

| Caso | Comportamiento |
|---|---|
| `fecha_adquisicion` nula | No calcular. Marcar bien como INCOMPLETO. |
| `fecha_adquisicion` > `fecha_corte` | Error de datos. No calcular edad negativa. |
| `vida_util_tecnica_anios` nula o cero | No calcular. Reportar como no evaluable. |
| `indice` > 1 | **Válido.** No truncar. Indica exceso de vida útil. |
| Bien con override de vida útil | Usar el override y registrar cuál se aplicó. |

### 2.5 Pseudocódigo

```
funcion calcularObsolescencia(bien, ejercicio):
    si bien.fecha_adquisicion es nula:
        retornar NoCalculable("falta fecha de adquisición")

    si bien.fecha_adquisicion > ejercicio.fecha_corte:
        retornar Error("fecha de adquisición posterior al corte")

    vida_util = bien.vida_util_tecnica_override
                ?? bien.clase.vida_util_tecnica_anios

    si vida_util es nula o vida_util <= 0:
        retornar NoCalculable("clase sin vida útil técnica")

    dias  = diferenciaEnDias(ejercicio.fecha_corte, bien.fecha_adquisicion)
    edad  = dias / 365.25
    indice = edad / vida_util

    retornar {
        edad_actual_anios:   redondear(edad, 4),
        indice_obsolescencia: redondear(indice, 4),
        anios_restantes:      redondear(vida_util - edad, 4),
        fecha_fin_vida_util:  bien.fecha_adquisicion + dias(vida_util × 365.25),
        semaforo:             clasificarSemaforo(indice),
        vida_util_aplicada:   vida_util
    }
```

### 2.6 Clasificación del semáforo

```
funcion clasificarSemaforo(indice):
    si indice <= umbral_verde     retornar VERDE      // ≤ 0,50
    si indice <= umbral_amarillo  retornar AMARILLO   // ≤ 0,80
    si indice <  1.0              retornar NARANJA    // < 1,00
    retornar ROJO                                     // ≥ 1,00
```

### 2.7 Criterio de candidato a baja

```
funcion esCandidatoBaja(bien, calculo):
    si calculo.indice_obsolescencia >= 1.0
        retornar verdadero
    si calculo.indice_obsolescencia >= 0.81
       y bien.estado_actual en [MALO, INSERVIBLE]
        retornar verdadero
    si calculo.obsolescencia_funcional
        retornar verdadero
    si bien.estado_operativo == NO_OPERATIVO
       y tieneMantenimientoCorrectivoFallido(bien)
        retornar verdadero
    retornar falso
```

---

## 3. Cálculo de depreciación

### 3.1 Fórmulas

```
saldo_final_ajustado   = valor_adquisicion + adiciones_mejoras

valor_residual         = saldo_final_ajustado × (valor_residual_pct / 100)

base_depreciable       = saldo_final_ajustado − valor_residual

depreciacion_mensual   = base_depreciable / vida_util_meses

meses_transcurridos    = contarMeses(fecha_inicio, fecha_corte, metodo)

depreciacion_acumulada = MIN(depreciacion_mensual × meses_transcurridos,
                             base_depreciable)

saldo_por_depreciar    = saldo_final_ajustado − depreciacion_acumulada

valor_neto_libros      = saldo_final_ajustado − depreciacion_acumulada − deterioro

porcentaje_depreciado  = depreciacion_acumulada / base_depreciable
```

### 3.2 Determinación de la fecha de inicio

```
funcion fechaInicioDepreciacion(bien, parametros):
    base = bien.fecha_puesta_servicio
           si parametros.usa_puesta_en_servicio y existe
           sino bien.fecha_adquisicion

    si parametros.deprecia_mes_adquisicion == falso:
        base = primerDiaDelMesSiguiente(base)

    retornar base
```

### 3.3 Los tres métodos de conteo de meses

> **Este es el punto crítico de todo el sistema.** Debe definirse por acta con el contador antes de calcular.

#### Método A — `mes_completo`
```
meses = (año_corte − año_inicio) × 12 + (mes_corte − mes_inicio)
si dia_corte < dia_inicio:
    meses = meses − 1
```
Cuenta solo meses calendario cumplidos. Resultado entero.

#### Método B — `dias_exactos`
```
dias  = diferenciaEnDias(fecha_corte, fecha_inicio)
meses = (dias / 365.25) × 12
```
Resultado decimal. Mayor precisión.

#### Método C — `fraccion_anual`
```
anios = diferenciaEnDias(fecha_corte, fecha_inicio) / 365.25
meses = anios × 12
```
Matemáticamente equivalente al método B; se conserva por claridad de presentación en informes anuales.

#### Comparación con un caso real

> **Corregido el 2026-09-01.** Ninguna de las tres cifras de la versión anterior era reproducible
> con las fórmulas de §3.1, y eran incoherentes entre sí (11.696.594,45 / 131.884,89 = 88,69 meses,
> no los 87,3908 que la propia fila declaraba). Ver `CORRECCIONES.md` § C-02.

| Dato | Valor |
|---|---|
| Fecha de adquisición | 2018-04-27 |
| Fecha de corte | 2025-06-30 |
| Costo | 23.739.280 |
| Vida útil | 180 meses |
| Valor residual | 0 % |

```
días transcurridos   = 2.621
base_depreciable     = 23.739.280
depreciacion_mensual = 23.739.280 / 180 = 131.884,89
```

| Método | Meses | Depreciación acumulada | Saldo por depreciar |
|---|:-:|---|---|
| `mes_completo` | 86 | 11.342.100,44 | 12.397.179,56 |
| **`dias_exactos`** (por defecto) | **86,1109** | **11.356.724,23** | **12.382.555,77** |
| `fraccion_anual` | 86,1109 | 11.356.724,23 | 12.382.555,77 |

> **Diferencia entre métodos: 0,1109 meses = $14.623,79 en este bien.** La magnitud unitaria es
> pequeña, pero el problema real no es el monto: es que si contabilidad calcula con un método y la
> aplicación con otro, las cifras **no cuadran nunca** y el ejercicio no puede cerrarse (§7.1). De
> ahí la exigencia del acta.
>
> El caso ilustra además por qué el método debe fijarse **antes** de calcular: cambiarlo después
> obliga a recalcular el ejercicio completo.

### 3.4 Casos borde

| Caso | Comportamiento |
|---|---|
| `costo_adquisicion` nulo o cero | No calcular. Marcar INCOMPLETO. Excluir de totales. |
| `vida_util_meses` nula o cero | No calcular. Reportar error de parametrización. |
| Clase no depreciable (terrenos) | Omitir del cálculo; incluir en consolidación patrimonial. |
| `meses_transcurridos` > `vida_util_meses` | Aplicar tope: depreciación = base depreciable. |
| `meses_transcurridos` negativo | Error de datos. No calcular. |
| Bien adquirido en la fecha de corte | Meses = 0 o 1 según `deprecia_mes_adquisicion`. |
| Adiciones posteriores a la adquisición | Ver §3.6. |

### 3.5 Pseudocódigo

```
funcion calcularDepreciacion(bien, ejercicio, parametros):
    si no bien.clase.es_depreciable:
        retornar NoAplica("clase no depreciable")

    si bien.costo_adquisicion es nulo o bien.costo_adquisicion <= 0:
        retornar NoCalculable("falta costo de adquisición")

    vida_util_meses = bien.clase.vida_util_contable_meses
    si vida_util_meses es nula o vida_util_meses <= 0:
        retornar Error("clase sin vida útil contable")

    saldo_ajustado = bien.costo_adquisicion + (bien.adiciones_mejoras ?? 0)
    residual       = saldo_ajustado × (parametros.valor_residual_pct / 100)
    base           = saldo_ajustado − residual

    inicio = fechaInicioDepreciacion(bien, parametros)
    si inicio > ejercicio.fecha_corte:
        retornar { depreciacion_acumulada: 0, saldo_por_depreciar: saldo_ajustado }

    dep_mensual = base / vida_util_meses
    meses       = contarMeses(inicio, ejercicio.fecha_corte,
                              parametros.metodo_conteo_meses)

    dep_acumulada = minimo(dep_mensual × meses, base)

    retornar {
        saldo_final_ajustado:   saldo_ajustado,
        valor_residual:         residual,
        base_depreciable:       base,
        depreciacion_mensual:   dep_mensual,
        meses_transcurridos:    meses,
        metodo_conteo_aplicado: parametros.metodo_conteo_meses,
        depreciacion_acumulada: redondear(dep_acumulada, parametros.decimales),
        saldo_por_depreciar:    redondear(saldo_ajustado − dep_acumulada, parametros.decimales),
        totalmente_depreciado:  dep_acumulada >= base
    }
```

### 3.6 Tratamiento de adiciones y mejoras

Dos enfoques admitidos; la entidad elige uno y se aplica de forma uniforme:

| Enfoque | Descripción | Cuándo usarlo |
|---|---|---|
| **Simplificado** | La adición se suma al costo y se deprecia desde la fecha original del bien | Adiciones de bajo monto; es el enfoque de los archivos de referencia |
| **Componente separado** | La adición se deprecia desde su propia fecha, por la vida útil restante | Adiciones significativas o que extienden la vida útil |

El enfoque simplificado es el implementado por defecto. Si se requiere el segundo, la adición se modela como un componente hijo del bien con su propio cálculo.

---

## 4. Cálculo de deterioro

```
deterioro_reconocido = MAX(0, valor_neto_antes − valor_recuperable)

valor_neto_antes     = saldo_final_ajustado − depreciacion_acumulada
```

**Condiciones para reconocerlo:**
1. Existe un indicio objetivo documentado.
2. Hay concepto de un especialista con soporte.
3. El valor recuperable fue estimado, no supuesto.

**Reglas:**
- El deterioro **no revierte** automáticamente.
- Un deterioro superior al 50% del valor neto genera advertencia.
- El deterioro reduce el valor neto pero **no** modifica la depreciación acumulada.

---

## 5. Cálculo de la valuación técnica de muebles

### 5.1 Método por defecto: costo de reposición depreciado

```
factor_vida_restante = MAX(0, 1 − indice_obsolescencia)

valor_avaluo_calculado = valor_equipo_nuevo_equivalente
                       × factor_vida_restante
                       × factor_estado
```

### 5.2 Tabla de factor de estado (parametrizable)

| Estado | Factor |
|---|:-:|
| BUENO | 1,00 |
| REGULAR | 0,75 |
| MALO | 0,40 |
| INSERVIBLE | 0,05 |

### 5.3 Ejemplo

> **Corregido el 2026-09-01.** Usaba el índice 0,6922 del caso erróneo de §2.3. Con el índice
> correcto (0,6899) el resultado es 3.101.000. Ver `CORRECCIONES.md` § C-03.

```
valor_nuevo_equivalente = 10.000.000
indice_obsolescencia    = 0,6899      (caso de §2.3)
estado                  = BUENO → factor 1,00

factor_vida_restante = 1 − 0,6899 = 0,3101
valor_avaluo         = 10.000.000 × 0,3101 × 1,00 = 3.101.000
```

### 5.4 Clasificación del ajuste

> **Corregido el 2026-09-01.** La base de comparación era `saldo_por_depreciar`, que **no** descuenta
> el deterioro ya reconocido en el paso 06 y por tanto lo contaba dos veces, llegando a invertir el
> signo del ajuste. Ver `CORRECCIONES.md` § C-04.

```
diferencia = valor_avaluo_final − valor_neto_libros

diferencia > 0 → VALORIZACION
diferencia < 0 → DESVALORIZACION
diferencia = 0 → SIN_CAMBIO
```

**Por qué `valor_neto_libros` y no `saldo_por_depreciar`:** el ajuste que ordena la resolución lleva
el activo desde **la cifra que figura en el balance** hasta su valor razonable. Esa cifra es el valor
neto en libros, con el deterioro ya descontado.

```
Bien con deterioro reconocido:
  costo + adiciones        10.000.000
  − depreciación acumulada  6.000.000
  = saldo_por_depreciar     4.000.000
  − deterioro               1.000.000
  = valor_neto_libros       3.000.000   ← lo que dice el balance
  avalúo final              3.500.000

  contra valor_neto_libros:   +500.000 → VALORIZACION      ✔ correcto
  contra saldo_por_depreciar: −500.000 → DESVALORIZACION   ✘ vuelve a restar el deterioro
```

El parámetro `base_comparacion_avaluo` (ver `ANEXO_B` §2.5) permite a una entidad usar
`saldo_por_depreciar` si su política contable lo exige, pero el valor por defecto es
`valor_neto_libros`.

### 5.5 Casos borde

| Caso | Comportamiento |
|---|---|
| `indice ≥ 1` | `factor_vida_restante = 0` → el valor calculado es 0. El especialista puede asignar valor de salvamento. |
| Sin `valor_equipo_nuevo_equivalente` | No se puede usar este método. Cambiar a `VALOR_EN_LIBROS` o registrar la referencia. |
| Bien propuesto para baja | Usar `VALOR_RESIDUAL_CHATARRA` o `VALOR_CERO`. |
| `valor_avaluo_final` ≠ `valor_avaluo_calculado` | Permitido. Exige justificación técnica. |

---

## 6. Cálculo de inmuebles (referencia — lo ejecuta el perito)

### 6.1 Terreno

```
valor_depurado    = valor_ofertado × (1 − factor_negociacion)
valor_m2_terreno  = promedio(valores_m2_homogeneizados_no_descartados)
valor_terreno     = area_terreno_m2 × valor_m2_terreno
```

Estadísticas de control que debe reportar el estudio de mercado:
```
media, desviacion_estandar, coeficiente_variacion, valor_max, valor_min
coeficiente_variacion = desviacion_estandar / media
```
Un coeficiente superior al 20% indica muestra poco homogénea.

### 6.2 Construcción

```
costo_reposicion_m2  = Σ (porcentaje_capitulo × valor_capitulo_m2)

valor_m2_depreciado  = costo_reposicion_m2
                     × factor_fitto_corvini
                     × factor_calidad

valor_construccion   = area_construida_m2 × valor_m2_depreciado
```

El `factor_fitto_corvini` se obtiene de las tablas de tasación en función de:
- relación `vetustez / vida_util_total`
- clase de conservación (escala 1 a 5)

### 6.3 Total

```
valor_total_inmueble = valor_terreno + valor_construccion
vigencia_hasta       = fecha_informe + 12 meses
```

---

## 7. Consolidación por subcuenta

```
nuevo_saldo_bruto = saldo_anterior
                  + incorporaciones
                  − retiros_por_baja
                  + ajustes_de_valor_positivos
                  − ajustes_de_valor_negativos
                  + valorizaciones
                  − desvalorizaciones

nueva_depreciacion = depreciacion_anterior
                   + ajuste_depreciacion
                   − depreciacion_retirada_por_baja

valor_neto_final = nuevo_saldo_bruto − nueva_depreciacion − nuevo_deterioro
```

### 7.0 Regla de exclusión mutua (obligatoria)

> **Añadida el 2026-09-01.** La fórmula suma `ajustes_de_valor` **y**
> `valorizaciones/desvalorizaciones` sin declarar qué alimenta cada columna. Sin esta regla, un
> mismo bien puede aportar a las dos y su ajuste se cuenta dos veces. Ver `CORRECCIONES.md` § C-05.

Cada columna tiene un origen único y excluyente:

| Columna | Se alimenta de | Naturaleza | Paso |
|---|---|---|:-:|
| `incorporaciones` | Partidas `SOBRANTE_FISICO` con acción `INCORPORAR` | Bien que existe y no estaba en libros | 04 |
| `retiros_por_baja` | `PropuestaBaja` en `APROBADO_COMITE` o posterior | Bien que sale del patrimonio | 09 |
| `ajustes_de_valor` | Partidas conciliatorias con acción `AJUSTAR_VALOR` | **Corrección de un error de registro** (costo mal digitado, fecha equivocada, subcuenta errónea) | 04 |
| `valorizaciones` / `desvalorizaciones` | `ValuacionMueble.tipo_ajuste` y `AvaluoInmueble.diferencia_valuacion` | **Cambio de medición a valor razonable** | 07, 08 |

**Regla:** un bien no puede aportar simultáneamente a `ajustes_de_valor` y a
`valorizaciones/desvalorizaciones`. Si el bien tiene avalúo (pasos 07 u 08), su diferencia va a
valorización o desvalorización, y la partida conciliatoria de valor queda marcada como **absorbida**.

El motor debe emitir un **error de consolidación** —no una advertencia— si detecta un bien
contribuyendo a ambas columnas.

```
Ejemplo del error que esta regla evita:

  Bien X en libros                        10.000.000
  Conciliación: costo mal registrado         −2.000.000   (ajustes_de_valor)
  Valuación: desvalorización por la misma
  causa, calculada sobre el costo correcto   −2.000.000   (desvalorizaciones)

  nuevo_saldo = 10.000.000 − 2.000.000 − 2.000.000 =  6.000.000
  correcto    =                                        8.000.000
                                        se descontaron 2.000.000 de más
```

### 7.1 Verificación de cuadre en tres niveles

```
funcion verificarCuadre(ejercicio, subcuenta):
    total_detalle  = suma(valor de bienes activos de la subcuenta)
    total_auxiliar = saldo del auxiliar contable importado
    total_mayor    = saldo del libro mayor importado

    tolerancia = 1.00   // un peso, por redondeo

    cuadra = abs(total_detalle − total_auxiliar) <= tolerancia
         y   abs(total_auxiliar − total_mayor)   <= tolerancia

    retornar { cuadra, diferencias }
```

**Si no cuadra, el ejercicio no puede cerrarse ni emitirse resoluciones.**

---

## 8. Reglas de redondeo

| Regla | Descripción |
|---|---|
| `RED-01` | Los cálculos intermedios se realizan con la máxima precisión disponible |
| `RED-02` | El redondeo se aplica **solo en la persistencia final y la presentación** |
| `RED-03` | Los índices y factores se guardan con 4 decimales |
| `RED-04` | Los valores monetarios se guardan con 2 decimales |
| `RED-05` | Los totales se calculan sumando los valores redondeados de detalle, para que el total mostrado coincida con la suma visible |
| `RED-06` | Método de redondeo: al más cercano, con desempate hacia arriba |

> `RED-05` es importante: si se suma con precisión completa y luego se redondea el total, el usuario ve un total que no coincide con la suma de las filas mostradas.

---

## 9. Normalización de datos de entrada

### 9.1 Fechas

Formatos a reconocer, en orden de prioridad:
```
AAAA-MM-DD          (ISO, preferido)
DD/MM/AAAA
DD-MM-AAAA
AAAA/MM/DD
Número serial de Excel
```

**Reglas:**
- Ambigüedad entre `DD/MM` y `MM/DD`: usar el formato regional configurado (Colombia: `DD/MM`) y **reportar la interpretación**.
- Fecha no reconocible: rechazar la fila, no adivinar.
- Registrar el formato detectado en el log de importación.

### 9.2 Valores monetarios

```
Eliminar: símbolos de moneda, espacios, separadores de miles
Interpretar: coma o punto como separador decimal según configuración
Rechazar: valores negativos en campos de costo
Convertir a nulo: "", "-", "N/A", "NO REGISTRA"
```

### 9.3 Textos

```
Recortar espacios al inicio y al final
Colapsar espacios múltiples
Campos de lista: convertir a mayúsculas y validar contra el catálogo
Valores "NO REGISTRA", "NT", "N/A" → nulo
```

---

## 10. Orden de ejecución del motor

```
1. Validar parametrización del ejercicio
2. Para cada bien:
   2.1 Validar completitud de datos económicos
   2.2 Calcular obsolescencia        (§2)
   2.3 Calcular depreciación         (§3)
   2.4 Aplicar deterioro registrado  (§4)
   2.5 Calcular valuación sugerida   (§5)
3. Agregar por clase y subcuenta
4. Incorporar valores de inmuebles   (§6)
5. Consolidar                        (§7)
6. Verificar cuadre en tres niveles  (§7.1)
7. Persistir resultados con marca de tiempo y método aplicado
```

**Recálculo:** se dispara ante cambio de `fecha_corte`, `vida_util`, `costo_adquisicion`, `fecha_adquisicion`, `clase_activo` o cualquier parámetro de cálculo. Siempre se registra en la bitácora.

---

## 11. Pruebas mínimas que debe superar el motor

| # | Caso de prueba | Resultado esperado |
|:-:|---|---|
| 1 | Bien adquirido hace exactamente 15 años, vida útil 15 años | índice = 1,0000; semáforo ROJO |
| 2 | Bien adquirido en la fecha de corte | índice ≈ 0; depreciación 0 o 1 mes |
| 3 | Bien con 20 años y vida útil 15 | índice ≈ 1,33 (no truncado) |
| 4 | Bien totalmente depreciado | depreciación = base; saldo = residual |
| 5 | Bien sin costo | NO_CALCULABLE; excluido de totales |
| 6 | Bien sin fecha | NO_CALCULABLE; excluido de totales |
| 7 | Terreno | sin depreciación; presente en consolidación |
| 8 | Cambio de método de conteo | recálculo completo con diferencia registrada |
| 9 | Suma de detalle vs. total de subcuenta | diferencia ≤ $1 |
| 10 | Bien dado de baja | excluido de totales activos; conserva historial |
| 11 | Adición y mejora | base depreciable incluye la adición |
| 12 | Deterioro reconocido | valor neto disminuye; depreciación no cambia |
| 13 | Importación con fecha ambigua | reportada, no adivinada |
| 14 | Importación con duplicado | rechazada con número de fila |
| 15 | Ejercicio cerrado | toda escritura rechazada |

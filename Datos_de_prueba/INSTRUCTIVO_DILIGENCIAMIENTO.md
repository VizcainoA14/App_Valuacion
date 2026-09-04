# Instructivo de diligenciamiento

> Generado con `npm run instructivo` **desde las definiciones del importador**. Si una
> columna cambia en la aplicación, este documento cambia con ella.

## Lo primero: cuáles hay que llenar

De las **28 plantillas** del proceso, la aplicación hoy **lee 5**:

| Orden | Plantilla | Qué aporta | Quién la llena |
|:-:|---|---|---|
| 1 | `PL-01` | Identificación de la E.S.E y parámetros de cálculo | Subgerencia administrativa, con contabilidad |
| 2 | `PL-02` | Clases de activo y vidas útiles | Contabilidad (Manual de Políticas Contables) |
| 3 | `PL-02b` | Sedes y servicios | Administración |
| 4 | `PL-03` | **El inventario físico** | Los técnicos que recorren los servicios |
| 5 | `PL-05` | Fecha y costo de adquisición, mantenimientos | Contabilidad y biomédica |

**Ese es todo el trabajo de campo que hace falta para calcular.** Con esas cinco, la
aplicación produce la depreciación, la obsolescencia, los candidatos a baja y el informe.

### Descárguelas desde la aplicación, no de una carpeta suelta

En **2. Formatos**, la aplicación entrega las plantillas **con los catálogos del hospital
ya puestos como listas desplegables** (sus clases, sus sedes, sus servicios). Eso evita la
mitad de los errores de digitación. Una plantilla bajada de otro lado no los trae.

> Excepción: `PL-01` se descarga antes de que exista la entidad, así que va sin listas.

### Las que NO hay que llenar todavía

**Las produce la aplicación** (no se diligencian):
`PL-04` · `PL-07` · `PL-08` · `PL-09` · `PL-14`

**Se diligencian, pero pertenecen a etapas que aún no están construidas.** Llenarlas hoy
no sirve de nada porque la aplicación todavía no las lee:

| Plantilla | Para qué es | Llega con |
|---|---|---|
| `PL-06` | Saldos contables | paso 4 |
| `PL-07b` | Partidas conciliatorias | paso 4 |
| `PL-08b` | Ajuste de vida útil | paso 5 |
| `PL-09b` | Deterioro | paso 6 |
| `PL-10` | Valuación de muebles | paso 7 |
| `PL-10b` | Referencias de mercado | paso 7 |
| `PL-11` | Ficha de inmueble | paso 8 |
| `PL-11b` | Estudio de mercado de inmuebles | paso 8 |
| `PL-13` | Baja de bienes | paso 9 |
| `PL-19` | Plan de capacitación | paso 11 |
| `PL-12` | Acta de custodia | paso 2 |
| `PL-13b` | Certificación técnica de baja | paso 9 |
| `PL-13c` | Acta de disposición final | paso 9 |
| `PL-15` | Resolución de valuación | paso 10 |
| `PL-16` | Acta del Comité | paso 10 |
| `PL-17` | Acta de entrega final | paso 11 |
| `PL-18` | Manual de activos fijos | paso 11 |
| `PL-20` | Acta de liquidación | paso 11 |

---

## Tres reglas que evitan casi todos los errores

1. **No cambie los nombres de las columnas ni el orden de las hojas.** La aplicación los
   busca por nombre. Puede añadir columnas suyas al final: se ignoran.
2. **La fila azul de ejemplo se deja quieta.** La aplicación la reconoce por el color y no
   la importa. Empiece a escribir en la fila 8.
3. **Lo que no se sabe se deja VACÍO, nunca en cero.** Un cero es una afirmación: "esto
   costó cero". Un vacío dice "no lo encontré", y la aplicación lo trata como pendiente en
   vez de meterlo en una suma que después alguien firma.

---

## `PL-01` · Parámetros de la entidad

Hoja **PARAMETROS**. Es clave/valor: escriba en la columna `valor`, sin tocar la columna
`campo`. Con este archivo se puede **crear la entidad** desde *Nueva entidad → Crear desde
PL-01*.

Obligatorios para crear la entidad: `razon_social`, `nit`, `municipio`, `departamento`,
`nivel_complejidad`, `nombre_gerente`, `direccion`.

| Campo | Para qué sirve | Qué se escribe |
|---|---|---|
| `razon_social` | Identificación | Texto |
| `nit` | Identificación | Texto |
| `municipio` | Identificación | Texto |
| `departamento` | Identificación | Texto |
| `nivel_complejidad` | Identificación | Lista cerrada<br>Valores: `I` · `II` · `III` |
| `nombre_gerente` | Identificación | Texto |
| `acto_nombramiento_gerente` | Identificación | Texto |
| `direccion` | Identificación | Texto |
| `telefono` | Identificación | Texto |
| `email` | Identificación | Texto |
| `fecha_corte_ejercicio` | Ejercicio | Fecha |
| `metodo_depreciacion` | Parámetro de cálculo | Lista cerrada<br>Valores: `linea_recta` |
| `metodo_conteo_meses` | Parámetro de cálculo | Lista cerrada<br>Valores: `mes_completo` · `dias_exactos` · `fraccion_anual` |
| `deprecia_mes_adquisicion` | Parámetro de cálculo | SI / NO |
| `usa_puesta_en_servicio` | Parámetro de cálculo | SI / NO |
| `enfoque_adiciones` | Parámetro de cálculo | Lista cerrada<br>Valores: `simplificado` · `componente_separado` |
| `base_comparacion_avaluo` | Parámetro de cálculo | Lista cerrada<br>Valores: `valor_neto_libros` · `saldo_por_depreciar` |
| `valor_residual_pct` | Parámetro de cálculo | Número (admite decimales) |
| `decimales_calculo` | Parámetro de cálculo | Número entero |
| `umbral_capitalizacion` | Parámetro de cálculo | Importe en pesos |
| `umbral_semaforo_verde` | Parámetro de cálculo | Número (admite decimales) |
| `umbral_semaforo_amarillo` | Parámetro de cálculo | Número (admite decimales) |
| `umbral_semaforo_naranja` | Parámetro de cálculo | Número (admite decimales) |
| `umbral_reparacion_baja_pct` | Parámetro de cálculo | Número (admite decimales) |
| `tolerancia_cruce_valor_pct` | Parámetro de cálculo | Número (admite decimales) |
| `vigencia_avaluo_meses` | Parámetro de cálculo | Número entero |
| `moneda` | Parámetro de cálculo | Texto |

> `fecha_corte_ejercicio` se informa aquí, pero la fecha de corte se fija al **crear el
> ejercicio** en la aplicación. Verá un aviso al importar; es correcto.
>
> `metodo_conteo_meses` es **el parámetro más delicado de todo el sistema**: decide cuántos
> meses se deprecia cada bien. Debe acordarse con el contador **antes** de calcular, y la
> aplicación exige confirmarlo por acta dentro de la aplicación. No basta con escribirlo aquí.

---

## `PL-02` · Clases de activo y vida útil

Hoja **CLASES**. Una fila por clase. Salen del Manual de Políticas Contables.

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_clase` | **Sí** | Texto | Código corto: EMC, MEO, COM… Es el que se usará en todo el proceso. |
| `nombre_clase` | **Sí** | Texto |  |
| `subcuenta_contable` | **Sí** | Texto | La subcuenta del catálogo contable (166002, 165501…). La da contabilidad. |
| `es_depreciable` | **Sí** | SI / NO | NO solo para terrenos y bienes que no pierden valor por uso. |
| `vida_util_contable_meses` | No | Número entero | La del Manual de Políticas Contables. **En meses.** |
| `vida_util_tecnica_anios` | No | Número (admite decimales) | La que dice el fabricante o la técnica. **En años.** Puede diferir de la contable. |
| `requiere_hoja_vida` | **Sí** | SI / NO |  |
| `requiere_invima` | **Sí** | SI / NO |  |
| `responsable_tecnico` | **Sí** | Texto |  |
| `activo` | **Sí** | SI / NO |  |

---

## `PL-02b` · Sedes y servicios

### Hoja **SEDES**

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_sede` | **Sí** | Texto | Dos dígitos: 01, 02… Se usa en PL-03 y en el código de los bienes. |
| `nombre_sede` | **Sí** | Texto |  |
| `direccion` | **Sí** | Texto |  |
| `municipio` | **Sí** | Texto |  |
| `activa` | **Sí** | SI / NO |  |

### Hoja **SERVICIOS**

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_servicio` | **Sí** | Texto | Tres letras: URG, HOS, LAB… Único dentro de su sede. |
| `nombre_servicio` | **Sí** | Texto |  |
| `codigo_sede` | **Sí** | Texto | Dos dígitos: 01, 02… Se usa en PL-03 y en el código de los bienes. |
| `tipo` | **Sí** | Lista cerrada<br>Valores: `asistencial` · `administrativo` · `apoyo` |  |
| `responsable` | No | Texto |  |
| `activo` | **Sí** | SI / NO |  |

> El `codigo_sede` de cada servicio debe existir en la hoja SEDES o ya estar en la
> aplicación. Un servicio puede repetir su nombre en dos sedes; se distinguen por la sede.

---

## `PL-03` · Toma de inventario físico

Hoja **INVENTARIO**. **Una fila por bien.** Es la plantilla que llena el personal de campo
y la única entrada del inventario.

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_institucional` | **Sí** | Texto | El código de la placa que lleva pegada el bien. **Único en todo el inventario.** |
| `placa` | **Sí** | Texto | El número de la placa o marquilla. **Único**, y distinto del código institucional. |
| `descripcion_funcional` | **Sí** | Texto | Qué es el bien, en palabras del hospital: "MONITOR DE SIGNOS VITALES", no "equipo". |
| `clase_activo` | **Sí** | Texto | Elija de la lista desplegable. Son las clases que la entidad cargó con PL-02. |
| `marca` | No | Texto |  |
| `modelo` | No | Texto |  |
| `serie` | No | Texto |  |
| `sede` | **Sí** | Texto | El **código** de la sede (01, 02…), de la lista desplegable. |
| `servicio_ubicacion` | **Sí** | Texto | El servicio donde ESTÁ el bien hoy. Debe existir en esa sede. |
| `cantidad` | No | Número entero | Casi siempre 1. Un bien, una fila: no agrupe cinco camas en una línea. |
| `estado_actual` | **Sí** | Lista cerrada<br>Valores: `BUENO` · `REGULAR` · `MALO` · `INSERVIBLE` | Estado FÍSICO observado al contarlo. |
| `condicion_tenencia` | **Sí** | Lista cerrada<br>Valores: `PROPIO` · `COMODATO` · `ARRENDADO` · `TERCERO` | PROPIO si es del hospital. Comodato, arrendado o de tercero **no** se deprecian. |
| `responsable_custodia` | No | Texto | Quién responde por el bien: nombre y cargo. |
| `fecha_toma` | **Sí** | Fecha | El día en que se contó físicamente el bien. |
| `funcionario_que_cuenta` | **Sí** | Texto | Quién hizo el conteo. Sirve para resolver dudas después. |
| `observaciones` | No | Texto |  |
| `tiene_foto` | No | SI / NO | Informativo. Las fotografías se adjuntan desde la aplicación, no desde el Excel. |

### Lo que más se equivoca

- **Código y placa repetidos.** Cada uno es único en el ejercicio. Si dos bienes comparten
  placa, revise cuál está mal marcado antes de importar.
- **Servicio que no pertenece a la sede.** "URGENCIAS" existe en la sede 01; escribirlo en
  un bien de la sede 02 rechaza la fila.
- **La serie sí puede repetirse.** Equipos idénticos comparten serie o no la traen. La
  aplicación avisa pero importa igual.

---

## `PL-05` · Hoja de vida y datos económicos

Tres hojas. La primera es la que alimenta el cálculo.

### Hoja **HOJA_VIDA** — una fila por bien

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_institucional` | **Sí** | Texto | El código de la placa que lleva pegada el bien. **Único en todo el inventario.** |
| `tipo_instalacion` | No | Lista cerrada<br>Valores: `FIJO` · `MOVIL` |  |
| `registro_invima` | No | Texto | Obligatorio en equipo biomédico. Si está exento, adjunte después la constancia. |
| `fabricante` | No | Texto |  |
| `pais_origen` | No | Texto |  |
| `especificaciones` | No | Texto |  |
| `estado_operativo` | **Sí** | Lista cerrada<br>Valores: `OPERATIVO` · `NO_OPERATIVO` · `FUERA_SERVICIO` | ¿Funciona? Es distinto del estado físico. |
| `forma_adquisicion` | **Sí** | Lista cerrada<br>Valores: `COMPRA` · `DONACION` · `COMODATO` · `REPOSICION` · `TRASLADO` | Cómo llegó el bien al hospital. |
| `fecha_adquisicion` | No | Fecha | **Sin esta fecha no se puede calcular la depreciación.** Si no aparece el soporte, deje la casilla vacía y use la hoja SIN_SOPORTE. |
| `documento_adquisicion` | No | Texto |  |
| `numero_factura` | No | Texto |  |
| `proveedor` | No | Texto |  |
| `costo_adquisicion` | No | Importe en pesos | **Sin este dato no hay cálculo.** Si no lo encuentra, **deje vacío; NO escriba 0**: un cero significa "el bien costó cero", no "no lo sé". |
| `adiciones_mejoras` | No | Importe en pesos | Mejoras capitalizadas posteriores. Si no hubo, 0. |
| `fuente_financiacion` | No | Texto |  |
| `fecha_puesta_servicio` | No | Fecha | Solo si el bien empezó a usarse en una fecha distinta a la de compra. |
| `vida_util_tecnica_override` | No | Número (admite decimales) | Solo si el manual del fabricante contradice al catálogo. **Exige justificación.** |
| `justificacion_override` | No | Texto | Por qué se cambia la vida útil. Sin esto la fila se rechaza. |

> `fecha_adquisicion` y `costo_adquisicion` son **lo que el motor necesita**. Un bien sin
> ellos queda marcado como incompleto y **no entra al cálculo** hasta que se resuelva.

### Hoja **MANTENIMIENTOS** — una fila por mantenimiento

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_institucional` | **Sí** | Texto | El código de la placa que lleva pegada el bien. **Único en todo el inventario.** |
| `fecha_mantenimiento` | **Sí** | Fecha | Cuándo se hizo el mantenimiento. |
| `tipo` | **Sí** | Texto |  |
| `descripcion` | **Sí** | Texto |  |
| `ejecutado_por` | No | Texto |  |
| `costo` | No | Importe en pesos |  |
| `resultado` | No | Texto | Escriba SATISFACTORIO cuando el equipo quedó bien. Otro texto cuenta como fallido y pesa en la baja. |

> Reimportar el mismo archivo no duplica mantenimientos: se reconocen por bien, fecha y tipo.

### Hoja **SIN_SOPORTE** — para los bienes cuya factura no aparece

Cuando tras buscar no hay soporte, **no se inventa el dato**: un especialista estima el
valor y la fecha, y deja constancia escrita. Esta hoja **es** esa constancia; el libro que
se importa queda archivado como acta, con su huella digital.

| Columna | ¿Obligatoria? | Qué se escribe | Notas |
|---|:-:|---|---|
| `codigo_institucional` | **Sí** | Texto | El código de la placa que lleva pegada el bien. **Único en todo el inventario.** |
| `descripcion_bien` | No | Texto |  |
| `gestion_realizada` | **Sí** | Texto | Qué se hizo para buscar el soporte. Es la constancia escrita que exige la norma. |
| `valor_estimado_tecnico` | **Sí** | Importe en pesos | Valor razonable que estima el especialista, en pesos. |
| `fecha_probable_adquisicion` | **Sí** | Fecha | La fecha más razonable que se pueda sustentar. |
| `especialista` | **Sí** | Texto | Quién firma el avalúo: nombre, profesión y tarjeta profesional. |

---

## Orden de trabajo sugerido

1. Descargue `PL-01` desde **2. Formatos** y páselo a la subgerencia administrativa.
2. Cree la entidad con **Nueva entidad → Crear desde PL-01**.
3. Descargue `PL-02` y `PL-02b` (ya salen con membrete) e impórtelos.
4. **Vuelva a descargar `PL-03` y `PL-05`**: ahora sí traen las listas desplegables con
   las clases, sedes y servicios del hospital. Entréguelos al personal de campo.
5. Importe `PL-03`, luego `PL-05`, y calcule.

> El punto 4 importa: si entrega `PL-03` antes de cargar el catálogo, el personal escribirá
> los nombres a mano y aparecerán errores de digitación al importar.

### Cómo se comparan los nombres de clase, sede y servicio

Al importar, la aplicación **no exige que el nombre esté escrito idéntico**. Ignora mayúsculas,
tildes y puntuación, de modo que `EQUIPO MEDICO CIENTIFICO` entra igual que
`Equipo médico-científico`. También acepta el **código** de la clase (`EMC`) en lugar del nombre.

Lo que **no** puede adivinar es otra palabra: `cómputo` y `computación` son nombres distintos y
la fila se rechaza. Cuando eso pasa, el informe de importación dice qué clases hay realmente en el
catálogo, para corregir el archivo o el catálogo con `PL-02`.

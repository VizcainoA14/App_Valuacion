# Paso 08 — Valuación de Inmuebles (Peritazgo)

> **Bloque:** III — Cálculo · **Responsable:** Perito avaluador registrado (externo) · **Precondición:** Paso 01 cerrado (puede correr en paralelo a los pasos 02–07)

---

## 1. Propósito

Establecer el valor comercial de los terrenos y edificaciones de la entidad mediante avalúo pericial, y verificar la legalización de su titularidad. La aplicación **no calcula** este valor: lo solicita, lo almacena, controla su vigencia y lo incorpora a la consolidación patrimonial.

---

## 2. Alcance

**Incluye:** todos los predios de propiedad de la E.S.E (sede principal, puestos de salud, lotes), su avalúo comercial y la verificación documental de titularidad.

**No incluye:** estudio jurídico de títulos (el informe pericial lo advierte expresamente), ni saneamiento de predios sin título (proceso jurídico independiente).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Perito avaluador registrado (R.A.A) | X | | | |
| Coordinador de valuación | | X | | |
| Asesor jurídico de la E.S.E | | | X | |
| Contador | | | X | |
| Gerente | | | | X |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-08-01` | **Certificado de Tradición y Libertad** vigente | Oficina de Registro de Instrumentos Públicos | PDF (< 30 días) | Sí | Matrícula, titularidad, afectaciones |
| `IN-08-02` | Escritura pública o acto de adquisición | Jurídica / Notaría | PDF | Sí | Título de adquisición |
| `IN-08-03` | Boletín / ficha catastral | IGAC o catastro municipal | PDF | Sí | Código catastral y áreas |
| `IN-08-04` | Levantamiento arquitectónico o planos | Recursos Físicos / Planeación | PDF / DWG | Sí | Áreas de terreno y construcción |
| `IN-08-05` | Certificado de uso de suelo | Planeación Municipal | PDF | Sí | Normas urbanísticas (POT/EOT) |
| `IN-08-06` | Recibos de servicios públicos | Recursos Físicos | PDF | No | Verificación de estrato y servicios |
| `IN-08-07` | Historial de remodelaciones y adecuaciones | Recursos Físicos | Documento | Sí | Vetustez efectiva y mejoras |
| `IN-08-08` | Paz y salvo de impuesto predial | Tesorería municipal | PDF | No | Afectaciones |
| `IN-08-09` | Autorización de visita técnica | Gerencia | Oficio | Sí | Acceso del perito |
| `IN-08-10` | Avalúos anteriores del predio | Contabilidad / Jurídica | PDF | No | Comparación histórica |

### 4.1 Modelo de solicitud
Dos comunicaciones distintas:
1. **Oficio a la Gerencia** solicitando `IN-08-01` a `IN-08-08` con plazo, advirtiendo que sin certificado de tradición vigente el avalúo no puede emitirse.
2. **Términos de referencia al perito**, definiendo predios a avaluar, propósito (saneamiento contable), fecha de corte y productos esperados.

---

## 5. Plantillas que se diligencian

### `PL-11` — Ficha de avalúo de inmueble
Archivo: `PL-11_ficha_inmueble.xlsx` · Un registro por predio

**Bloque A — Identificación**

| Campo | Tipo | Oblig. |
|---|---|:-:|
| `codigo_inmueble` | texto | Sí |
| `nombre_inmueble` | texto | Sí |
| `tipo_inmueble` | lista (Urbano/Rural) | Sí |
| `direccion` | texto | Sí |
| `municipio` / `departamento` | texto | Sí |
| `barrio_sector` | texto | No |
| `destinacion` | texto | Sí |
| `uso_actual` | texto | Sí |

**Bloque B — Titulación**

| Campo | Tipo | Oblig. |
|---|---|:-:|
| `matricula_inmobiliaria` | texto | Sí |
| `codigo_catastral` | texto | Sí |
| `titulo_adquisicion` | texto | Sí |
| `fecha_adquisicion` | fecha | Sí |
| `notaria_o_entidad` | texto | No |
| `afectaciones` | texto | Sí |
| `estado_legalizacion` | lista (Legalizado / En trámite / Sin título) | Sí |

**Bloque C — Características físicas**

| Campo | Tipo | Oblig. |
|---|---|:-:|
| `area_terreno_m2` | número | Sí |
| `area_construida_m2` | número | Sí |
| `numero_pisos` | entero | Sí |
| `vetustez_anios` | número | Sí |
| `vida_util_total_anios` | número | Sí |
| `estado_conservacion` | lista 1–5 | Sí |
| `servicios_publicos` | multi | Sí |
| `linderos` | texto | Sí |

**Bloque D — Resultado del avalúo**

| Campo | Tipo | Oblig. |
|---|---|:-:|
| `metodo_terreno` | texto | Sí |
| `valor_m2_terreno` | moneda | Sí |
| `valor_total_terreno` | moneda | Sí |
| `metodo_construccion` | texto | Sí |
| `costo_reposicion_m2` | moneda | Sí |
| `factor_depreciacion` | número | Sí |
| `valor_m2_construccion_depreciado` | moneda | Sí |
| `valor_total_construccion` | moneda | Sí |
| `valor_total_inmueble` | moneda | Sí |

**Bloque E — Datos del avalúo**

| Campo | Tipo | Oblig. |
|---|---|:-:|
| `perito_nombre` | texto | Sí |
| `perito_registro_raa` | texto | Sí |
| `fecha_visita` | fecha | Sí |
| `fecha_informe` | fecha | Sí |
| `vigencia_hasta` | fecha | **Calculado** |
| `informe_pdf` | archivo | Sí |
| `valor_libros_anterior` | moneda | Sí |
| `diferencia_valuacion` | **Calculado** | |

### `PL-11b` — Control de estudio de mercado (soporte del perito)

| Columna | Descripción |
|---|---|
| `numero_oferta` | Consecutivo |
| `direccion` | Ubicación del comparable |
| `descripcion` | Características |
| `area_terreno_m2` / `area_construida_m2` | Áreas |
| `valor_ofertado` | Precio de oferta |
| `factor_negociacion_pct` | Descuento esperado |
| `valor_depurado` | Precio ajustado |
| `valor_m2_homogeneizado` | Valor comparable |
| `incluida_descartada` | Decisión y motivo |
| `fuente` / `link` | Trazabilidad |

---

## 6. Procedimiento

1. Inventariar los predios de la entidad.
2. Solicitar la documentación (`IN-08-01` a `IN-08-08`).
3. Verificar el estado de legalización; los predios sin título se reportan a jurídica.
4. Contratar o asignar al perito avaluador registrado.
5. Coordinar la visita técnica.
6. El perito ejecuta el avalúo (metodología en `RN-08-01` y `RN-08-02`).
7. Recibir el informe y verificar que contenga los mínimos de `RN-08-04`.
8. Cargar `PL-11` y adjuntar el informe.
9. Calcular la diferencia frente al valor en libros.
10. Remitir a consolidación (paso 10).

---

## 7. Reglas de negocio

### `RN-08-01` — Valuación del terreno: comparación de mercado

```
1. Investigar ofertas comparables en la zona de influencia.
2. Depurar por factor de negociación:
       valor_depurado = valor_ofertado × (1 − factor_negociacion)
3. Homogeneizar por área, ubicación, uso y topografía.
4. Descartar valores atípicos.
5. valor_m2_terreno   = promedio de las ofertas homogeneizadas
6. valor_total_terreno = area_terreno_m2 × valor_m2_terreno
```

Debe reportarse la dispersión (media, desviación estándar, coeficiente de variación). Un coeficiente de variación alto indica muestra poco confiable.

### `RN-08-02` — Valuación de la construcción: costo de reposición depreciado

```
1. Estimar el costo de construir hoy una edificación equivalente,
   desagregado por capítulos (preliminares, estructura, mampostería,
   instalaciones hidrosanitarias, eléctricas, acabados).

   costo_reposicion_m2 = Σ capítulos

2. Determinar el factor de depreciación por vetustez y estado
   según las Normas de Tasación de Fitto y Corvini, en función de:
       - vida útil total de la edificación
       - vetustez (edad efectiva)
       - clase de conservación (escala 1 a 5)

3. valor_m2_depreciado = costo_reposicion_m2
                       × factor_fitto_corvini
                       × factor_calidad

4. valor_total_construccion = area_construida_m2 × valor_m2_depreciado
```

**Escala de conservación (Fitto y Corvini):**

| Clase | Estado | Descripción |
|:-:|---|---|
| 1 | Nuevo | Sin necesidad de reparaciones |
| 2 | Bueno | Reparaciones menores de bajo impacto |
| 3 | Regular | Reparaciones sencillas o parciales |
| 4 | Deficiente | Reparaciones estructurales o mayores |
| 5 | Inservible | Sin valor económico por deterioro o inadecuación funcional |

### `RN-08-03` — Valor total

```
valor_total_inmueble = valor_total_terreno + valor_total_construccion
```

Terreno y construcción se registran en **subcuentas contables separadas**: el terreno no se deprecia, la edificación sí.

### `RN-08-04` — Contenido mínimo del informe pericial
La app debe verificar (lista de chequeo) que el informe incluya: información básica del predio, titulación, información del sector, descripción del inmueble, servicios públicos, normas urbanísticas, descripción de la construcción, especificaciones y acabados, metodología aplicada, consideraciones generales, análisis de resultados, certificado de avalúo firmado, plano de localización, registro fotográfico y estudio de mercado.

### `RN-08-05` — Vigencia del avalúo

```
vigencia_hasta = fecha_informe + 1 año
```

Válido siempre que no cambien significativamente las condiciones físicas, urbanísticas o de mercado. La app debe **alertar 60 días antes** del vencimiento.

### `RN-08-06` — Independencia del perito
El informe debe incluir la declaración de que el perito no tiene interés presente ni futuro en la propiedad y que sus conclusiones no están influenciadas por sus honorarios. Sin esa declaración, el avalúo no es admisible.

### `RN-08-07` — Predios sin título
Un predio sin legalizar se registra, se valúa para efectos de control, pero **no se incorpora al patrimonio** hasta que se sanee jurídicamente. Se reporta en la resolución de legalización de terrenos e infraestructura.

### `RN-08-08` — Las áreas son responsabilidad de la entidad
El avalúo se hace sobre las áreas suministradas por el propietario (levantamiento arquitectónico). Debe quedar constancia expresa de la fuente de las áreas.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-08-01` | Existe certificado de tradición y libertad vigente por predio |
| `VAL-08-02` | El informe pericial está firmado y con registro R.A.A del perito |
| `VAL-08-03` | Están registradas las áreas de terreno y construcción |
| `VAL-08-04` | El avalúo está dentro de su vigencia a la fecha de corte |
| `VAL-08-05` | El informe cumple la lista de chequeo de contenido mínimo |
| `VAL-08-06` | Terreno y construcción están valuados por separado |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-08-07` | Avalúo con vigencia inferior a 60 días |
| `VAL-08-08` | Diferencia superior al 100% frente al valor en libros |
| `VAL-08-09` | Predio sin escritura o con estado de legalización "En trámite" |
| `VAL-08-10` | Coeficiente de variación del estudio de mercado superior al 20% |
| `VAL-08-11` | Predio con afectaciones registradas en el certificado de tradición |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-08-01` | **Informe de peritazgo técnico y avalúo comercial** | PDF firmado | Comité / Gerencia | Cumple contenido mínimo `RN-08-04` |
| `EN-08-02` | Certificado de avalúo comercial | PDF | Contador | Valor de terreno, construcción y total, firmado |
| `EN-08-03` | Ficha de inmueble en el sistema | Registro en app | Interno | `PL-11` completo con informe adjunto |
| `EN-08-04` | Cuadro de ajuste de terrenos y edificaciones | Excel | Contador | Diferencia vs. libros por subcuenta |
| `EN-08-05` | Reporte de estado de legalización de predios | Word / PDF | Jurídica / Gerencia | Estado por predio y acciones requeridas |
| `EN-08-06` | Expediente documental del predio | PDF compilado | Jurídica | Tradición, escritura, catastro, planos, avalúo |

---

## 10. Implementación en la app

### 10.1 Entidades

```
Inmueble(id, entidad_id, codigo_inmueble, nombre, tipo_inmueble, direccion,
         municipio, departamento, destinacion, uso_actual,
         matricula_inmobiliaria, codigo_catastral, titulo_adquisicion,
         fecha_adquisicion, afectaciones, estado_legalizacion,
         area_terreno_m2, area_construida_m2, numero_pisos,
         vetustez_anios, vida_util_total_anios, estado_conservacion)

AvaluoInmueble(id, inmueble_id, ejercicio_id, metodo_terreno,
               valor_m2_terreno, valor_total_terreno,
               metodo_construccion, costo_reposicion_m2,
               factor_depreciacion, valor_m2_construccion_depreciado,
               valor_total_construccion, valor_total_inmueble,
               perito_nombre, perito_registro_raa, fecha_visita,
               fecha_informe, vigencia_hasta, informe_url,
               valor_libros_anterior, diferencia_valuacion)

OfertaComparable(id, avaluo_id, direccion, descripcion, area_terreno_m2,
                 area_construida_m2, valor_ofertado, factor_negociacion,
                 valor_depurado, valor_m2_homogeneizado,
                 incluida, motivo_descarte, fuente, link)

DocumentoInmueble(id, inmueble_id, tipo_documento, url, fecha_expedicion,
                  vigencia_hasta)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-08-01` | Registro de inmuebles con expediente documental adjunto |
| `RF-08-02` | Carga de la ficha de avalúo y del informe pericial en PDF |
| `RF-08-03` | Lista de chequeo del contenido mínimo del informe |
| `RF-08-04` | Cálculo automático de la vigencia y alerta 60 días antes del vencimiento |
| `RF-08-05` | Registro del estudio de mercado con cálculo de dispersión |
| `RF-08-06` | Comparación del avalúo contra el valor en libros |
| `RF-08-07` | Tablero de estado de legalización de predios |
| `RF-08-08` | Incorporación del valor a la consolidación del paso 10 |
| `RF-08-09` | Histórico de avalúos por predio (comparación entre vigencias) |
| `RF-08-10` | Generación del oficio de solicitud documental y de los términos de referencia al perito |

### 10.3 Pantallas

1. **Listado de inmuebles** — con semáforo de vigencia de avalúo y legalización.
2. **Ficha del inmueble** — pestañas: identificación, titulación, físico, avalúo, documentos.
3. **Cargue de avalúo** — formulario con lista de chequeo del informe.
4. **Estudio de mercado** — tabla de comparables con estadísticas.
5. **Tablero de legalización** — predios por estado jurídico.

---

## 11. Definición de completado (DoD)

- [ ] Todos los predios registrados con expediente documental.
- [ ] Avalúo vigente cargado por predio, con informe firmado.
- [ ] Validaciones `VAL-08-01` a `VAL-08-06` superadas.
- [ ] Reporte de estado de legalización entregado.
- [ ] Valores incorporados a la consolidación patrimonial.

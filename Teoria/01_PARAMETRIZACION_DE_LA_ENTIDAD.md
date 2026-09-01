# Paso 01 — Parametrización de la Entidad

> **Bloque:** Configuración · **Responsable:** Firma contratista + Contador · **Precondición:** contrato legalizado y acta de inicio firmada

---

## 1. Propósito

Cargar en la aplicación todos los datos que **cambian de un hospital a otro**, de modo que el resto del proceso funcione sin modificar el código. Este paso es lo que convierte la app en una herramienta reutilizable en lugar de un sistema hecho a la medida de una sola entidad.

---

## 2. Alcance

**Incluye:** identificación de la entidad, estructura organizacional (sedes y servicios), catálogo de clases de activo con sus vidas útiles, plan de cuentas, convención de codificación, parámetros de cálculo y fecha de corte.

**No incluye:** carga de bienes (paso 02) ni de saldos contables (paso 04).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Firma contratista (líder de valuación) | X | | | |
| Contador / Subgerente Adtvo. y Financiero | | | X | |
| Gerente E.S.E | | X | | |
| Área de Sistemas de la E.S.E | | | X | |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-01-01` | Datos de identificación de la E.S.E (razón social, NIT, municipio, departamento, nivel de complejidad, nombre del gerente y acto de nombramiento) | Gerencia / Jurídica | Certificación o ficha institucional | Sí | Encabezados de todos los documentos y resoluciones |
| `IN-01-02` | Listado de sedes y su dirección | Recursos Físicos | Documento o listado | Sí | Estructura de ubicaciones |
| `IN-01-03` | Listado de servicios, dependencias y unidades funcionales | Planeación / Calidad | Documento o listado | Sí | Ubicación de cada bien y agrupación de reportes |
| `IN-01-04` | Manual de Políticas Contables vigente | Contador | PDF / Word | Sí | Extraer vida útil por clase, método de depreciación, umbral de capitalización |
| `IN-01-05` | Plan de cuentas / catálogo de subcuentas de PPE en uso | Contador | Excel o listado | Sí | Mapear cada clase de activo a su subcuenta contable |
| `IN-01-06` | Acto de conformación del Comité de Saneamiento Contable | Gerencia / Jurídica | Resolución PDF | Sí | Referencia en actas y resoluciones |
| `IN-01-07` | Convención de codificación de bienes existente (si la hay) | Recursos Físicos | Documento o ejemplo | No | Respetar la nomenclatura ya usada por la entidad |
| `IN-01-08` | Fecha de corte acordada para el ejercicio | Comité / Contador | Acta o correo | Sí | Parámetro central de todos los cálculos |
| `IN-01-09` | Logo institucional y datos de contacto | Comunicaciones | PNG/JPG + texto | No | Membrete de documentos generados |

### 4.1 Modelo de solicitud
Se recomienda un único **oficio de requerimiento de información inicial** dirigido a la Gerencia, listando `IN-01-01` a `IN-01-09` con plazo de entrega. La app debe poder generarlo (ver `EN-01-05`).

---

## 5. Plantillas que se diligencian

### `PL-01` — Parámetros de la entidad
Archivo: `PL-01_parametros_entidad.xlsx` · Hoja única

| Campo | Tipo | Ejemplo | Oblig. |
|---|---|---|:-:|
| razon_social | texto | E.S.E Hospital ... | Sí |
| nit | texto | 890000000-0 | Sí |
| municipio | texto | | Sí |
| departamento | texto | | Sí |
| nivel_complejidad | lista (I, II, III) | I | Sí |
| nombre_gerente | texto | | Sí |
| acto_nombramiento_gerente | texto | Decreto 000 de 20XX | No |
| direccion | texto | | Sí |
| telefono | texto | | No |
| email | texto | | No |
| ruta_logo | archivo | logo.png | No |

### `PL-02` — Catálogo de clases de activo y vida útil
Archivo: `PL-02_clases_vida_util.xlsx` · Hoja única
**Esta es la tabla más importante de la parametrización.**

| Campo | Tipo | Descripción | Oblig. |
|---|---|---|:-:|
| codigo_clase | texto | Identificador corto (ej. `EMC`) | Sí |
| nombre_clase | texto | Equipo Médico Científico | Sí |
| subcuenta_contable | texto | Código de la subcuenta de PPE | Sí |
| vida_util_contable_meses | entero | Para depreciación | Sí |
| vida_util_tecnica_anios | número | Para índice de obsolescencia | Sí |
| requiere_hoja_vida | sí/no | Obliga hoja de vida detallada | Sí |
| requiere_registro_invima | sí/no | Aplica a biomédicos | Sí |
| responsable_tecnico | texto | Perfil que valúa esta clase | Sí |
| activo | sí/no | Permite desactivar clases sin borrarlas | Sí |

**Valores de referencia** (a validar contra el Manual de Políticas Contables de cada entidad):

| Clase | V. útil contable (meses) | V. útil técnica (años) | Responsable técnico |
|---|:-:|:-:|---|
| Equipo médico-científico | 180 | 15 | Ing. biomédica |
| Muebles, enseres y equipo de oficina | 180 | 15 | Recursos Físicos |
| Maquinaria y equipo | 120 | 10 | Recursos Físicos |
| Equipo de transporte terrestre | 120 | 10 | Recursos Físicos |
| Equipo de comunicación y cómputo | 60 | 5 | Ing. de sistemas |
| Equipo de comedor, cocina y despensa | 120 | 10 | Recursos Físicos |
| Edificaciones | 840 (70 años) | 70 | Perito avaluador |
| Terrenos | No deprecia | — | Perito avaluador |

### `PL-02b` — Estructura organizacional
Archivo: `PL-02b_sedes_servicios.xlsx` · Dos hojas

**Hoja `SEDES`:** `codigo_sede`, `nombre_sede`, `direccion`, `municipio`, `activa`
**Hoja `SERVICIOS`:** `codigo_servicio`, `nombre_servicio`, `codigo_sede`, `tipo` (asistencial/administrativo/apoyo), `responsable`, `activo`

---

## 6. Procedimiento

1. Solicitar los insumos `IN-01-01` a `IN-01-09` mediante oficio único.
2. Crear la **Entidad** en la app y cargar `PL-01`.
3. Cargar la estructura organizacional (`PL-02b`): primero sedes, luego servicios.
4. Extraer del Manual de Políticas Contables la vida útil por clase y el método de depreciación; cargar `PL-02`.
5. Mapear cada clase a su subcuenta contable según `IN-01-05`.
6. Definir la convención de codificación del plaqueteo (ver §7.2).
7. Definir los parámetros de cálculo (§7.3).
8. Crear el **Ejercicio de Valuación** con la fecha de corte `IN-01-08`. Al crearlo, la app **congela** una copia de los parámetros.
9. Emitir el acta de parametrización para firma del contador (confirma que las vidas útiles y el método corresponden al Manual).

---

## 7. Reglas de negocio

### `RN-01-01` — Los parámetros se congelan por ejercicio
Al abrir un ejercicio, la app copia los parámetros vigentes. Un cambio posterior en el catálogo **no** altera ejercicios ya abiertos. Esto garantiza reproducibilidad de los cálculos.

### `RN-01-02` — Convención de codificación configurable
El código institucional de un bien se compone por segmentos definidos por la entidad. Estructura recomendada:

```
[PREFIJO_ENTIDAD][CODIGO_SEDE][ABREVIATURA_TIPO][CONSECUTIVO]
```

Ejemplo con prefijo `HSV`, sede `01`, tipo `AGM` (agitador de Mazzini), consecutivo `01` → `HSV01AGM01`

La app debe permitir:
- Definir qué segmentos se usan y en qué orden.
- Longitud y relleno con ceros del consecutivo.
- Un catálogo de abreviaturas por tipo de bien.
- Generación automática del siguiente consecutivo disponible.

### `RN-01-03` — Vida útil contable y técnica son independientes
Se almacenan en campos distintos. La depreciación usa la contable; la obsolescencia, la técnica. Si la entidad usa el mismo valor, se cargan iguales.

### `RN-01-04` — Parámetros de cálculo obligatorios

| Parámetro | Valores posibles | Recomendado | Impacto |
|---|---|---|---|
| `metodo_depreciacion` | línea recta | línea recta | Fórmula del paso 06 |
| `metodo_conteo_meses` | mes_completo / dias_exactos / fraccion_anual | a definir con el contador | Cuadre con contabilidad |
| `deprecia_mes_adquisicion` | sí / no | sí | Meses transcurridos |
| `valor_residual_pct` | 0–100 | 0 | Base depreciable |
| `moneda` | COP | COP | Formato |
| `decimales_calculo` | 0–4 | 2 | Redondeo |
| `umbral_capitalizacion` | monto | según manual | Qué es activo vs. gasto |

### `RN-01-05` — Umbrales del semáforo de obsolescencia
Configurables por entidad. Valores por defecto:

| Nivel | Rango del índice | Interpretación |
|---|---|---|
| Verde | 0,00 – 0,50 | Vida útil sana |
| Amarillo | 0,51 – 0,80 | En envejecimiento |
| Naranja | 0,81 – 0,99 | Próximo al fin de vida útil |
| Rojo | ≥ 1,00 | Vida útil agotada |

### `RN-01-06` — Fecha de corte única por ejercicio
No pueden coexistir dos fechas de corte en el mismo ejercicio. Cambiarla obliga a recalcular todo y debe quedar registrado en la bitácora.

---

## 8. Validaciones

**Bloqueantes** (impiden avanzar al paso 02):

| Código | Validación |
|---|---|
| `VAL-01-01` | La entidad tiene razón social y NIT |
| `VAL-01-02` | Existe al menos una sede activa |
| `VAL-01-03` | Existe al menos un servicio activo |
| `VAL-01-04` | Toda clase activa tiene vida útil contable > 0 (salvo terrenos) |
| `VAL-01-05` | Toda clase activa está mapeada a una subcuenta contable |
| `VAL-01-06` | La fecha de corte está definida y no es futura |
| `VAL-01-07` | El método de conteo de meses está seleccionado |

**Advertencias** (permiten avanzar):

| Código | Advertencia |
|---|---|
| `VAL-01-08` | No se cargó el Manual de Políticas Contables como soporte |
| `VAL-01-09` | Alguna clase tiene vida útil técnica distinta de la contable (verificar intencionalidad) |
| `VAL-01-10` | No se definió convención de codificación (se usará la genérica) |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-01-01` | Ficha de parametrización de la entidad | PDF | Gerencia / Comité | Refleja `PL-01` completo |
| `EN-01-02` | Catálogo de clases y vidas útiles aprobado | PDF / Excel | Contador | Firmado por el contador confirmando correspondencia con el Manual |
| `EN-01-03` | Estructura de sedes y servicios | Excel | Recursos Físicos | Cubre el 100% de las áreas físicas |
| `EN-01-04` | Ejercicio de valuación creado con fecha de corte | Registro en app | Interno | Estado "Abierto" |
| `EN-01-05` | Oficio de requerimiento de información inicial | Word / PDF | Gerencia | Lista completa de insumos con plazos |
| `EN-01-06` | Acta de parametrización | Word / PDF | Comité | Firmada por contratista y contador |

---

## 10. Implementación en la app

### 10.1 Entidades

```
Entidad(id, razon_social, nit, municipio, departamento, nivel_complejidad,
        nombre_gerente, direccion, telefono, email, logo_url)

Sede(id, entidad_id, codigo, nombre, direccion, activa)

Servicio(id, sede_id, codigo, nombre, tipo, responsable, activo)

ClaseActivo(id, entidad_id, codigo, nombre, subcuenta_contable,
            vida_util_contable_meses, vida_util_tecnica_anios,
            requiere_hoja_vida, requiere_invima, responsable_tecnico, activo)

ParametroCalculo(id, entidad_id, clave, valor, tipo_dato)

ConvencionCodigo(id, entidad_id, segmentos_json, longitud_consecutivo)

AbreviaturaTipo(id, entidad_id, abreviatura, descripcion)

Ejercicio(id, entidad_id, fecha_corte, estado, parametros_congelados_json,
          creado_por, creado_en, cerrado_en)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-01-01` | Crear, editar y desactivar entidades, sedes, servicios y clases de activo |
| `RF-01-02` | Importar `PL-01`, `PL-02` y `PL-02b` desde Excel con validación previa |
| `RF-01-03` | Precargar un catálogo de clases sugerido que el usuario pueda ajustar |
| `RF-01-04` | Configurar la convención de codificación y previsualizar un código de ejemplo |
| `RF-01-05` | Crear un ejercicio congelando los parámetros vigentes |
| `RF-01-06` | Impedir el avance al paso 02 si hay validaciones bloqueantes pendientes |
| `RF-01-07` | Generar el oficio de requerimiento de información inicial |
| `RF-01-08` | Registrar en bitácora todo cambio de parámetros con usuario y fecha |
| `RF-01-09` | Clonar la parametrización de una entidad a otra (acelera nuevos contratos) |

### 10.3 Pantallas

1. **Asistente de nueva entidad** — formulario por pasos con barra de progreso.
2. **Catálogo de clases de activo** — tabla editable con importación Excel.
3. **Árbol de sedes y servicios** — vista jerárquica con arrastrar y soltar.
4. **Parámetros de cálculo** — formulario con explicación de cada opción.
5. **Panel del ejercicio** — semáforo de validaciones bloqueantes.

---

## 11. Definición de completado (DoD)

- [ ] `PL-01`, `PL-02` y `PL-02b` cargados y sin errores.
- [ ] Todas las validaciones bloqueantes `VAL-01-01` a `VAL-01-07` superadas.
- [ ] Acta de parametrización (`EN-01-06`) firmada por el contador.
- [ ] Ejercicio creado en estado "Abierto" con parámetros congelados.

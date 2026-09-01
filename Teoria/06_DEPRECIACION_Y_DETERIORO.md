# Paso 06 — Depreciación Acumulada y Deterioro

> **Bloque:** III — Cálculo · **Responsable:** App (cálculo) + Contador (validación) · **Precondición:** Pasos 03 y 04 cerrados

---

## 1. Propósito

Recalcular, con criterio uniforme y trazable, la depreciación acumulada de cada bien a la fecha de corte, determinar el saldo por depreciar y reconocer el deterioro cuando corresponda. Es el paso que produce los **saldos contables corregidos**.

---

## 2. Alcance

**Incluye:** todos los bienes depreciables con datos económicos completos, y el reconocimiento de deterioro por pérdida de valor.

**No incluye:** terrenos (no se deprecian) ni bienes ya totalmente depreciados y dados de baja en vigencias anteriores.

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Aplicación (motor de cálculo) | X | | | |
| Contador de la E.S.E | | X | X | |
| Coordinador de valuación | X | | | |
| Comité de Saneamiento | | | | X |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-06-01` | Costo de adquisición y adiciones por bien | Paso 03 (interno) | Dato del sistema | Sí | Base depreciable |
| `IN-06-02` | Fecha de adquisición / puesta en servicio | Paso 03 (interno) | Dato del sistema | Sí | Inicio de la depreciación |
| `IN-06-03` | Vida útil contable por clase | Paso 01 (interno) | Parámetro | Sí | Divisor |
| `IN-06-04` | **Método de conteo de meses definido por el contador** | Contador | Acta / correo formal | Sí | Determina el cuadre con contabilidad |
| `IN-06-05` | Política de valor residual | Manual de Políticas Contables | PDF | Sí | Base depreciable |
| `IN-06-06` | Depreciación acumulada registrada en libros | Paso 04 (interno) | Dato del sistema | Sí | Comparación y ajuste |
| `IN-06-07` | Criterios de deterioro de la entidad | Manual de Políticas Contables | PDF | No | Reconocimiento de deterioro |
| `IN-06-08` | Conceptos técnicos de pérdida de valor | Especialistas | Documento | No | Soporte del deterioro |

### 4.1 Modelo de solicitud
**Acta de definición del método de depreciación**, firmada por el contador, que fije expresamente: método (línea recta), conteo de meses, si se deprecia el mes de adquisición, valor residual y decimales. Sin esta acta el cálculo no es defendible ante auditoría.

---

## 5. Plantillas que se diligencian

### `PL-09` — Cálculo de depreciación y deterioro
Archivo: `PL-09_depreciacion.xlsx` · Una hoja por clase + hoja consolidada · Generado por la app

| # | Columna | Origen | Descripción |
|:-:|---|---|---|
| 1 | `codigo_institucional` | Paso 02 | |
| 2 | `placa` | Paso 02 | |
| 3 | `descripcion_bien` | Paso 02 | |
| 4 | `clase_activo` | Paso 02 | |
| 5 | `subcuenta_contable` | Paso 01 | |
| 6 | `servicio_ubicacion` | Paso 02 | |
| 7 | `valor_adquisicion` | Paso 03 | Costo histórico |
| 8 | `adiciones_mejoras` | Paso 03 | Capitalizables |
| 9 | `saldo_final_ajustado` | **Calculado** | (7) + (8) |
| 10 | `valor_residual` | **Calculado** | Según política |
| 11 | `base_depreciable` | **Calculado** | (9) − (10) |
| 12 | `fecha_adquisicion` | Paso 03 | |
| 13 | `fecha_inicio_depreciacion` | **Calculado** | Ver `RN-06-02` |
| 14 | `vida_util_meses` | Paso 01 | |
| 15 | `depreciacion_mensual` | **Calculado** | (11) / (14) |
| 16 | `meses_transcurridos` | **Calculado** | Según método |
| 17 | `depreciacion_acumulada` | **Calculado** | Ver `RN-06-01` |
| 18 | `saldo_por_depreciar` | **Calculado** | (9) − (17) − (20) |
| 19 | `porcentaje_depreciado` | **Calculado** | (17) / (11) |
| 20 | `deterioro` | Captura | Ver `RN-06-06` |
| 21 | `valor_neto_libros` | **Calculado** | (9) − (17) − (20) |
| 22 | `depreciacion_libros` | Paso 04 | Registrada |
| 23 | `diferencia_depreciacion` | **Calculado** | (17) − (22) |
| 24 | `totalmente_depreciado` | **Calculado** | Sí/No |

### `PL-09b` — Registro de deterioro
Archivo: `PL-09b_deterioro.xlsx`

| Columna | Tipo | Oblig. | Descripción |
|---|---|:-:|---|
| `codigo_institucional` | texto | Sí | |
| `valor_neto_antes` | moneda | Sí | Antes del deterioro |
| `valor_recuperable` | moneda | Sí | Estimado por el especialista |
| `deterioro_reconocido` | moneda | **Calculado** | Ver `RN-06-06` |
| `indicio_deterioro` | lista | Sí | Daño físico / Obsolescencia / Desuso / Cambio normativo |
| `justificacion` | texto | Sí | |
| `especialista` | texto | Sí | |
| `soporte` | archivo | Sí | |

---

## 6. Procedimiento

1. Obtener el acta de definición del método (`IN-06-04`).
2. Cargar los parámetros de cálculo en el ejercicio.
3. Verificar que todos los bienes tengan costo y fecha (los incompletos se excluyen y reportan).
4. Ejecutar el cálculo masivo de depreciación (`RN-06-01`).
5. Aplicar el tope de depreciación (`RN-06-03`).
6. Identificar bienes con indicios de deterioro y registrar `PL-09b`.
7. Calcular el valor neto en libros.
8. Comparar contra la depreciación registrada (paso 04) y cuantificar el ajuste.
9. Consolidar por subcuenta.
10. Someter a validación del contador.

---

## 7. Reglas de negocio

### `RN-06-01` — Fórmulas de depreciación (línea recta)

```
saldo_final_ajustado   = valor_adquisicion + adiciones_mejoras

valor_residual         = saldo_final_ajustado × (valor_residual_pct / 100)

base_depreciable       = saldo_final_ajustado − valor_residual

depreciacion_mensual   = base_depreciable / vida_util_meses

meses_transcurridos    = f(fecha_inicio_depreciacion, fecha_corte, metodo_conteo)

depreciacion_acumulada = MIN(depreciacion_mensual × meses_transcurridos,
                             base_depreciable)

saldo_por_depreciar    = saldo_final_ajustado − depreciacion_acumulada − deterioro
```

**Ejemplo de verificación:**
Costo 23.739.280 · sin adiciones · residual 0% · vida útil 180 meses · adquirido 27/04/2018 · corte 30/06/2025.

```
base_depreciable       = 23.739.280
depreciacion_mensual   = 23.739.280 / 180 = 131.884,89
meses_transcurridos    = 87,4  (según método configurado)
depreciacion_acumulada = 11.522.343,13
saldo_por_depreciar    = 12.216.936,87
```

### `RN-06-02` — Fecha de inicio de la depreciación

| Caso | Fecha de inicio |
|---|---|
| Regla general | `fecha_adquisicion` |
| Si la política lo establece y existe el dato | `fecha_puesta_servicio` |
| Si `deprecia_mes_adquisicion = No` | Primer día del mes siguiente a la adquisición |

### `RN-06-03` — Tope de depreciación
La depreciación acumulada **nunca** puede superar la base depreciable. Al alcanzarla, el bien queda `totalmente_depreciado = Sí` y su saldo por depreciar es el valor residual (o cero).

### `RN-06-04` — Método de conteo de meses (parámetro crítico)

| Método | Cálculo | Cuándo usarlo |
|---|---|---|
| `mes_completo` | Diferencia en meses calendario enteros | Cuando contabilidad deprecia por mes cerrado |
| `dias_exactos` | `(días transcurridos / 365,25) × 12` | Mayor precisión, requiere que contabilidad lo replique |
| `fraccion_anual` | `((fecha_corte − inicio)/365,25) × 12` | Equivalente al anterior, expresado en años |

> **Advertencia de implementación:** los datos históricos de referencia mostraron inconsistencias entre métodos. La app debe aplicar **uno solo**, definido en el acta `IN-06-04`, y mostrar siempre cuál usó en el encabezado del reporte.

### `RN-06-05` — Bienes sin datos económicos
No se calculan. Se listan aparte como *pendientes de completar* y **no** suman a los totales de la subcuenta. Reportarlos con valor cero distorsionaría el balance.

### `RN-06-06` — Reconocimiento del deterioro

```
deterioro_reconocido = MAX(0, valor_neto_antes − valor_recuperable)
```

Solo se reconoce cuando existe un **indicio objetivo** documentado: daño físico, obsolescencia técnica, desuso prolongado o cambio normativo que impida su uso. Requiere concepto del especialista con soporte. El deterioro no revierte automáticamente.

### `RN-06-07` — Terrenos no se deprecian
Las clases marcadas como no depreciables se excluyen del cálculo pero sí participan en la consolidación patrimonial.

### `RN-06-08` — Redondeo
Se calcula con la precisión configurada (`decimales_calculo`) y se redondea **solo en la presentación**, nunca en cálculos intermedios, para evitar acumulación de error en los totales.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-06-01` | Existe acta de definición del método de depreciación |
| `VAL-06-02` | Todo bien calculado tiene costo > 0 y fecha de adquisición válida |
| `VAL-06-03` | Ninguna depreciación acumulada supera su base depreciable |
| `VAL-06-04` | Ningún saldo por depreciar es negativo |
| `VAL-06-05` | Todo deterioro reconocido tiene indicio, justificación y soporte |
| `VAL-06-06` | Los totales por subcuenta cuadran con la suma del detalle |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-06-07` | Diferencia superior al 15% entre depreciación recalculada y de libros |
| `VAL-06-08` | Bien totalmente depreciado pero en estado "Bueno" y operativo |
| `VAL-06-09` | Más del 5% de bienes excluidos por datos incompletos |
| `VAL-06-10` | Deterioro reconocido superior al 50% del valor neto |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-06-01` | **Listado depurado de activos depreciables** | Excel + PDF | Contador / Comité | `PL-09` completo, cuadrado por subcuenta |
| `EN-06-02` | Cuadro de ajuste de depreciación acumulada por subcuenta | Excel | Contador | Diferencia libros vs. recalculada cuantificada |
| `EN-06-03` | Registro de deterioro reconocido | Excel + PDF | Comité | `PL-09b` con soporte en el 100% de casos |
| `EN-06-04` | Acta de definición del método de depreciación | Word / PDF | Comité / auditoría | Firmada por el contador |
| `EN-06-05` | Listado de bienes excluidos por datos incompletos | Excel | Contabilidad | Con la gestión realizada |
| `EN-06-06` | Informe de saldos ajustados de PPE | Word / PDF | Comité | Insumo directo de las resoluciones |

---

## 10. Implementación en la app

### 10.1 Entidades

```
CalculoDepreciacion(id, ejercicio_id, bien_id, fecha_corte,
                    valor_adquisicion, adiciones_mejoras, saldo_final_ajustado,
                    valor_residual, base_depreciable, fecha_inicio_depreciacion,
                    vida_util_meses, depreciacion_mensual, meses_transcurridos,
                    metodo_conteo_aplicado, depreciacion_acumulada,
                    deterioro, saldo_por_depreciar, valor_neto_libros,
                    totalmente_depreciado, calculado_en)

Deterioro(id, bien_id, ejercicio_id, valor_neto_antes, valor_recuperable,
          deterioro_reconocido, indicio, justificacion, especialista,
          soporte_url, reconocido_en)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-06-01` | Motor de cálculo de depreciación con método de conteo configurable |
| `RF-06-02` | Cálculo masivo con reporte de excluidos por datos incompletos |
| `RF-06-03` | Aplicación automática del tope de depreciación |
| `RF-06-04` | Registro de deterioro con soporte obligatorio |
| `RF-06-05` | Comparación automática contra la depreciación de libros |
| `RF-06-06` | Consolidación por subcuenta con verificación de cuadre |
| `RF-06-07` | Simulador: recalcular con otro método para comparar impacto |
| `RF-06-08` | Reporte que declara en su encabezado el método aplicado |
| `RF-06-09` | Congelar los cálculos al cerrar el ejercicio (inmutables) |

### 10.3 Pantallas

1. **Configuración del cálculo** — método, residual, decimales, con explicación de cada opción.
2. **Ejecución del cálculo** — barra de progreso y resumen de resultados y excluidos.
3. **Listado de depreciación** — filtros por clase, subcuenta y servicio.
4. **Registro de deterioro** — formulario con soporte.
5. **Comparador libros vs. recálculo** — por subcuenta, con semáforo de desviación.

---

## 11. Definición de completado (DoD)

- [ ] Acta de método de depreciación firmada.
- [ ] Depreciación calculada para el 100% de bienes con datos completos.
- [ ] Validaciones `VAL-06-01` a `VAL-06-06` superadas.
- [ ] Deterioros soportados individualmente.
- [ ] Listado depurado (`EN-06-01`) entregado y validado por el contador.

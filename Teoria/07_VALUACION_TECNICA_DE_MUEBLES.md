# Paso 07 — Valuación Técnica de Bienes Muebles

> **Bloque:** III — Cálculo · **Responsable:** Especialista técnico por clase · **Precondición:** Pasos 05 y 06 cerrados

---

## 1. Propósito

Determinar el **valor razonable actual** de cada bien mueble, contrastando el saldo contable por depreciar con su valor real según estado, vida útil restante y condiciones de mercado. Es el resultado que da nombre al contrato: la valuación propiamente dicha.

---

## 2. Alcance

**Incluye:** todos los bienes muebles del ejercicio, agrupados por clase y asignados al especialista competente.

**No incluye:** inmuebles (paso 08).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Ingeniera biomédica (equipo médico-científico) | X | | | |
| Ingeniero de sistemas (cómputo y comunicaciones) | X | | | |
| Recursos Físicos (maquinaria, muebles, cocina) | X | | | |
| Perito evaluador (bienes de alto valor / transporte) | X | | | |
| Contador | | | X | |
| Coordinador de valuación | | X | | |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-07-01` | Saldo por depreciar por bien | Paso 06 (interno) | Dato del sistema | Sí | Referencia contable de partida |
| `IN-07-02` | Índice de obsolescencia y estado | Pasos 02 y 05 (interno) | Dato del sistema | Sí | Ajuste técnico |
| `IN-07-03` | **Cotizaciones de equipos equivalentes nuevos** | Proveedores del sector | Cotización PDF | Sí | Referencia de mercado |
| `IN-07-04` | Precios de referencia de mercado secundario | Proveedores / portales especializados | Captura o listado | No | Bienes usados |
| `IN-07-05` | Contratos de dotación recientes de la E.S.E | Contratación | PDF | No | Precios reales pagados |
| `IN-07-06` | Concepto técnico de funcionalidad por equipo | Especialistas | Documento | Sí | Sustento del ajuste |
| `IN-07-07` | Historial de mantenimiento y costos de reparación | Paso 03 (interno) | Dato del sistema | Sí | Viabilidad económica |
| `IN-07-08` | Índices de actualización de precios (IPC / ICCP) | DANE | Público | No | Actualización de valores históricos |

### 4.1 Modelo de solicitud
Solicitud de cotización dirigida a mínimo **tres proveedores** por familia de equipos relevantes, describiendo especificaciones equivalentes. Las cotizaciones son el soporte de mercado del avalúo y deben archivarse.

---

## 5. Plantillas que se diligencian

### `PL-10` — Valuación técnica de bienes muebles
Archivo: `PL-10_valuacion_muebles.xlsx` · Una hoja por clase

| # | Columna | Origen | Descripción |
|:-:|---|---|---|
| 1 | `codigo_institucional` | Paso 02 | |
| 2 | `placa` | Paso 02 | |
| 3 | `descripcion_bien` | Paso 02 | |
| 4 | `clase_activo` | Paso 02 | |
| 5 | `marca` / `modelo` / `serie` | Paso 02 | Identificación técnica |
| 6 | `servicio_ubicacion` | Paso 02 | |
| 7 | `estado_actual` | Paso 02 | Bueno/Regular/Malo/Inservible |
| 8 | `indice_obsolescencia` | Paso 05 | |
| 9 | `saldo_final_ajustado` | Paso 06 | Costo + adiciones |
| 10 | `depreciacion_acumulada` | Paso 06 | |
| 11 | `saldo_por_depreciar` | Paso 06 | **Referencia contable** |
| 12 | `metodo_valuacion` | Captura | Ver `RN-07-02` |
| 13 | `valor_equipo_nuevo_equivalente` | Captura | De `IN-07-03` |
| 14 | `factor_estado` | Captura | Ver `RN-07-03` |
| 15 | `factor_vida_restante` | **Calculado** | `1 − índice` (mínimo 0) |
| 16 | `valor_avaluo_calculado` | **Calculado** | Ver `RN-07-04` |
| 17 | `valor_avaluo_final` | Captura | Decisión del especialista |
| 18 | `diferencia_vs_libros` | **Calculado** | (17) − (11) |
| 19 | `tipo_ajuste` | **Calculado** | Valorización / Desvalorización / Sin cambio |
| 20 | `justificacion_tecnica` | Captura | **Obligatoria** |
| 21 | `especialista` | Captura | Quién valúa |
| 22 | `fecha_valuacion` | Automático | |
| 23 | `soporte_mercado` | archivo | Cotización o referencia |

### `PL-10b` — Registro de referencias de mercado
Archivo: `PL-10b_referencias_mercado.xlsx`

| Columna | Tipo | Oblig. |
|---|---|:-:|
| `familia_equipo` | texto | Sí |
| `especificacion_equivalente` | texto | Sí |
| `proveedor` | texto | Sí |
| `valor_cotizado` | moneda | Sí |
| `fecha_cotizacion` | fecha | Sí |
| `vigencia_cotizacion` | fecha | No |
| `soporte` | archivo | Sí |

---

## 6. Procedimiento

1. Agrupar los bienes por clase y asignarlos al especialista competente.
2. Solicitar cotizaciones (`IN-07-03`) por familia de equipos y cargar `PL-10b`.
3. Para cada bien, seleccionar el método de valuación aplicable (`RN-07-02`).
4. Calcular el valor sugerido con la fórmula del método elegido.
5. El especialista revisa, ajusta si corresponde y registra `valor_avaluo_final` con justificación.
6. Registrar el soporte de mercado.
7. Calcular la diferencia frente al valor en libros y clasificar el ajuste.
8. Consolidar por clase y subcuenta.
9. Elaborar el informe de valuación integral.

---

## 7. Reglas de negocio

### `RN-07-01` — El saldo por depreciar es referencia, no resultado
La depreciación en línea recta es una convención contable, no una medición de valor. El avalúo parte de ella pero **no está obligado a coincidir**. La diferencia es precisamente el ajuste que busca el saneamiento.

### `RN-07-02` — Métodos de valuación admitidos

| Método | Fórmula base | Cuándo aplicarlo |
|---|---|---|
| `COSTO_REPOSICION_DEPRECIADO` | Valor nuevo equivalente × factor vida restante × factor estado | Método por defecto para equipos con referencia de mercado |
| `COMPARACION_MERCADO` | Precio observado de bienes usados equivalentes | Cuando existe mercado secundario activo (vehículos, cómputo) |
| `VALOR_EN_LIBROS` | Saldo por depreciar | Cuando no hay referencia y el bien es funcional y reciente |
| `VALOR_RESIDUAL_CHATARRA` | Valor de salvamento estimado | Bienes inservibles o candidatos a baja |
| `VALOR_CERO` | 0 | Bienes no encontrados o sin utilidad ni salvamento |

### `RN-07-03` — Tabla de factor de estado (parametrizable)

| Estado | Factor sugerido | Descripción |
|---|:-:|---|
| Bueno | 1,00 | Funciona sin observaciones |
| Regular | 0,75 | Funciona con reparaciones menores |
| Malo | 0,40 | Requiere reparación mayor |
| Inservible | 0,05 | Solo valor de salvamento |

### `RN-07-04` — Fórmula del costo de reposición depreciado

```
factor_vida_restante = MAX(0, 1 − indice_obsolescencia)

valor_avaluo_calculado = valor_equipo_nuevo_equivalente
                       × factor_vida_restante
                       × factor_estado
```

**Ejemplo:** equipo nuevo equivalente $10.000.000 · índice 0,6899 · estado Bueno (1,00)

```
factor_vida_restante = 1 − 0,6899 = 0,3101
valor_avaluo         = 10.000.000 × 0,3101 × 1,00 = $3.101.000
```

> **Corregido el 2026-09-01.** El ejemplo partía del índice 0,6922 del caso erróneo de `ANEXO_C`
> §2.3. Con el índice correcto (0,6899) el avalúo sugerido es $3.101.000. Ver
> `CORRECCIONES.md` § C-03.

### `RN-07-05` — El valor final siempre lo decide una persona
La app **sugiere** `valor_avaluo_calculado`; el especialista registra `valor_avaluo_final`. Si difieren, la justificación técnica es obligatoria. Nunca se publica un avalúo sin responsable identificado.

### `RN-07-06` — Justificación obligatoria universal
Todo bien debe tener `justificacion_tecnica`, aun cuando el valor final coincida con el sugerido. Es el soporte ante auditoría.

### `RN-07-07` — Clasificación del ajuste

```
diferencia = valor_avaluo_final − valor_neto_libros

diferencia > 0  → VALORIZACION      (mayor valor del activo)
diferencia < 0  → DESVALORIZACION   (menor valor / deterioro)
diferencia = 0  → SIN_CAMBIO
```

> **Corregido el 2026-09-01.** La base de comparación era `saldo_por_depreciar`, que **no** descuenta
> el deterioro ya reconocido en el paso 06. Comparar contra esa cifra vuelve a restar el deterioro
> dentro de la desvalorización, y puede llegar a **invertir el signo del ajuste** sobre un mismo bien.
> El ajuste que ordena la resolución lleva el activo desde la cifra que figura en el balance —el
> valor neto en libros— hasta su valor razonable. Configurable con `base_comparacion_avaluo`
> (`ANEXO_B` §2.5) para entidades cuya política contable exija lo contrario. Ver
> `CORRECCIONES.md` § C-04 y `ANEXO_C` §5.4.

### `RN-07-08` — Bienes propuestos para baja
Los candidatos del paso 05 se valúan por `VALOR_RESIDUAL_CHATARRA` o `VALOR_CERO`, según exista o no valor de salvamento.

### `RN-07-09` — Vigencia de las referencias de mercado
Una cotización con más de 12 meses no sirve como soporte. La app debe alertar y exigir actualización.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-07-01` | El 100% de bienes activos tiene `valor_avaluo_final` |
| `VAL-07-02` | El 100% tiene `justificacion_tecnica` y especialista identificado |
| `VAL-07-03` | Ningún `valor_avaluo_final` es negativo |
| `VAL-07-04` | Todo método distinto de `VALOR_EN_LIBROS` tiene soporte de mercado |
| `VAL-07-05` | Los totales por subcuenta cuadran con la suma del detalle |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-07-06` | Diferencia superior al 50% entre avalúo y valor en libros |
| `VAL-07-07` | Bien en estado "Bueno" valuado en cero |
| `VAL-07-08` | Bien inservible con avalúo superior al 20% del valor nuevo |
| `VAL-07-09` | Referencia de mercado con antigüedad mayor a 12 meses |
| `VAL-07-10` | Bienes idénticos con avalúos muy distintos (revisar coherencia) |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-07-01` | **Informe de valuación integral de bienes muebles** | Word / PDF | Comité / Gerencia | Metodología, resultados por clase y conclusiones |
| `EN-07-02` | Inventario valorizado por clase | Excel | Contador / Comité | `PL-10` completo por clase |
| `EN-07-03` | Cuadro comparativo libros vs. avalúo | Excel + PDF | Contador | Diferencia cuantificada por subcuenta |
| `EN-07-04` | Expediente de referencias de mercado | PDF (compilado) | Comité / auditoría | Cotizaciones vigentes archivadas |
| `EN-07-05` | Certificación técnica de valuación por clase | Word / PDF | Comité | Firmada por el especialista competente |
| `EN-07-06` | Listado de bienes con mayor valorización / desvalorización | Excel | Gerencia | Top de impacto patrimonial |

---

## 10. Implementación en la app

### 10.1 Entidades

```
ValuacionMueble(id, ejercicio_id, bien_id, metodo_valuacion,
                valor_equipo_nuevo_equivalente, factor_estado,
                factor_vida_restante, valor_avaluo_calculado,
                valor_avaluo_final, diferencia_vs_libros, tipo_ajuste,
                justificacion_tecnica, especialista_id, fecha_valuacion,
                soporte_mercado_url, estado_aprobacion)

ReferenciaMercado(id, ejercicio_id, familia_equipo, especificacion,
                  proveedor, valor_cotizado, fecha_cotizacion,
                  vigencia, soporte_url)

FactorEstado(id, entidad_id, estado, factor)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-07-01` | Cálculo del valor sugerido según el método seleccionado |
| `RF-07-02` | Valuación masiva por familia de equipos (aplicar a selección) |
| `RF-07-03` | Campo de valor final editable con justificación obligatoria |
| `RF-07-04` | Biblioteca de referencias de mercado reutilizable con control de vigencia |
| `RF-07-05` | Asignación de bienes a especialistas por clase (bandeja de trabajo) |
| `RF-07-06` | Detección de avalúos incoherentes entre bienes idénticos |
| `RF-07-07` | Comparador libros vs. avalúo por subcuenta |
| `RF-07-08` | Generación del informe de valuación integral |
| `RF-07-09` | Bitácora de cambios del valor de avalúo (quién, cuándo, valor anterior) |
| `RF-07-10` | Firma electrónica o registro de aprobación del especialista |

### 10.3 Pantallas

1. **Bandeja del especialista** — bienes asignados pendientes de valuar.
2. **Ficha de valuación** — datos, cálculo sugerido, campo final y justificación.
3. **Valuación masiva** — selección múltiple con aplicación de método y factor.
4. **Biblioteca de referencias de mercado** — cotizaciones con vigencia.
5. **Tablero de impacto** — valorización/desvalorización por subcuenta.

---

## 11. Definición de completado (DoD)

- [ ] 100% de bienes valuados con justificación y especialista identificado.
- [ ] Validaciones `VAL-07-01` a `VAL-07-05` superadas.
- [ ] Referencias de mercado vigentes archivadas.
- [ ] Informe de valuación integral (`EN-07-01`) entregado.
- [ ] Certificaciones técnicas por clase firmadas.

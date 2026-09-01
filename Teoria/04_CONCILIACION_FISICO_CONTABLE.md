# Paso 04 — Conciliación Físico vs. Contable

> **Bloque:** II — Conciliación · **Responsable:** Contador + Coordinador de valuación · **Precondición:** Pasos 02 y 03 cerrados

---

## 1. Propósito

Contrastar el inventario físico levantado contra los saldos registrados en libros a la fecha de corte, identificar y clasificar todas las diferencias, y producir el **diagnóstico inicial** que justifica los ajustes posteriores.

---

## 2. Alcance

**Incluye:** conciliación de la cuenta de PPE por subcuenta, en valor y en cantidad, más la conciliación de la depreciación acumulada registrada.

**No incluye:** conciliación de inventarios de almacén (consumibles), cartera ni pasivos.

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Contador de la E.S.E | X | | | |
| Coordinador de valuación (contratista) | X | | | |
| Subgerente Administrativo y Financiero | | X | | |
| Recursos Físicos / Almacén | | | X | |
| Comité de Saneamiento | | | | X |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-04-01` | Balance de prueba a la fecha de corte | Contador | Excel / PDF | Sí | Saldos de las subcuentas de PPE |
| `IN-04-02` | Libro auxiliar de PPE por subcuenta | Contador | Excel | Sí | Detalle de movimientos |
| `IN-04-03` | Libro mayor de PPE | Contador | Excel / PDF | Sí | Cuadre de tercer nivel |
| `IN-04-04` | Saldos de depreciación acumulada por subcuenta | Contador | Excel | Sí | Comparar con el recálculo |
| `IN-04-05` | Saldos de deterioro registrados | Contador | Excel | No | Ajuste de deterioro |
| `IN-04-06` | Listado contable de activos depreciables (activo por activo) | Contador | Excel | Sí | Cruce individual con el físico |
| `IN-04-07` | Estados financieros de la vigencia anterior | Contador | PDF | Sí | Saldo de apertura |
| `IN-04-08` | Notas a los estados financieros | Contador | PDF | No | Contexto de partidas atípicas |
| `IN-04-09` | Actas de bajas anteriores no registradas | Almacén / Jurídica | PDF | No | Explicar faltantes |

### 4.1 Modelo de solicitud
Oficio dirigido al Contador y al Subgerente Administrativo y Financiero, solicitando `IN-04-01` a `IN-04-09` **con corte exacto a la fecha del ejercicio** y en formato editable (Excel), no solo PDF.

---

## 5. Plantillas que se diligencian

### `PL-06` — Importación de saldos contables
Archivo: `PL-06_saldos_contables.xlsx` · Dos hojas

**Hoja `SALDOS_SUBCUENTA`:**

| Columna | Tipo | Oblig. | Descripción |
|---|---|:-:|---|
| `subcuenta` | texto | Sí | Código contable |
| `nombre_subcuenta` | texto | Sí | |
| `saldo_inicial` | moneda | Sí | Al cierre de la vigencia anterior |
| `movimientos_debito` | moneda | No | Del período |
| `movimientos_credito` | moneda | No | Del período |
| `saldo_libros_corte` | moneda | Sí | A la fecha de corte |
| `depreciacion_acum_libros` | moneda | Sí | |
| `deterioro_libros` | moneda | No | |

**Hoja `DETALLE_ACTIVOS`:**

| Columna | Tipo | Oblig. |
|---|---|:-:|
| `identificador_contable` | texto | Sí |
| `descripcion_contable` | texto | Sí |
| `subcuenta` | texto | Sí |
| `fecha_adquisicion_libros` | fecha | No |
| `valor_libros` | moneda | Sí |
| `depreciacion_acum_libros` | moneda | No |

### `PL-07` — Matriz de conciliación
Archivo: `PL-07_conciliacion.xlsx` · Generado por la app, revisado por el contador

| Columna | Origen | Descripción |
|---|---|---|
| `subcuenta` | `PL-06` | |
| `cantidad_libros` | `PL-06` | Ítems en contabilidad |
| `cantidad_fisico` | Paso 02 | Ítems contados |
| `valor_libros` | `PL-06` | |
| `valor_fisico` | Pasos 02-03 | Suma de costos |
| `diferencia_valor` | Calculado | `valor_fisico − valor_libros` |
| `diferencia_cantidad` | Calculado | |
| `depreciacion_libros` | `PL-06` | |
| `depreciacion_recalculada` | Paso 06 | |
| `diferencia_depreciacion` | Calculado | |
| `porcentaje_desviacion` | Calculado | |

### `PL-07b` — Detalle de partidas conciliatorias
Archivo: `PL-07b_partidas_conciliatorias.xlsx`

| Columna | Tipo | Descripción |
|---|---|---|
| `codigo_institucional` | texto | Si existe en físico |
| `identificador_contable` | texto | Si existe en libros |
| `descripcion` | texto | |
| `subcuenta` | texto | |
| `tipo_diferencia` | lista | Ver `RN-04-02` |
| `valor_involucrado` | moneda | |
| `causa_probable` | texto | |
| `accion_propuesta` | lista | Incorporar / Dar de baja / Ajustar valor / Ajustar depreciación / Reclasificar |
| `soporte` | archivo | Evidencia |

---

## 6. Procedimiento

1. Solicitar y recibir los insumos `IN-04-01` a `IN-04-09`.
2. Importar los saldos contables a `PL-06` validando que el balance cuadre internamente.
3. Ejecutar el cruce automático físico ↔ contable por: código institucional → placa → serie → descripción + valor (en ese orden de prioridad).
4. Clasificar cada partida no cruzada según `RN-04-02`.
5. Investigar la causa de cada diferencia con el contador y el almacén.
6. Proponer la acción de ajuste para cada partida.
7. Consolidar `PL-07` y `PL-07b`.
8. Elaborar el **Informe de diagnóstico inicial** (`EN-04-01`).
9. Presentar al Comité de Saneamiento.

---

## 7. Reglas de negocio

### `RN-04-01` — Jerarquía de cruce
El emparejamiento automático intenta, en orden: (1) código institucional, (2) placa, (3) número de serie, (4) descripción normalizada + valor con tolerancia. Lo no emparejado queda para revisión manual. **La app nunca empareja por descripción sola.**

### `RN-04-02` — Tipología de diferencias

| Tipo | Situación | Acción típica |
|---|---|---|
| `SOBRANTE_FISICO` | Existe en físico, no en libros | Incorporar al patrimonio |
| `FALTANTE_FISICO` | Existe en libros, no en físico | Baja por caso fortuito o investigación |
| `DIFERENCIA_VALOR` | Mismo bien, distinto valor | Ajustar valor |
| `DIFERENCIA_FECHA` | Distinta fecha de adquisición | Ajustar y recalcular depreciación |
| `DIFERENCIA_DEPRECIACION` | Depreciación de libros ≠ recalculada | Ajustar depreciación acumulada |
| `CLASIFICACION_ERRONEA` | Registrado en subcuenta equivocada | Reclasificar |
| `DUPLICADO_LIBROS` | Mismo bien registrado dos veces | Depurar duplicado |
| `BIEN_TERCERO` | En libros pero es comodato | Retirar del patrimonio |

### `RN-04-03` — Toda diferencia debe clasificarse
No puede cerrarse el paso con partidas sin `tipo_diferencia` y sin `accion_propuesta`.

### `RN-04-04` — Los faltantes no se dan de baja automáticamente
Un `FALTANTE_FISICO` genera una **propuesta** de baja que debe pasar por el paso 09 y por aprobación del Comité. La app no ejecuta bajas por sí sola.

### `RN-04-05` — Tolerancia de valor configurable
Para el cruce por descripción + valor se usa una tolerancia porcentual parametrizable (sugerido: 5%). Diferencias dentro de la tolerancia se consideran el mismo bien.

### `RN-04-06` — Cuadre en tres niveles
El cierre exige que: suma del detalle por bien = saldo del auxiliar = saldo del mayor. Si no cuadra, se reporta la diferencia y no se cierra el paso.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-04-01` | Los saldos importados cuadran internamente (débitos − créditos = saldo) |
| `VAL-04-02` | Toda partida conciliatoria tiene `tipo_diferencia` asignado |
| `VAL-04-03` | Toda partida tiene `accion_propuesta` |
| `VAL-04-04` | El auxiliar cuadra con el mayor por subcuenta |
| `VAL-04-05` | La fecha de corte de los saldos coincide con la del ejercicio |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-04-06` | Desviación de una subcuenta superior al 20% |
| `VAL-04-07` | Más del 10% de bienes no pudo emparejarse automáticamente |
| `VAL-04-08` | Partidas conciliatorias sin soporte adjunto |
| `VAL-04-09` | Existen bienes en libros sin fecha de adquisición |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-04-01` | **Informe de diagnóstico inicial** | Word / PDF | Comité / Gerencia | Describe el estado de la cuenta PPE, cuantifica diferencias y propone el plan de ajuste |
| `EN-04-02` | Matriz de conciliación por subcuenta | Excel | Contador | `PL-07` completo y cuadrado |
| `EN-04-03` | Detalle de partidas conciliatorias | Excel | Contador / Comité | `PL-07b` con tipo y acción en el 100% de partidas |
| `EN-04-04` | Listado de sobrantes a incorporar | Excel | Contabilidad | Con valor propuesto |
| `EN-04-05` | Listado de faltantes a investigar | Excel | Almacén / Control Interno | Insumo del paso 09 |
| `EN-04-06` | Acta de circularización de saldos | Word / PDF | Comité | Firmada por el contador |

---

## 10. Implementación en la app

### 10.1 Entidades

```
SaldoContable(id, ejercicio_id, subcuenta, nombre_subcuenta, saldo_inicial,
              movimientos_debito, movimientos_credito, saldo_libros_corte,
              depreciacion_acum_libros, deterioro_libros, importado_en)

ActivoContable(id, ejercicio_id, identificador_contable, descripcion_contable,
               subcuenta, fecha_adquisicion_libros, valor_libros,
               depreciacion_acum_libros, bien_id_emparejado, metodo_emparejamiento)

PartidaConciliatoria(id, ejercicio_id, bien_id, activo_contable_id,
                     tipo_diferencia, valor_involucrado, causa_probable,
                     accion_propuesta, soporte_url, estado, resuelta_en)

Conciliacion(id, ejercicio_id, subcuenta, cantidad_libros, cantidad_fisico,
             valor_libros, valor_fisico, diferencia_valor,
             depreciacion_libros, depreciacion_recalculada, calculado_en)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-04-01` | Importar saldos contables desde Excel con mapeo de columnas configurable |
| `RF-04-02` | Motor de emparejamiento automático con la jerarquía de `RN-04-01` |
| `RF-04-03` | Interfaz de emparejamiento manual lado a lado (físico ↔ libros) |
| `RF-04-04` | Clasificación de diferencias con acción propuesta y soporte |
| `RF-04-05` | Cálculo automático de la matriz de conciliación por subcuenta |
| `RF-04-06` | Verificación de cuadre en tres niveles con semáforo |
| `RF-04-07` | Generación del informe de diagnóstico inicial |
| `RF-04-08` | Trazabilidad: desde cualquier diferencia, navegar al bien y a su soporte |

### 10.3 Pantallas

1. **Importador de saldos** — carga, mapeo de columnas y previsualización.
2. **Tablero de conciliación** — subcuentas con semáforo de desviación.
3. **Emparejador manual** — dos paneles con búsqueda y arrastre.
4. **Bandeja de partidas** — filtros por tipo de diferencia y estado.

---

## 11. Definición de completado (DoD)

- [ ] Saldos contables importados y cuadrados.
- [ ] 100% de partidas conciliatorias clasificadas con acción propuesta.
- [ ] Cuadre en tres niveles verificado.
- [ ] Informe de diagnóstico inicial (`EN-04-01`) entregado y presentado al Comité.

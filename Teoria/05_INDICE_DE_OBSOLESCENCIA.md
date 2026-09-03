# Paso 05 — Índice de Obsolescencia

> **Bloque:** III — Cálculo · **Responsable:** App (cálculo) + Especialista técnico (validación) · **Precondición:** Paso 03 cerrado

---

## 1. Propósito

Medir objetivamente el grado de agotamiento de la vida útil técnica de cada bien, expresado como un índice entre 0 y 1. Es el **criterio técnico principal** para proponer bajas por obsolescencia y para priorizar la reposición de biotecnología.

---

## 2. Alcance

**Incluye:** todos los bienes muebles con fecha de adquisición conocida, especialmente equipos médico-científicos y equipos de cómputo.

**No incluye:** terrenos (no se obsoletan) ni edificaciones (se tratan por vetustez en el paso 08).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Aplicación (motor de cálculo) | X | | | |
| Ingeniera biomédica | | | X | |
| Ingeniero de sistemas | | | X | |
| Coordinador de valuación | | X | | |
| Comité de Saneamiento | | | | X |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-05-01` | Fecha de adquisición de cada bien | Paso 03 (interno) | Dato del sistema | Sí | Cálculo de edad |
| `IN-05-02` | Vida útil técnica por clase | Paso 01 (interno) | Parámetro | Sí | Denominador del índice |
| `IN-05-03` | Vida útil del fabricante (manuales técnicos) | Ing. biomédica / proveedor | PDF | No | Sobrescritura por bien |
| `IN-05-04` | Concepto técnico sobre superación tecnológica | Ing. biomédica | Documento | No | Obsolescencia funcional anticipada |
| `IN-05-05` | Disponibilidad de repuestos y soporte del fabricante | Proveedor / mantenimiento | Comunicación escrita | No | Obsolescencia por descontinuación |
| `IN-05-06` | Fecha de corte del ejercicio | Paso 01 (interno) | Parámetro | Sí | Referencia temporal |

> Este paso consume principalmente datos ya capturados. Los insumos externos (`IN-05-03` a `IN-05-05`) sirven para **ajustar** el resultado, no para calcularlo.

---

## 5. Plantillas que se diligencian

### `PL-08` — Índice de obsolescencia
Archivo: `PL-08_indice_obsolescencia.xlsx` · Generado por la app

| # | Columna | Origen | Descripción |
|:-:|---|---|---|
| 1 | `codigo_institucional` | Paso 02 | Identificador |
| 2 | `placa` | Paso 02 | |
| 3 | `descripcion_bien` | Paso 02 | |
| 4 | `clase_activo` | Paso 02 | |
| 5 | `servicio_ubicacion` | Paso 02 | |
| 6 | `fecha_adquisicion` | Paso 03 | Base del cálculo |
| 7 | `vida_util_tecnica_anios` | Paso 01 / override | Denominador |
| 8 | `fecha_corte` | Paso 01 | Referencia |
| 9 | `edad_actual_anios` | **Calculado** | Ver `RN-05-01` |
| 10 | `indice_obsolescencia` | **Calculado** | Ver `RN-05-01` |
| 11 | `porcentaje_obsolescencia` | **Calculado** | Índice × 100 |
| 12 | `anios_restantes` | **Calculado** | |
| 13 | `fecha_fin_vida_util` | **Calculado** | |
| 14 | `semaforo` | **Calculado** | Verde/Amarillo/Naranja/Rojo |
| 15 | `estado_operativo` | Paso 03 | Contraste con lo técnico |
| 16 | `obsolescencia_funcional` | Captura | Sí/No — superación tecnológica |
| 17 | `justificacion_funcional` | Captura | Obligatoria si la anterior es Sí |
| 18 | `candidato_baja` | **Calculado** | Ver `RN-05-04` |
| 19 | `concepto_especialista` | Captura | Validación humana |

### `PL-08b` — Ajustes de vida útil por bien
Archivo: `PL-08b_override_vida_util.xlsx` · Solo para excepciones

| Columna | Tipo | Oblig. |
|---|---|:-:|
| `codigo_institucional` | texto | Sí |
| `vida_util_catalogo` | número | Sí (informativo) |
| `vida_util_ajustada` | número | Sí |
| `fuente` | lista (Manual fabricante / Concepto técnico / Norma) | Sí |
| `justificacion` | texto | Sí |
| `especialista` | texto | Sí |
| `soporte` | archivo | Sí |

---

## 6. Procedimiento

1. Verificar que todos los bienes tengan fecha de adquisición (si no, vuelven al paso 03).
2. Cargar, si aplica, los ajustes de vida útil (`PL-08b`).
3. Ejecutar el cálculo masivo del índice (`RN-05-01`).
4. Aplicar el semáforo según los umbrales parametrizados.
5. El especialista revisa los bienes en naranja y rojo.
6. Registrar la **obsolescencia funcional** de los bienes superados tecnológicamente aunque su índice sea bajo.
7. Marcar los candidatos a baja.
8. Emitir el reporte de obsolescencia y remitirlo al paso 09.

---

## 7. Reglas de negocio

### `RN-05-01` — Fórmulas del índice

```
edad_actual_anios      = (fecha_corte − fecha_adquisicion) / 365.25

indice_obsolescencia   = edad_actual_anios / vida_util_tecnica_anios

porcentaje             = indice_obsolescencia × 100

anios_restantes        = vida_util_tecnica_anios − edad_actual_anios

fecha_fin_vida_util    = fecha_adquisicion + (vida_util_tecnica_anios × 365,25 días)
```

**Ejemplo de verificación:**
Bien adquirido el 23/02/2015, vida útil técnica 15 años, fecha de corte 30/06/2025.

```
días transcurridos = 3.780
edad_actual        = 3.780 / 365,25 = 10,3491 años
indice             = 10,3491 / 15   = 0,6899  → 68,99 %
anios_rest.        = 15 − 10,3491   = 4,6509 años
fin_vida_util      = 23/02/2030
semaforo           = Amarillo
```

> **Corregido el 2026-09-01.** El ejemplo anterior usaba una edad de 10,3833 años que no se deriva
> de los 3.780 días transcurridos entre las dos fechas: `3.780 / 365,25 = 10,3491`. El índice
> correcto es **0,6899**, no 0,6922. La fórmula de `fecha_fin_vida_util` se alinea además con
> `ANEXO_C` §2.1, que multiplica por 365,25 en lugar de sumar años calendario. Ver
> `CORRECCIONES.md` § C-01 y § C-12.

### `RN-05-02` — El índice no se limita a 1
Un bien con más años que su vida útil arroja un índice mayor que 1 (ej. 1,35 = 135%). **No se debe truncar**: la magnitud del exceso es información valiosa para priorizar reposición.

### `RN-05-03` — Obsolescencia funcional independiente del índice
Un bien puede ser obsoleto aunque su índice sea bajo, cuando: el fabricante descontinuó el soporte, no hay repuestos, la tecnología fue reemplazada, o ya no cumple los requisitos de habilitación. Se marca manualmente con justificación obligatoria.

### `RN-05-04` — Criterio de candidato a baja
Un bien se marca como candidato cuando cumple **al menos una**:
- `indice_obsolescencia ≥ 1,00`
- `indice ≥ 0,81` **y** `estado_actual` ∈ {Malo, Inservible}
- `obsolescencia_funcional = Sí`
- `estado_operativo = No operativo` con mantenimiento correctivo fallido

> Ser candidato **no es** ser dado de baja. La decisión se toma en el paso 09 y la aprueba el Comité.

### `RN-05-05` — Vida útil técnica cero o nula
Si una clase no tiene vida útil técnica definida, el índice no se calcula y el bien se reporta como no evaluable. Nunca se asume un valor por defecto silenciosamente.

### `RN-05-06` — Recálculo ante cambio de corte
Cambiar la fecha de corte del ejercicio recalcula el índice de todos los bienes y registra el evento en la bitácora.

### `RN-05-07` — Bienes adquiridos después del corte
Si `fecha_adquisicion > fecha_corte`, el bien no pertenece al ejercicio. Se reporta como error de datos, no se calcula con edad negativa.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-05-01` | Todo bien evaluable tiene fecha de adquisición válida |
| `VAL-05-02` | Toda clase evaluada tiene vida útil técnica > 0 |
| `VAL-05-03` | No existen fechas de adquisición posteriores a la fecha de corte |
| `VAL-05-04` | Todo ajuste de vida útil (`PL-08b`) tiene justificación y soporte |
| `VAL-05-05` | Toda `obsolescencia_funcional = Sí` tiene justificación |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-05-06` | Bien con índice ≥ 1 y estado "Bueno" (revisar coherencia) |
| `VAL-05-07` | Bien con índice < 0,3 marcado como inservible (revisar) |
| `VAL-05-08` | Más del 40% de una clase en semáforo rojo (riesgo de habilitación) |
| `VAL-05-09` | Bienes candidatos a baja sin concepto del especialista |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-05-01` | **Reporte de índice de obsolescencia** | Excel + PDF | Comité / Gerencia | Un registro por bien evaluable, con índice, semáforo y concepto |
| `EN-05-02` | Listado de candidatos a baja por obsolescencia | Excel | Ing. biomédica / paso 09 | Con causal preliminar y justificación |
| `EN-05-03` | Informe de obsolescencia de biotecnología médica | Word / PDF | Gerencia / Planeación | Análisis por servicio con recomendación de reposición |
| `EN-05-04` | Matriz de priorización de reposición | Excel | Planeación / Plan Bienal | Ordenada por criticidad e índice |
| `EN-05-05` | Actas de ajuste de vida útil | Word / PDF | Comité | Solo para bienes con override |

---

## 10. Implementación en la app

### 10.1 Entidades

```
CalculoObsolescencia(id, ejercicio_id, bien_id, fecha_corte,
                     vida_util_tecnica_aplicada, edad_actual_anios,
                     indice_obsolescencia, anios_restantes,
                     fecha_fin_vida_util, semaforo,
                     obsolescencia_funcional, justificacion_funcional,
                     candidato_baja, concepto_especialista,
                     calculado_en, calculado_por)

OverrideVidaUtil(id, bien_id, vida_util_catalogo, vida_util_ajustada,
                 fuente, justificacion, especialista, soporte_url)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-05-01` | Cálculo masivo del índice para todo el ejercicio en una operación |
| `RF-05-02` | Semáforo visual configurable según umbrales del paso 01 |
| `RF-05-03` | Marcado manual de obsolescencia funcional con justificación obligatoria |
| `RF-05-04` | Filtro "candidatos a baja" con envío directo al paso 09 |
| `RF-05-05` | Recálculo automático ante cambio de fecha de corte o de vida útil |
| `RF-05-06` | Gráficas de distribución del índice por clase y por servicio |
| `RF-05-07` | Exportación de `PL-08` y del informe de obsolescencia |
| `RF-05-08` | Registro de quién y cuándo emitió cada concepto técnico |

### 10.3 Pantallas

1. **Tablero de obsolescencia** — distribución por semáforo, filtros por clase y servicio.
2. **Listado calculado** — tabla ordenable por índice con exportación.
3. **Revisión del especialista** — cola de bienes naranja/rojo para conceptuar.
4. **Ficha de obsolescencia del bien** — cálculo detallado y trazabilidad.

---

## 11. Definición de completado (DoD)

- [ ] Índice calculado para el 100% de bienes evaluables.
- [ ] Validaciones `VAL-05-01` a `VAL-05-05` superadas.
- [ ] Bienes en semáforo naranja y rojo con concepto del especialista.
- [ ] Reporte de obsolescencia (`EN-05-01`) entregado.

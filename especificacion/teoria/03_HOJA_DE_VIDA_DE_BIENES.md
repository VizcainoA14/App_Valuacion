# Paso 03 — Hoja de Vida de Bienes y Equipos

> **Bloque:** I — Levantamiento · **Responsable:** Ing. biomédica / Ing. sistemas / Recursos Físicos · **Precondición:** Paso 02 cerrado

---

## 1. Propósito

Documentar la ficha técnica, el historial de adquisición y el historial de mantenimiento de cada bien. Este paso **aporta los datos económicos** (costo y fecha de adquisición) sin los cuales los cálculos de los pasos 05, 06 y 07 son imposibles.

---

## 2. Alcance

**Incluye:** hoja de vida completa para todas las clases marcadas con `requiere_hoja_vida = Sí` (típicamente equipo médico-científico y equipos de cómputo). Para las demás clases, se captura al menos el bloque económico.

**No incluye:** programación de mantenimiento preventivo futuro (es gestión de mantenimiento, no valuación).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Ingeniera biomédica (equipo médico) | X | | | |
| Ingeniero de sistemas (cómputo) | X | | | |
| Recursos Físicos (demás bienes) | X | | | |
| Contador (soportes de adquisición) | | | X | |
| Coordinador de valuación | | X | | |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-03-01` | Facturas / órdenes de compra de bienes | Contabilidad / Almacén | PDF o Excel | Sí | Costo y fecha de adquisición |
| `IN-03-02` | Actas de donación o comodato | Jurídica / Almacén | PDF | Sí | Forma de adquisición y valor |
| `IN-03-03` | Contratos de dotación y sus anexos | Contratación | PDF | No | Valor de equipos por proyecto |
| `IN-03-04` | Hojas de vida de equipos existentes | Mantenimiento biomédico | Excel / PDF / físico | Sí | Evitar recapturar |
| `IN-03-05` | Historial de mantenimientos (preventivo y correctivo) | Mantenimiento / proveedor | Excel o reportes | Sí | Soporte del estado y de bajas |
| `IN-03-06` | Registros sanitarios INVIMA de equipos biomédicos | Ing. biomédica / proveedor | PDF | No | Cumplimiento y trazabilidad |
| `IN-03-07` | Manuales técnicos (vida útil del fabricante) | Ing. biomédica | PDF | No | Ajustar vida útil técnica |
| `IN-03-08` | Reportes CHIP / plan bienal de inversiones | Contabilidad / Planeación | Excel | No | Contraste de adquisiciones históricas |

### 4.1 Modelo de solicitud
Oficio al área contable solicitando los soportes de adquisición de los bienes listados, **adjuntando el inventario del paso 02** para que la búsqueda sea dirigida y no genérica.

---

## 5. Plantillas que se diligencian

### `PL-05` — Hoja de vida del bien
Archivo: `PL-05_hoja_de_vida.xlsx` (o formulario en la app) · Estructura en 5 bloques

**Bloque 1 — Identificación** *(se hereda del paso 02, no se recaptura)*

| Campo | Origen |
|---|---|
| `codigo_institucional`, `placa`, `descripcion`, `clase`, `marca`, `modelo`, `serie`, `sede`, `servicio` | Paso 02 |

**Bloque 2 — Datos técnicos**

| Campo | Tipo | Oblig. | Notas |
|---|---|:-:|---|
| `tipo_instalacion` | lista (Fijo/Móvil) | Sí | |
| `registro_invima` | texto | Condicional | Obligatorio si `requiere_invima` |
| `voltaje` / `potencia` | texto | No | |
| `especificaciones` | texto largo | No | |
| `fabricante` | texto | No | |
| `pais_origen` | texto | No | |
| `estado_operativo` | lista | Sí | Operativo / No operativo / Fuera de servicio |

**Bloque 3 — Registro histórico de adquisición** *(bloque crítico para la valuación)*

| Campo | Tipo | Oblig. | Se usa en |
|---|---|:-:|---|
| `forma_adquisicion` | lista (Compra/Donación/Comodato/Reposición/Traslado) | Sí | Trazabilidad |
| `fecha_adquisicion` | fecha | **Sí** | Pasos 05 y 06 |
| `documento_adquisicion` | texto | Sí | Soporte |
| `numero_factura` | texto | No | Soporte |
| `proveedor` | texto | No | Soporte |
| `costo_adquisicion` | moneda | **Sí** | Pasos 06 y 07 |
| `adiciones_mejoras` | moneda | No | Paso 06 |
| `fuente_financiacion` | texto | No | Informativo |
| `fecha_puesta_servicio` | fecha | No | Inicio de depreciación alternativo |

**Bloque 4 — Valores calculados** *(la app los llena, no se capturan)*

`vida_util_contable_meses`, `vida_util_tecnica_anios`, `depreciacion_acumulada`, `saldo_por_depreciar`, `indice_obsolescencia`, `valor_avaluo`

**Bloque 5 — Historial de mantenimiento**

| Campo | Tipo | Oblig. |
|---|---|:-:|
| `fecha_mantenimiento` | fecha | Sí |
| `tipo` | lista (Preventivo/Correctivo/Calibración) | Sí |
| `descripcion` | texto | Sí |
| `ejecutado_por` | texto | Sí |
| `costo` | moneda | No |
| `resultado` | lista (Satisfactorio/Con observaciones/No reparable) | Sí |

---

## 6. Procedimiento

1. Solicitar soportes de adquisición (`IN-03-01` a `IN-03-03`) adjuntando el inventario del paso 02.
2. Recuperar y digitalizar las hojas de vida ya existentes (`IN-03-04`).
3. Cruzar cada bien del inventario con su soporte de adquisición.
4. Diligenciar `PL-05` bloque por bloque.
5. Cargar el historial de mantenimientos (`IN-03-05`).
6. Marcar como **incompletos** los bienes sin fecha o sin costo de adquisición.
7. Gestionar la búsqueda de los soportes faltantes con contabilidad.
8. Para los que definitivamente no tengan soporte, aplicar `RN-03-04`.

---

## 7. Reglas de negocio

### `RN-03-01` — Sin fecha y costo no hay cálculo
Un bien sin `fecha_adquisicion` o sin `costo_adquisicion` **no puede** entrar a los pasos 05 y 06. Se marca `estado_registro = incompleto` y se excluye de los totales hasta resolverlo.

### `RN-03-02` — El costo cero no es un costo
Un valor de adquisición en cero se trata como **dato faltante**, no como bien gratuito, salvo que `forma_adquisicion = Donación` y exista acta que declare valor cero.

### `RN-03-03` — Inicio de la depreciación
Por defecto la depreciación inicia en la `fecha_adquisicion`. Si existe `fecha_puesta_servicio` y la política de la entidad lo establece, se usa esa. Es un parámetro del paso 01.

### `RN-03-04` — Bienes sin soporte documental
Si tras la gestión no aparece el soporte, se documenta un **avalúo técnico de reconocimiento inicial**: el especialista estima el valor razonable y la fecha probable de adquisición, dejando constancia escrita. Nunca se inventa un dato sin acta.

### `RN-03-05` — Adiciones y mejoras
Solo se capitalizan si aumentan la capacidad, la eficiencia o la vida útil del bien y superan el umbral de capitalización del paso 01. Un mantenimiento correctivo ordinario es gasto, no adición.

### `RN-03-06` — Vida útil técnica del fabricante prevalece
Si el manual técnico (`IN-03-07`) define una vida útil distinta a la del catálogo, el especialista puede sobrescribirla **a nivel del bien**, dejando la justificación registrada.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-03-01` | Todo bien de clase con `requiere_hoja_vida` tiene hoja de vida creada |
| `VAL-03-02` | `fecha_adquisicion` es válida y no posterior a la fecha de corte |
| `VAL-03-03` | `costo_adquisicion` > 0 o existe justificación registrada |
| `VAL-03-04` | Bienes biomédicos con `requiere_invima` tienen registro o justificación de exención |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-03-05` | Bien sin historial de mantenimiento en los últimos 24 meses |
| `VAL-03-06` | Costo de adquisición atípico frente a bienes de la misma descripción (posible error de digitación) |
| `VAL-03-07` | Fecha de adquisición anterior a la creación de la entidad |
| `VAL-03-08` | Bien sin soporte documental adjunto |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-03-01` | Hojas de vida individuales | PDF (una por equipo) | Ing. biomédica / E.S.E | Formato institucional, bloques 1–5 completos |
| `EN-03-02` | Base de datos de hojas de vida | Excel | E.S.E / Comité | Un registro por bien con datos económicos |
| `EN-03-03` | Reporte de bienes sin soporte de adquisición | Excel | Contabilidad | Lista con gestión documentada |
| `EN-03-04` | Actas de avalúo técnico de reconocimiento inicial | Word / PDF | Comité | Solo para bienes sin soporte, con firma del especialista |
| `EN-03-05` | Consolidado de historial de mantenimientos | Excel | Mantenimiento | Insumo del paso 09 |

---

## 10. Implementación en la app

### 10.1 Entidades

```
HojaVida(id, bien_id, tipo_instalacion, registro_invima, especificaciones,
         fabricante, pais_origen, estado_operativo,
         forma_adquisicion, fecha_adquisicion, documento_adquisicion,
         numero_factura, proveedor, costo_adquisicion, adiciones_mejoras,
         fuente_financiacion, fecha_puesta_servicio,
         vida_util_tecnica_override, justificacion_override)

Mantenimiento(id, bien_id, fecha, tipo, descripcion, ejecutado_por,
              costo, resultado, soporte_url)

SoporteDocumental(id, bien_id, tipo_documento, url, cargado_por, cargado_en)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-03-01` | Formulario de hoja de vida enlazado al bien (sin recapturar identificación) |
| `RF-03-02` | Adjuntar factura, acta, registro INVIMA e imágenes al bien |
| `RF-03-03` | Importación masiva del bloque económico desde Excel |
| `RF-03-04` | Marcado automático de bienes incompletos y tablero de pendientes |
| `RF-03-05` | Detección de costos atípicos por descripción similar |
| `RF-03-06` | Generación de la hoja de vida en PDF con membrete institucional |
| `RF-03-07` | Registro de mantenimientos con carga masiva |
| `RF-03-08` | Sobrescritura de vida útil a nivel de bien con justificación obligatoria |

### 10.3 Pantallas

1. **Ficha de hoja de vida** — pestañas por bloque.
2. **Bandeja de pendientes** — bienes incompletos ordenados por impacto.
3. **Cargue masivo de datos económicos** — Excel con validación previa.
4. **Historial de mantenimiento** — línea de tiempo por equipo.

---

## 11. Definición de completado (DoD)

- [ ] 100% de bienes de clases que lo requieren tienen hoja de vida.
- [ ] Validaciones `VAL-03-01` a `VAL-03-04` superadas.
- [ ] Bienes sin soporte resueltos por acta o reportados formalmente.
- [ ] Base de hojas de vida entregada (`EN-03-02`).

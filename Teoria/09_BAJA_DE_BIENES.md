# Paso 09 — Clasificación y Baja de Bienes

> **Bloque:** III — Cálculo · **Responsable:** Especialista técnico → Comité de Saneamiento · **Precondición:** Pasos 05, 06 y 07 cerrados

---

## 1. Propósito

Determinar qué bienes deben retirarse del patrimonio, bajo qué causal, con qué soporte técnico y con qué disposición final. Convierte los "candidatos a baja" en decisiones formales aprobadas por el Comité.

---

## 2. Alcance

**Incluye:** clasificación por causal, certificación técnica, aprobación del Comité, acto administrativo de baja y definición del destino final.

**No incluye:** la ejecución de la venta, remate o disposición física (se documenta pero es proceso posterior).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Ingeniera biomédica (equipos médicos) | X | | | |
| Ingeniero de sistemas (cómputo) | X | | | |
| Recursos Físicos / Almacén | X | | | |
| Comité de Saneamiento Contable | | X | | |
| Gerente | | X | | |
| Contador | | | X | |
| Control Interno | | | X | |
| Asesor jurídico | | | X | |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-09-01` | Listado de candidatos a baja | Paso 05 (interno) | Dato del sistema | Sí | Universo a evaluar |
| `IN-09-02` | Listado de faltantes de la conciliación | Paso 04 (interno) | Dato del sistema | Sí | Bajas por caso fortuito |
| `IN-09-03` | Historial de mantenimiento correctivo fallido | Paso 03 (interno) | Dato del sistema | Sí | Sustento de "inservible" |
| `IN-09-04` | **Cotización de reparación** de equipos dañados | Proveedor de mantenimiento | Cotización PDF | Sí | Demostrar inviabilidad económica |
| `IN-09-05` | Concepto de descontinuación de repuestos | Fabricante / proveedor | Comunicación escrita | No | Sustento de obsolescencia |
| `IN-09-06` | Manual/procedimiento de baja de bienes de la E.S.E | Recursos Físicos / Jurídica | PDF | Sí | Ruta procedimental interna |
| `IN-09-07` | Denuncias o investigaciones por pérdida de bienes | Control Interno | Documento | No | Soporte de caso fortuito |
| `IN-09-08` | Normativa ambiental de disposición de residuos (RAEE, biomédicos) | Gestión ambiental | Documento | Sí | Destino final |
| `IN-09-09` | Acta de conformación del Comité vigente | Jurídica | PDF | Sí | Validez de la aprobación |

### 4.1 Modelo de solicitud
Para cada equipo candidato a "inservible" debe solicitarse **cotización formal de reparación**. La regla de decisión es económica: si el costo de reparación supera un porcentaje del valor de reposición, la reparación es inviable y procede la baja. Sin esa cotización la causal no está soportada.

---

## 5. Plantillas que se diligencian

### `PL-13` — Propuesta y certificación de baja de bienes
Archivo: `PL-13_baja_de_bienes.xlsx` · Una hoja por causal + hoja de custodia

**Hojas:** `OBSOLESCENCIA`, `INSERVIBLES`, `CASO_FORTUITO`, `OTRAS_CAUSALES`, `EN_CUSTODIA`

| # | Columna | Origen | Oblig. |
|:-:|---|---|:-:|
| 1 | `codigo_institucional` | Paso 02 | Sí |
| 2 | `placa` | Paso 02 | Sí |
| 3 | `descripcion_bien` | Paso 02 | Sí |
| 4 | `marca` / `modelo` / `serie` | Paso 02 | No |
| 5 | `servicio_ubicacion` | Paso 02 | Sí |
| 6 | `clase_activo` | Paso 02 | Sí |
| 7 | `subcuenta_contable` | Paso 01 | Sí |
| 8 | `valor_adquisicion` | Paso 03 | Sí |
| 9 | `depreciacion_acumulada` | Paso 06 | Sí |
| 10 | `valor_neto_libros` | Paso 06 | Sí |
| 11 | `indice_obsolescencia` | Paso 05 | Sí |
| 12 | `estado_actual` | Paso 02 | Sí |
| 13 | `causal_baja` | Captura | Sí |
| 14 | `justificacion_tecnica` | Captura | **Sí** |
| 15 | `costo_reparacion_estimado` | Captura | Condicional |
| 16 | `valor_reposicion` | Paso 07 | Condicional |
| 17 | `relacion_reparacion_reposicion` | **Calculado** | Condicional |
| 18 | `valor_salvamento` | Captura | No |
| 19 | `destino_final_propuesto` | Captura | Sí |
| 20 | `soporte` | archivo | Sí |
| 21 | `especialista_certifica` | Captura | Sí |
| 22 | `estado_aprobacion` | Sistema | Sí |
| 23 | `acta_comite` | Sistema | Condicional |
| 24 | `resolucion_baja` | Sistema | Condicional |

### `PL-13b` — Certificación técnica de baja (documento)
Archivo: `PL-13b_certificacion_tecnica_baja.docx`

| Sección | Contenido |
|---|---|
| Encabezado | Entidad, fecha, elaborado por, cargo, dependencia |
| Objeto | Marco de la evaluación técnica y del manual de activos |
| Tabla 1 | Bienes a dar de baja por **obsolescencia** (código, equipo, servicio, justificación) |
| Tabla 2 | Bienes a dar de baja por **inservibles** |
| Tabla 3 | Bienes a dar de baja por **caso fortuito** |
| Tabla 4 | Bienes **en custodia/bodega** (no requieren baja) |
| Recomendaciones técnicas | Disposición final, actualización de inventario, revisión periódica |
| Certificación y firma | Especialista con registro profesional |

### `PL-13c` — Acta de disposición final

| Columna | Descripción |
|---|---|
| `codigo_institucional` | |
| `destino_final` | Venta / Remate / Destrucción / Donación / Reciclaje RAEE / Gestor ambiental |
| `fecha_disposicion` | |
| `responsable_entrega` / `responsable_recibe` | |
| `documento_soporte` | Acta, certificado de gestor, comprobante |

---

## 6. Procedimiento

1. Consolidar el universo: candidatos del paso 05 + faltantes del paso 04.
2. Inspección técnica de cada bien por el especialista competente.
3. Para los presuntos inservibles: solicitar cotización de reparación (`IN-09-04`) y aplicar `RN-09-03`.
4. Asignar causal y justificación técnica a cada bien.
5. Separar los bienes "en custodia" (funcionales pero guardados) — **no son baja**.
6. Definir el destino final propuesto.
7. Emitir la **certificación técnica de baja** (`PL-13b`).
8. Presentar al Comité de Saneamiento.
9. El Comité evalúa y consigna su decisión en acta.
10. Se proyecta el acto administrativo de baja para firma del Gerente.
11. Ejecutada la baja, se actualiza el estado del bien y se documenta la disposición final.

---

## 7. Reglas de negocio

### `RN-09-01` — Causales de baja

| Causal | Definición | Soporte requerido |
|---|---|---|
| `OBSOLESCENCIA` | Vida útil agotada o tecnología superada / reemplazada | Índice de obsolescencia + concepto técnico |
| `INSERVIBLE` | Daño no reparable o económicamente inviable | Cotización de reparación + concepto técnico |
| `CASO_FORTUITO` | No hallado, extraviado, hurtado, destruido por siniestro | Acta de faltante + reporte a Control Interno |
| `DESUSO` | Funcional pero sin utilidad para la entidad | Concepto del jefe de servicio |
| `DONACION_O_TRASLADO` | Transferido a otra entidad | Acto administrativo de transferencia |

### `RN-09-02` — "En custodia" no es baja
Los bienes funcionales guardados en bodega (por renovación tecnológica, cambio de proceso o uso ocasional) se registran en una categoría aparte con seguimiento periódico. **Nunca** se dan de baja automáticamente por estar sin uso.

### `RN-09-03` — Criterio económico de inservible

```
relacion = costo_reparacion_estimado / valor_reposicion

Si relacion ≥ umbral_reparacion (sugerido 50 %)  →  procede baja por INSERVIBLE
Si relacion <  umbral_reparacion                 →  se recomienda reparar
```

El umbral es parametrizable por entidad. La decisión siempre queda soportada con la cotización.

### `RN-09-04` — La baja la aprueba el Comité, no el sistema
La app registra estados; no ejecuta bajas por sí sola.

```
PROPUESTO → EN_REVISION → APROBADO_COMITE → RESOLUCION_EMITIDA
          → EJECUTADO → DISPOSICION_FINAL_DOCUMENTADA
```

Un bien rechazado vuelve a `ACTIVO` con la observación del Comité.

### `RN-09-05` — Efecto contable de la baja

```
Al dar de baja:
  - Se acredita el valor bruto del activo (saldo final ajustado).
  - Se debita la depreciación acumulada asociada.
  - Se debita el deterioro asociado, si existe.
  - La diferencia (valor neto en libros) se reconoce como pérdida o gasto,
    salvo que exista valor de salvamento recuperado.
```

### `RN-09-06` — Justificación individual obligatoria
No se aceptan justificaciones genéricas para lotes. Cada bien requiere su motivo específico (el modelo de referencia usa frases como "falla en tarjeta de control, reparación no autorizada por costo" o "no encontrado en último mantenimiento").

### `RN-09-07` — Caso fortuito exige reporte
Todo bien dado de baja por caso fortuito debe reportarse a Control Interno, y cuando corresponda a la aseguradora y a las autoridades. La baja contable no exime de la investigación administrativa.

### `RN-09-08` — Disposición final ambiental
Los equipos biomédicos y electrónicos deben disponerse conforme a la normativa ambiental (RAEE y residuos hospitalarios), con certificado del gestor autorizado. La baja no se considera cerrada sin ese soporte.

### `RN-09-09` — Trazabilidad permanente
Un bien dado de baja **no se elimina** del sistema: cambia de estado y conserva íntegro su historial, códigos, valores y soportes.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-09-01` | Toda propuesta de baja tiene causal asignada |
| `VAL-09-02` | Toda propuesta tiene justificación técnica individual |
| `VAL-09-03` | Toda baja por inservible tiene cotización de reparación adjunta |
| `VAL-09-04` | Toda baja por caso fortuito tiene acta de faltante y reporte |
| `VAL-09-05` | Toda propuesta está certificada por un especialista identificado |
| `VAL-09-06` | Ninguna baja se ejecuta sin acta de aprobación del Comité |
| `VAL-09-07` | El valor neto de las bajas está calculado y cuadra con el paso 06 |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-09-08` | Bien con índice bajo (< 0,50) propuesto para baja por obsolescencia |
| `VAL-09-09` | Bien totalmente depreciado y funcional propuesto para baja |
| `VAL-09-10` | Más del 30% de una clase propuesta para baja (riesgo de habilitación) |
| `VAL-09-11` | Baja aprobada sin destino final definido |
| `VAL-09-12` | Baja ejecutada sin certificado de disposición ambiental |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-09-01` | **Certificación técnica de baja de bienes** | Word / PDF | Comité | Firmada por el especialista, con las cuatro tablas de `PL-13b` |
| `EN-09-02` | Listado de bienes a dar de baja por causal | Excel | Comité / Contador | `PL-13` con soporte en el 100% de registros |
| `EN-09-03` | Listado de bienes en custodia | Excel | Recursos Físicos | Con estado y periodicidad de revisión |
| `EN-09-04` | Acta del Comité que aprueba las bajas | Word / PDF | Gerencia / auditoría | Firmada por los miembros del Comité |
| `EN-09-05` | Proyecto de resolución de baja de bienes | Word / PDF | Gerencia / Jurídica | Lista para firma del Gerente |
| `EN-09-06` | Cuadro de efecto contable de las bajas | Excel | Contador | Valor bruto, depreciación, deterioro y pérdida por subcuenta |
| `EN-09-07` | Actas de disposición final | Word / PDF | Gestión ambiental | Con certificado del gestor autorizado |
| `EN-09-08` | Edicto o aviso de venta de bienes inservibles | Word / PDF | Jurídica | Solo si el destino es venta o remate |

---

## 10. Implementación en la app

### 10.1 Entidades

```
PropuestaBaja(id, ejercicio_id, bien_id, causal, justificacion_tecnica,
              costo_reparacion_estimado, valor_reposicion,
              relacion_reparacion_reposicion, valor_salvamento,
              destino_final_propuesto, soporte_url,
              especialista_id, fecha_propuesta, estado_aprobacion,
              acta_comite_id, resolucion_id, observacion_comite)

BienEnCustodia(id, ejercicio_id, bien_id, motivo, fecha_ingreso_custodia,
               proxima_revision, estado_funcional, responsable)

DisposicionFinal(id, propuesta_baja_id, destino_final, fecha_disposicion,
                 responsable_entrega, responsable_recibe,
                 gestor_autorizado, certificado_url)

EfectoContableBaja(id, propuesta_baja_id, valor_bruto,
                   depreciacion_asociada, deterioro_asociado,
                   valor_neto, valor_recuperado, perdida_reconocida)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-09-01` | Bandeja de candidatos a baja alimentada por los pasos 04 y 05 |
| `RF-09-02` | Asignación de causal con justificación individual obligatoria |
| `RF-09-03` | Cálculo automático de la relación reparación/reposición y semáforo de decisión |
| `RF-09-04` | Flujo de aprobación por estados con registro de quién aprueba |
| `RF-09-05` | Generación de la certificación técnica de baja con las cuatro tablas |
| `RF-09-06` | Generación del proyecto de resolución de baja |
| `RF-09-07` | Cálculo del efecto contable agregado por subcuenta |
| `RF-09-08` | Registro de disposición final con certificado ambiental |
| `RF-09-09` | Gestión independiente de bienes en custodia con alertas de revisión |
| `RF-09-10` | Bloqueo de ejecución de baja sin acta del Comité |
| `RF-09-11` | Generación del edicto o aviso de venta cuando aplique |

### 10.3 Pantallas

1. **Bandeja de candidatos** — filtros por causal, clase y servicio.
2. **Ficha de propuesta de baja** — datos del bien, causal, soportes, cálculo económico.
3. **Sesión del Comité** — vista de aprobación masiva con registro de decisiones.
4. **Bienes en custodia** — listado con alertas de revisión periódica.
5. **Disposición final** — registro y cargue de certificados.

---

## 11. Definición de completado (DoD)

- [ ] 100% de candidatos evaluados y clasificados.
- [ ] Validaciones `VAL-09-01` a `VAL-09-07` superadas.
- [ ] Certificación técnica firmada por el especialista.
- [ ] Acta del Comité que aprueba las bajas.
- [ ] Proyecto de resolución entregado a jurídica.
- [ ] Efecto contable cuantificado por subcuenta.

# Paso 02 — Inventario Físico y Plaqueteo

> **Bloque:** I — Levantamiento · **Responsable:** Técnicos de inventario + Recursos Físicos · **Precondición:** Paso 01 cerrado

---

## 1. Propósito

Levantar en campo la totalidad de los bienes muebles existentes, asignarles un identificador físico único (plaqueteo) y registrar su ubicación, estado y responsable de custodia. Es la **fuente de verdad física** contra la que se contrastará la contabilidad.

---

## 2. Alcance

**Incluye:** todos los bienes muebles en todas las sedes y servicios, incluidos los que están en bodega, fuera de servicio o en comodato (marcados como tales).

**No incluye:** consumibles, medicamentos, dispositivos médicos de un solo uso, ni bienes de terceros que no estén en comodato formal.

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Técnicos operativos de conteo | X | | | |
| Coordinador de inventario (contratista) | | X | | |
| Jefe de cada servicio | | | X | |
| Recursos Físicos / Almacén | | | X | |
| Ingeniera biomédica | | | X | |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-02-01` | Listado de bienes existente / último inventario | Recursos Físicos | Excel | No | Punto de partida y comparación |
| `IN-02-02` | Planos o distribución física de las sedes | Recursos Físicos / Planeación | PDF o plano | No | Planear la ruta de conteo |
| `IN-02-03` | Autorización de acceso a todas las áreas | Gerencia | Oficio / circular | Sí | Habilitar el recorrido |
| `IN-02-04` | Cronograma de conteo por servicio acordado | Jefes de servicio | Documento | Sí | No interrumpir la operación asistencial |
| `IN-02-05` | Listado de funcionarios responsables por dependencia | Talento Humano | Excel | Sí | Asignación de custodia |
| `IN-02-06` | Relación de bienes en comodato o de terceros | Contratación / Almacén | Excel | Sí | Excluirlos del patrimonio |
| `IN-02-07` | Insumos de plaqueteo (etiquetas, ribbon, impresora) | Contratista | Físico | Sí | Marcación de bienes |

### 4.1 Modelo de solicitud
Circular gerencial dirigida a todos los jefes de servicio informando el cronograma (`IN-02-04`), solicitando acompañamiento y advirtiendo que no deben moverse bienes durante el conteo del área.

---

## 5. Plantillas que se diligencian

### `PL-03` — Toma de inventario físico
Archivo: `PL-03_toma_inventario_fisico.xlsx` · Una hoja por clase de activo
**Es la plantilla operativa central del paso.**

| # | Columna | Tipo | Origen | Oblig. | Validación |
|:-:|---|---|---|:-:|---|
| 1 | `codigo_institucional` | texto | Generado por la app | Sí | Único en el ejercicio |
| 2 | `placa` | texto | Etiqueta física | Sí | Único |
| 3 | `descripcion_funcional` | texto | Campo | Sí | No vacío |
| 4 | `clase_activo` | lista | Catálogo `PL-02` | Sí | Debe existir en el catálogo |
| 5 | `marca` | texto | Campo | No | |
| 6 | `modelo` | texto | Campo | No | |
| 7 | `serie` | texto | Campo | No | Alerta si se repite |
| 8 | `sede` | lista | Catálogo `PL-02b` | Sí | Debe existir |
| 9 | `servicio_ubicacion` | lista | Catálogo `PL-02b` | Sí | Debe existir |
| 10 | `cantidad` | entero | Campo | Sí | ≥ 1 |
| 11 | `estado_actual` | lista | Campo | Sí | Bueno/Regular/Malo/Inservible |
| 12 | `condicion_tenencia` | lista | Campo | Sí | Propio/Comodato/Arrendado/Tercero |
| 13 | `responsable_custodia` | texto | `IN-02-05` | Sí | |
| 14 | `fecha_toma` | fecha | Automático | Sí | ≤ fecha de corte |
| 15 | `funcionario_que_cuenta` | texto | Automático | Sí | |
| 16 | `observaciones` | texto | Campo | No | |
| 17 | `foto` | archivo | Cámara | No | Obligatoria si estado = Malo/Inservible |

### `PL-04` — Etiquetas de plaqueteo
Archivo: `PL-04_etiquetas_plaqueteo.xlsx` (insumo de impresión)

| Columna | Descripción |
|---|---|
| `codigo_institucional` | Texto impreso |
| `codigo_barras` | Valor codificado (Code128 o QR) |
| `descripcion_corta` | Nombre abreviado del bien |
| `nombre_entidad` | Encabezado de la etiqueta |
| `servicio` | Ubicación asignada |

### `PL-12` — Acta de asignación de responsabilidad y custodia
Archivo: `PL-12_acta_custodia.docx` · Una por dependencia

| Sección | Contenido |
|---|---|
| Encabezado | Entidad, dependencia, fecha |
| Funcionario responsable | Nombre, cargo, documento |
| Relación de bienes | Código, placa, descripción, estado, valor |
| Declaración | Compromiso de guarda y custodia |
| Firmas | Responsable, jefe inmediato, Recursos Físicos |

---

## 6. Procedimiento

1. Emitir la circular de `IN-02-03` / `IN-02-04`.
2. Preparar la ruta de conteo por sede y servicio.
3. Por cada servicio:
   - Recorrer físicamente e identificar cada bien.
   - Registrar en `PL-03` (idealmente con captura móvil).
   - Generar y **adherir la etiqueta** con el código institucional.
   - Fotografiar los bienes en estado Malo/Inservible.
4. Marcar los bienes en comodato o de terceros (`condicion_tenencia`) para excluirlos del patrimonio.
5. Cerrar cada servicio con la firma del jefe del área.
6. Generar y hacer firmar las actas de custodia (`PL-12`).
7. Consolidar el inventario físico del ejercicio.

---

## 7. Reglas de negocio

### `RN-02-01` — Unicidad
`codigo_institucional` y `placa` son únicos dentro del ejercicio. La app rechaza duplicados en el momento de la captura, no al final.

### `RN-02-02` — Un bien, una ubicación
Cada bien pertenece a exactamente un servicio en un momento dado. Los traslados se registran como movimientos con fecha, no sobrescribiendo la ubicación.

### `RN-02-03` — La clase determina el tratamiento posterior
La clase asignada define la vida útil, quién lo valúa y si requiere hoja de vida. Cambiar la clase de un bien obliga a recalcular.

### `RN-02-04` — Bienes de terceros no entran al patrimonio
Los marcados como Comodato/Arrendado/Tercero se registran para control físico pero **se excluyen** de los totales de PPE y de la conciliación contable.

### `RN-02-05` — Serie repetida es alerta, no error
Equipos idénticos pueden tener series no registradas ("NO REGISTRA", "NT"). La app advierte pero no bloquea.

### `RN-02-06` — Conteo ciego opcional
Para mayor rigor, la app puede ocultar al contador de campo el listado previo, evitando el sesgo de confirmación.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-02-01` | No existen códigos institucionales duplicados |
| `VAL-02-02` | No existen placas duplicadas |
| `VAL-02-03` | Todo bien tiene clase, sede y servicio válidos del catálogo |
| `VAL-02-04` | Todo bien tiene estado actual y condición de tenencia |
| `VAL-02-05` | Todos los servicios activos fueron recorridos (cobertura 100%) |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-02-06` | Bien en estado Malo/Inservible sin fotografía |
| `VAL-02-07` | Serie duplicada entre dos bienes |
| `VAL-02-08` | Servicio sin bienes registrados (¿realmente está vacío?) |
| `VAL-02-09` | Bien sin responsable de custodia asignado |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-02-01` | Inventario físico consolidado | Excel + PDF | Comité / Recursos Físicos | Cobertura del 100% de servicios activos, sin duplicados |
| `EN-02-02` | Bienes plaqueteados en sitio | Físico | E.S.E | Etiqueta legible y adherida en cada bien |
| `EN-02-03` | Actas de asignación de custodia | Word / PDF | Cada dependencia | Una por dependencia, firmada |
| `EN-02-04` | Relación de bienes en comodato o de terceros | Excel | Contabilidad | Identificados y excluidos del patrimonio |
| `EN-02-05` | Reporte fotográfico de bienes en mal estado | PDF | Ing. biomédica / Comité | Soporte de las bajas del paso 09 |
| `EN-02-06` | Acta de cierre de toma física por servicio | Word / PDF | Jefes de servicio | Firmada por el jefe del área |

---

## 10. Implementación en la app

### 10.1 Entidades

```
Bien(id, ejercicio_id, codigo_institucional, placa, descripcion_funcional,
     clase_activo_id, marca, modelo, serie, sede_id, servicio_id, cantidad,
     estado_actual, condicion_tenencia, responsable_custodia,
     fecha_toma, funcionario_conteo, observaciones, estado_registro)

FotoBien(id, bien_id, url, tipo, tomada_en)

MovimientoBien(id, bien_id, servicio_origen_id, servicio_destino_id,
               fecha, motivo, usuario_id)

ActaCustodia(id, ejercicio_id, servicio_id, responsable, fecha,
             documento_url, estado_firma)
```

`estado_registro`: `borrador` | `validado` | `incompleto` | `dado_de_baja`

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-02-01` | Captura móvil de inventario con funcionamiento **offline** y sincronización posterior |
| `RF-02-02` | Lectura de código de barras / QR con la cámara |
| `RF-02-03` | Generación automática del código institucional según la convención del paso 01 |
| `RF-02-04` | Generación e impresión de etiquetas (Code128 / QR) por lotes |
| `RF-02-05` | Captura de fotografía asociada al bien |
| `RF-02-06` | Validación de duplicados en tiempo real durante la captura |
| `RF-02-07` | Importación masiva desde `PL-03` con reporte de errores fila por fila |
| `RF-02-08` | Tablero de avance de cobertura por sede y servicio |
| `RF-02-09` | Generación automática de actas de custodia por dependencia |
| `RF-02-10` | Registro de traslados sin perder el histórico de ubicación |

### 10.3 Pantallas

1. **Captura en campo (móvil)** — formulario optimizado, cámara, escáner, modo offline.
2. **Listado de bienes** — filtros por sede, servicio, clase, estado; búsqueda por código/placa/serie.
3. **Ficha del bien** — datos, fotos, historial de movimientos.
4. **Generador de etiquetas** — selección por lote y vista previa de impresión.
5. **Tablero de cobertura** — porcentaje de servicios completados.

---

## 11. Definición de completado (DoD)

- [ ] Cobertura del 100% de servicios activos.
- [ ] Validaciones `VAL-02-01` a `VAL-02-05` superadas.
- [ ] Todos los bienes con etiqueta física adherida.
- [ ] Actas de custodia firmadas por cada dependencia.
- [ ] Inventario físico consolidado entregado (`EN-02-01`).

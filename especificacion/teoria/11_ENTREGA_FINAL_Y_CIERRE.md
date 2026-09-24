# Paso 11 — Entrega Final y Cierre

> **Bloque:** IV — Formalización · **Responsable:** Coordinador de valuación + Supervisor del contrato · **Precondición:** Paso 10 cerrado

---

## 1. Propósito

Consolidar y entregar formalmente todos los productos del proceso, transferir conocimiento a los funcionarios de la entidad, dejar instalada la capacidad de mantener el inventario actualizado y liquidar el contrato a satisfacción.

---

## 2. Alcance

**Incluye:** manual de activos e inventarios, capacitación, entrega documental, acta de liquidación y transferencia de la herramienta.

**No incluye:** la operación posterior del inventario (responsabilidad de la entidad).

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Coordinador de valuación | X | | | |
| Supervisor / interventor del contrato | | X | | |
| Gerente | | X | | |
| Recursos Físicos / Almacén | | | X | |
| Contador | | | X | |
| Control Interno | | | | X |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-11-01` | Todos los entregables de los pasos 01 a 10 | Interno | Sistema | Sí | Expediente final |
| `IN-11-02` | Manual de activos e inventarios vigente (si existe) | Recursos Físicos | Word / PDF | No | Base de actualización |
| `IN-11-03` | Estructura de procesos y procedimientos de la E.S.E | Calidad / Planeación | Documento | Sí | Codificación del manual |
| `IN-11-04` | Listado de funcionarios a capacitar | Talento Humano | Excel | Sí | Convocatoria y asistencia |
| `IN-11-05` | Disponibilidad de espacio y medios para capacitación | Gerencia | Confirmación | Sí | Logística |
| `IN-11-06` | Formato institucional de acta de liquidación | Jurídica / Contratación | Word | Sí | Cierre contractual |
| `IN-11-07` | Certificación de cumplimiento del supervisor | Supervisor | Documento | Sí | Pago final |
| `IN-11-08` | Requisitos de entrega de información del contrato | Contratación | Documento | Sí | Formato de la entrega |

---

## 5. Plantillas que se diligencian

### `PL-17` — Acta de entrega final de productos
Archivo: `PL-17_acta_entrega_final.docx`

| Sección | Contenido |
|---|---|
| Encabezado | Entidad, contrato No., objeto, fecha |
| Partes | Contratante, contratista, supervisor |
| Relación de productos | Tabla con código, producto, formato, cantidad, observación |
| Verificación | Chequeo de cumplimiento por producto |
| Declaración | Entrega a satisfacción |
| Firmas | Contratista, supervisor, gerente |

### `PL-18` — Manual de activos e inventarios
Archivo: `PL-18_manual_activos.docx` · Documento institucional

| Capítulo | Contenido |
|---|---|
| 1. Objetivo y alcance | Propósito del manual |
| 2. Marco normativo | Ver `ANEXO_D` |
| 3. Definiciones | Ver glosario |
| 4. Responsabilidades | Por rol y dependencia |
| 5. Clasificación de bienes | Catálogo de clases y vidas útiles |
| 6. Incorporación de bienes | Compra, donación, comodato, reposición |
| 7. Identificación y plaqueteo | Convención de codificación y procedimiento |
| 8. Asignación y custodia | Actas y responsabilidad de los funcionarios |
| 9. Movimientos y traslados | Procedimiento y formatos |
| 10. Toma física de inventarios | Periodicidad y método |
| 11. Depreciación y deterioro | Método adoptado y parámetros |
| 12. Índice de obsolescencia | Metodología y umbrales |
| 13. Valuación de activos | Métodos y responsables |
| 14. Baja de bienes | Causales, ruta de aprobación, disposición final |
| 15. Reportes y periodicidad | Informes obligatorios |
| 16. Formatos anexos | Todas las plantillas del proceso |

### `PL-19` — Plan y registro de capacitación

| Columna | Descripción |
|---|---|
| `sesion` | Número y tema |
| `fecha` / `duracion` | |
| `dirigido_a` | Perfiles convocados |
| `contenido` | Temas cubiertos |
| `metodologia` | Teórica / práctica |
| `material_entregado` | |
| `asistentes` | Nombre, cargo, firma |
| `evaluacion` | Resultado de la evaluación de aprendizaje |

### `PL-20` — Acta de liquidación del contrato
Archivo: `PL-20_acta_liquidacion.docx` — según formato institucional (`IN-11-06`)

---

## 6. Procedimiento

1. Compilar todos los entregables de los pasos 01 a 10.
2. Verificar contra la matriz de productos del contrato.
3. Elaborar o actualizar el **Manual de Activos e Inventarios** (`PL-18`).
4. Someter el manual a adopción mediante resolución (`R-10` del catálogo del paso 10).
5. Planear y ejecutar la capacitación (`PL-19`).
6. Entregar la información en el formato requerido (digital y físico).
7. Suscribir el acta de entrega final (`PL-17`).
8. Obtener la certificación de cumplimiento del supervisor.
9. Suscribir el acta de liquidación (`PL-20`).
10. Archivar el expediente y transferir accesos del sistema.

---

## 7. Reglas de negocio

### `RN-11-01` — Matriz de verificación de productos
Antes de la entrega, la app debe confrontar automáticamente los entregables producidos contra la lista de productos del contrato, y señalar faltantes. Ningún acta de entrega se genera con productos pendientes sin justificación.

### `RN-11-02` — El manual refleja los parámetros reales
El Manual de Activos e Inventarios debe generarse a partir de los parámetros efectivamente usados en el ejercicio (vidas útiles, método de depreciación, umbrales, convención de códigos). Un manual que contradiga los cálculos ejecutados invalida el proceso.

### `RN-11-03` — Capacitación con evidencia
La capacitación requiere lista de asistencia firmada, material entregado y evaluación de aprendizaje. Sin evidencia no se considera cumplido el producto.

### `RN-11-04` — Entrega en formato editable
Los productos deben entregarse en formato editable (Excel, Word) además de PDF, para que la entidad pueda mantenerlos. Entregar solo PDF impide la continuidad del proceso.

### `RN-11-05` — Cierre del ejercicio
Al liquidar el contrato, el ejercicio pasa a estado `CERRADO` y queda inmutable. Los datos permanecen consultables y sirven de base para el siguiente corte.

### `RN-11-06` — Continuidad
La entidad debe quedar con: inventario plaqueteado, hojas de vida actualizadas, manual adoptado, funcionarios capacitados y un ejercicio cerrado que sirva de línea base. Ese es el criterio real de éxito del contrato.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-11-01` | Todos los productos del contrato están generados |
| `VAL-11-02` | Todos los pasos anteriores están en estado cerrado |
| `VAL-11-03` | El manual de activos está adoptado por resolución |
| `VAL-11-04` | Existe registro de capacitación con asistencia firmada |
| `VAL-11-05` | Existe certificación de cumplimiento del supervisor |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-11-06` | Productos entregados solo en PDF (sin formato editable) |
| `VAL-11-07` | Asistencia a capacitación inferior al 70% de los convocados |
| `VAL-11-08` | Bienes que quedaron marcados como incompletos al cierre |
| `VAL-11-09` | Avalúo de inmueble próximo a vencer al momento del cierre |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-11-01` | **Manual de Activos e Inventarios** | Word + PDF | Gerencia / Recursos Físicos | Adoptado por resolución, con los 16 capítulos |
| `EN-11-02` | Resolución de adopción del manual | PDF firmado | Jurídica | Firmada por el Gerente |
| `EN-11-03` | Registro de capacitación | Word / PDF + listas | Talento Humano | Asistencia firmada y evaluación aplicada |
| `EN-11-04` | Expediente completo del proceso | Digital (estructurado) + físico | Archivo institucional | Todos los productos de los pasos 01 a 10 |
| `EN-11-05` | Acta de entrega final de productos | Word / PDF | Supervisor / Gerencia | Firmada por las tres partes |
| `EN-11-06` | Certificación de cumplimiento | PDF | Contratación | Emitida por el supervisor |
| `EN-11-07` | Acta de liquidación del contrato | PDF firmado | Contratación | Con paz y salvo de las partes |
| `EN-11-08` | Bases de datos en formato editable | Excel | Recursos Físicos / Contabilidad | Inventario, hojas de vida, cálculos |
| `EN-11-09` | Informe final de gestión | Word / PDF | Gerencia | Resumen ejecutivo del proceso y resultados |

---

## 10. Implementación en la app

### 10.1 Entidades

```
ProductoContractual(id, ejercicio_id, codigo_producto, nombre,
                    paso_origen, formato_requerido, estado,
                    entregable_url, fecha_entrega, verificado_por)

Capacitacion(id, ejercicio_id, sesion, tema, fecha, duracion,
             dirigido_a, contenido, metodologia, material_url,
             lista_asistencia_url, resultado_evaluacion)

ActaEntrega(id, ejercicio_id, numero_contrato, fecha,
            productos_json, documento_url, estado_firma)

CierreEjercicio(id, ejercicio_id, fecha_cierre, cerrado_por,
                acta_liquidacion_url, observaciones, inmutable)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-11-01` | Matriz de productos contractuales con estado y verificación |
| `RF-11-02` | Generación del Manual de Activos a partir de los parámetros del ejercicio |
| `RF-11-03` | Compilación automática del expediente en estructura de carpetas |
| `RF-11-04` | Exportación completa en formatos editables |
| `RF-11-05` | Registro de capacitaciones con carga de listas de asistencia |
| `RF-11-06` | Generación del acta de entrega final desde la matriz de productos |
| `RF-11-07` | Cierre del ejercicio con bloqueo de edición |
| `RF-11-08` | Apertura del siguiente ejercicio heredando bienes y parámetros |
| `RF-11-09` | Generación del informe final de gestión con indicadores del proceso |

### 10.3 Pantallas

1. **Matriz de productos** — semáforo de completitud por producto contractual.
2. **Generador del manual** — selección de capítulos y previsualización.
3. **Compilador del expediente** — árbol de carpetas y descarga completa.
4. **Registro de capacitación** — sesiones, asistentes y evidencias.
5. **Cierre del ejercicio** — lista de verificación final y confirmación.

---

## 11. Definición de completado (DoD)

- [ ] 100% de productos contractuales generados y verificados.
- [ ] Manual de activos adoptado por resolución.
- [ ] Capacitación ejecutada con evidencia.
- [ ] Expediente compilado y entregado en formato editable y PDF.
- [ ] Acta de entrega final y acta de liquidación firmadas.
- [ ] Ejercicio en estado `CERRADO` e inmutable.

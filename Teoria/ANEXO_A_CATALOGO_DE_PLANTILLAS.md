# Anexo A — Catálogo de Plantillas

Referencia única de todos los archivos plantilla del proceso: **cuál se llena, en qué paso, quién lo llena y en qué entregable se convierte**.

---

## 1. Tabla maestra de plantillas

| Código | Archivo | Paso | Quién la diligencia | Se convierte en |
|---|---|:-:|---|---|
| `PL-01` | `PL-01_parametros_entidad.xlsx` | 01 | Contratista | `EN-01-01` Ficha de parametrización |
| `PL-02` | `PL-02_clases_vida_util.xlsx` | 01 | Contratista + Contador | `EN-01-02` Catálogo aprobado |
| `PL-02b` | `PL-02b_sedes_servicios.xlsx` | 01 | Recursos Físicos | `EN-01-03` Estructura organizacional |
| `PL-03` | `PL-03_toma_inventario_fisico.xlsx` | 02 | Técnicos de conteo | `EN-02-01` Inventario físico |
| `PL-04` | `PL-04_etiquetas_plaqueteo.xlsx` | 02 | App (generación) | `EN-02-02` Bienes plaqueteados |
| `PL-05` | `PL-05_hoja_de_vida.xlsx` | 03 | Especialistas | `EN-03-01/02` Hojas de vida |
| `PL-06` | `PL-06_saldos_contables.xlsx` | 04 | Contador | Insumo de conciliación |
| `PL-07` | `PL-07_conciliacion.xlsx` | 04 | App + Contador | `EN-04-02` Matriz de conciliación |
| `PL-07b` | `PL-07b_partidas_conciliatorias.xlsx` | 04 | Contratista + Contador | `EN-04-03` Detalle de partidas |
| `PL-08` | `PL-08_indice_obsolescencia.xlsx` | 05 | App + Especialista | `EN-05-01` Reporte de obsolescencia |
| `PL-08b` | `PL-08b_override_vida_util.xlsx` | 05 | Especialista | `EN-05-05` Actas de ajuste |
| `PL-09` | `PL-09_depreciacion.xlsx` | 06 | App + Contador | `EN-06-01` Listado depurado |
| `PL-09b` | `PL-09b_deterioro.xlsx` | 06 | Especialista | `EN-06-03` Registro de deterioro |
| `PL-10` | `PL-10_valuacion_muebles.xlsx` | 07 | Especialistas | `EN-07-02` Inventario valorizado |
| `PL-10b` | `PL-10b_referencias_mercado.xlsx` | 07 | Contratista | `EN-07-04` Expediente de mercado |
| `PL-11` | `PL-11_ficha_inmueble.xlsx` | 08 | Perito + Contratista | `EN-08-03` Ficha de inmueble |
| `PL-11b` | `PL-11b_estudio_mercado_inmueble.xlsx` | 08 | Perito | Soporte del avalúo |
| `PL-12` | `PL-12_acta_custodia.docx` | 02 | Recursos Físicos | `EN-02-03` Actas de custodia |
| `PL-13` | `PL-13_baja_de_bienes.xlsx` | 09 | Especialistas | `EN-09-02` Listado de bajas |
| `PL-13b` | `PL-13b_certificacion_tecnica_baja.docx` | 09 | Especialista | `EN-09-01` Certificación técnica |
| `PL-13c` | `PL-13c_acta_disposicion_final.docx` | 09 | Gestión ambiental | `EN-09-07` Actas de disposición |
| `PL-14` | `PL-14_consolidado_subcuentas.xlsx` | 10 | App + Contador | `EN-10-01` Cuadro consolidado |
| `PL-15` | `PL-15_resolucion_valuacion.docx` | 10 | Contratista → Gerente | `EN-10-02/04` Resoluciones |
| `PL-15b` | Catálogo de resoluciones | 10 | Contratista | Guía de actos a emitir |
| `PL-16` | `PL-16_acta_comite.docx` | 10 | Secretaría del Comité | `EN-10-03` Acta del Comité |
| `PL-17` | `PL-17_acta_entrega_final.docx` | 11 | Contratista + Supervisor | `EN-11-05` Acta de entrega |
| `PL-18` | `PL-18_manual_activos.docx` | 11 | Contratista | `EN-11-01` Manual de activos |
| `PL-19` | `PL-19_plan_capacitacion.xlsx` | 11 | Contratista | `EN-11-03` Registro de capacitación |
| `PL-20` | `PL-20_acta_liquidacion.docx` | 11 | Contratación | `EN-11-07` Acta de liquidación |

---

## 2. Clasificación por tipo

### 2.1 Plantillas de **configuración** (se llenan una vez por entidad)
`PL-01`, `PL-02`, `PL-02b`

### 2.2 Plantillas de **captura en campo** (alto volumen)
`PL-03`, `PL-05`

### 2.3 Plantillas de **importación** (vienen de terceros)
`PL-06` (contabilidad), `PL-11b` (perito)

### 2.4 Plantillas **generadas por la app** (el usuario no las teclea)
`PL-04`, `PL-07`, `PL-08`, `PL-09`, `PL-14`

### 2.5 Plantillas de **decisión técnica** (requieren juicio humano)
`PL-08b`, `PL-09b`, `PL-10`, `PL-13`

### 2.6 Plantillas **documentales** (Word, se generan con datos)
`PL-12`, `PL-13b`, `PL-13c`, `PL-15`, `PL-16`, `PL-17`, `PL-18`, `PL-20`

---

## 3. Convenciones comunes a todas las plantillas Excel

### 3.1 Estructura de archivo

| Elemento | Regla |
|---|---|
| Fila 1–3 | Encabezado institucional (entidad, proceso, fecha de referencia) |
| Fila 4 | Nombres de columna (**exactos**, sin cambiar) |
| Fila 5 en adelante | Datos, una fila por registro |
| Hoja | Una por clase de activo cuando el volumen lo amerite |

### 3.2 Tipos de dato

| Tipo | Formato esperado | Ejemplo |
|---|---|---|
| texto | Cadena, sin saltos de línea | `HSV01AGM01` |
| fecha | `AAAA-MM-DD` (ISO) preferido; se aceptan `DD/MM/AAAA` con normalización | `2025-06-30` |
| moneda | Número sin símbolo ni separador de miles | `1788720` |
| número | Decimal con punto | `10.38` |
| entero | Sin decimales | `180` |
| lista | Valor exacto del catálogo | `BUENO` |
| sí/no | `SI` / `NO` | `SI` |
| archivo | Ruta o nombre del adjunto | `factura_001.pdf` |

### 3.3 Reglas de importación obligatorias

1. **Nunca adivinar.** Un dato no interpretable se reporta como error de fila, no se corrige silenciosamente.
2. **Reporte fila por fila.** El importador devuelve número de fila, columna, valor recibido y motivo del rechazo.
3. **Todo o nada por lote.** Si hay errores bloqueantes, no se importa parcialmente sin confirmación explícita.
4. **Normalización de fechas** documentada: qué formato se detectó y a cuál se convirtió.
5. **Normalización de texto**: eliminar espacios extremos, unificar mayúsculas en campos de lista.
6. **Trazabilidad**: guardar el archivo original importado con usuario y fecha.

### 3.4 Valores especiales frecuentes en datos reales

| Valor encontrado | Interpretación |
|---|---|
| `NO REGISTRA`, `NT`, `N/A`, `-`, vacío | Dato no disponible → campo nulo, no cero |
| `0` en un campo de moneda | Dato faltante (ver `RN-03-02`), salvo donación con acta |
| Serie duplicada | Advertencia, no error |
| Fecha en texto (`19/07/2019`) | Normalizar a ISO |

---

## 4. Convenciones de las plantillas documentales (Word)

### 4.1 Marcadores de reemplazo
Las plantillas `.docx` usan marcadores que la app sustituye:

| Marcador | Reemplazo |
|---|---|
| `{{ENTIDAD_RAZON_SOCIAL}}` | Razón social |
| `{{ENTIDAD_NIT}}` | NIT |
| `{{MUNICIPIO}}` / `{{DEPARTAMENTO}}` | Ubicación |
| `{{GERENTE_NOMBRE}}` | Nombre del gerente |
| `{{GERENTE_ACTO_NOMBRAMIENTO}}` | Decreto o resolución |
| `{{FECHA_CORTE}}` | Fecha de corte del ejercicio |
| `{{NUMERO_RESOLUCION}}` / `{{FECHA_RESOLUCION}}` | Identificación del acto |
| `{{ACTA_COMITE_NUMERO}}` / `{{ACTA_COMITE_FECHA}}` | Respaldo |
| `{{TABLA_SALDOS_ANTERIORES}}` | Cuadro generado |
| `{{TABLA_NUEVOS_SALDOS}}` | Cuadro generado |
| `{{TABLA_DEPRECIACION}}` | Cuadro generado |
| `{{PREPARO}}` / `{{REVISO}}` | Cadena de responsabilidad |

### 4.2 Regla
Las plantillas documentales son **editables por la entidad**. La app no debe tener textos jurídicos escritos en el código: se cargan como plantillas y se versionan.

---

## 5. Matriz plantilla → entregable → destinatario

| Plantilla | Entregable | Destinatario final | Requiere firma |
|---|---|---|:-:|
| `PL-03` | Inventario físico | Comité / Recursos Físicos | Jefe de servicio |
| `PL-05` | Hojas de vida | E.S.E | Especialista |
| `PL-07`/`PL-07b` | Diagnóstico inicial | Comité / Gerencia | Contador |
| `PL-08` | Reporte de obsolescencia | Comité | Especialista |
| `PL-09` | Listado depurado | Contador | Contador |
| `PL-10` | Informe de valuación | Comité / Gerencia | Especialista |
| `PL-11` | Informe de avalúo | Comité / Contador | Perito (R.A.A) |
| `PL-13` | Certificación de bajas | Comité | Especialista |
| `PL-14` | Consolidado por subcuenta | Contador | Contador |
| `PL-15` | Resoluciones | Contador / Jurídica | Gerente |
| `PL-16` | Acta del Comité | Gerencia | Miembros del Comité |
| `PL-18` | Manual de activos | Gerencia | Gerente (resolución) |
| `PL-17`/`PL-20` | Entrega y liquidación | Contratación | Todas las partes |

---

## 6. Recomendación de implementación

La app debe:

1. **Ofrecer la descarga de cada plantilla en blanco**, ya parametrizada con los catálogos de la entidad (listas desplegables con las clases, sedes y servicios reales).
2. **Validar antes de importar**, mostrando una previsualización con errores resaltados.
3. **Versionar las plantillas**: si la entidad ajusta una, conservar la versión usada en cada ejercicio.
4. **Generar los documentos Word** con los marcadores reemplazados, sin intervención manual.

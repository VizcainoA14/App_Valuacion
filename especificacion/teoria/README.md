# Base Teórica — Aplicación de Valuación de Activos para E.S.E / Hospitales

**Versión:** 2.1 · *corregida el 2026-09-01, ver `CORRECCIONES.md`*
**Ámbito:** Valuación de activos dentro del proceso de saneamiento contable de la cuenta de Propiedad, Planta y Equipo (PPE) de una Empresa Social del Estado.
**Propósito de este repositorio documental:** servir como especificación funcional y base teórica para construir una aplicación que automatice el proceso **en cualquier hospital**, sin depender de los datos de una entidad concreta.

---

## 1. Cómo está organizado

El proceso se descompone en **11 pasos** más **4 anexos transversales**. Cada paso está en su propio archivo y sigue **siempre la misma estructura**, de forma que el desarrollador siempre encuentra la información en el mismo lugar:

| Sección | Qué contiene |
|---|---|
| 1. Propósito | Para qué existe el paso |
| 2. Alcance | Qué incluye y qué NO incluye |
| 3. Actores | Quién hace qué (RACI) |
| 4. **Entradas — qué se debe solicitar** | Insumos, a quién se piden, formato y obligatoriedad |
| 5. **Plantillas que se diligencian** | Archivos plantilla y sus columnas exactas |
| 6. Procedimiento | Secuencia operativa |
| 7. Reglas de negocio | Lógica que la app debe implementar |
| 8. Validaciones | Bloqueantes y advertencias |
| 9. **Salidas — qué se entrega** | Entregables, formato, destinatario, criterio de aceptación |
| 10. Implementación en la app | Entidades, requisitos funcionales, pantallas |
| 11. Definición de completado | Cuándo el paso puede cerrarse |

---

## 2. Índice de documentos

### Marco
| Archivo | Contenido |
|---|---|
| `00_MARCO_GENERAL.md` | Fundamento teórico, alcance, flujo completo, principios de diseño |

### Pasos del proceso
| # | Archivo | Paso |
|---|---|---|
| 01 | `01_PARAMETRIZACION_DE_LA_ENTIDAD.md` | Parametrización de la entidad (hace la app reutilizable) |
| 02 | `02_INVENTARIO_FISICO_Y_PLAQUETEO.md` | Inventario físico y plaqueteo |
| 03 | `03_HOJA_DE_VIDA_DE_BIENES.md` | Hoja de vida de bienes y equipos |
| 04 | `04_CONCILIACION_FISICO_CONTABLE.md` | Conciliación físico vs. contable |
| 05 | `05_INDICE_DE_OBSOLESCENCIA.md` | Índice de obsolescencia |
| 06 | `06_DEPRECIACION_Y_DETERIORO.md` | Depreciación acumulada y deterioro |
| 07 | `07_VALUACION_TECNICA_DE_MUEBLES.md` | Valuación técnica de bienes muebles |
| 08 | `08_VALUACION_DE_INMUEBLES.md` | Valuación de inmuebles (peritazgo) |
| 09 | `09_BAJA_DE_BIENES.md` | Clasificación y baja de bienes |
| 10 | `10_CONSOLIDACION_Y_ACTOS_ADMINISTRATIVOS.md` | Consolidación y actos administrativos |
| 11 | `11_ENTREGA_FINAL_Y_CIERRE.md` | Entrega final y cierre del contrato |

### Anexos transversales
| Archivo | Contenido |
|---|---|
| `ANEXO_A_CATALOGO_DE_PLANTILLAS.md` | Todas las plantillas con sus columnas exactas |
| `ANEXO_B_DICCIONARIO_DE_DATOS.md` | Modelo de datos completo de la app |
| `ANEXO_C_FORMULAS_Y_REGLAS.md` | Motor de cálculo: fórmulas, casos borde, pseudocódigo |
| `ANEXO_D_MARCO_NORMATIVO.md` | Normatividad aplicable y cómo se traduce a requisitos |
| `CORRECCIONES.md` | **Registro de correcciones aplicadas a esta base teórica** (v2.0 → v2.1) |

---

## 3. Sistema de códigos

Para poder referenciar cualquier elemento desde el código de la app:

| Prefijo | Significado | Ejemplo |
|---|---|---|
| `IN-nn-nn` | Insumo de entrada | `IN-04-01` = insumo 1 del paso 4 |
| `PL-nn` | Plantilla | `PL-03` = plantilla de inventario físico |
| `EN-nn-nn` | Entregable | `EN-09-02` = entregable 2 del paso 9 |
| `RN-nn-nn` | Regla de negocio | `RN-06-01` |
| `VAL-nn-nn` | Validación | `VAL-05-02` |
| `RF-nn-nn` | Requisito funcional de la app | `RF-02-03` |

---

## 4. Principio rector: nada está "quemado" en el código

Todo dato que cambie de un hospital a otro es **parámetro**, no constante:

- Identificación de la entidad, sedes y servicios.
- Catálogo de clases de activo y su vida útil.
- Convención de codificación del plaqueteo.
- Método de depreciación y de conteo de meses.
- Fecha de corte del ejercicio.
- Plan de cuentas / subcuentas contables.
- Umbrales del semáforo de obsolescencia.
- Plantillas documentales (resoluciones, actas, certificaciones).

Ver `01_PARAMETRIZACION_DE_LA_ENTIDAD.md`.

---

## 5. Orden de lectura sugerido

1. `00_MARCO_GENERAL.md` — entender el proceso completo.
2. `ANEXO_B_DICCIONARIO_DE_DATOS.md` — entender el modelo de datos.
3. `ANEXO_C_FORMULAS_Y_REGLAS.md` — entender el motor de cálculo.
4. Los pasos 01 → 11 en orden.
5. `ANEXO_A_CATALOGO_DE_PLANTILLAS.md` como referencia permanente.

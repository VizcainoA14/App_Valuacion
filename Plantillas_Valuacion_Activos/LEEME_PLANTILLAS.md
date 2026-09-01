# Plantillas del Proceso de Valuación de Activos

**28 archivos** (20 Excel + 8 Word) que implementan el catálogo del `ANEXO_A_CATALOGO_DE_PLANTILLAS.md`.
Aplicables a **cualquier E.S.E / hospital**: nada está fijado a una entidad concreta.

---

## 1. Cómo empezar

1. Diligencie **PL-01**, **PL-02** y **PL-02b**: son la configuración de la entidad. Se llenan una sola vez.
2. Siga el orden de los pasos. Cada plantilla dice en su hoja `INSTRUCTIVO` qué debe solicitar antes de usarla y en qué entregable se convierte.
3. **Borre siempre la fila de ejemplo** (fila 7, en azul claro) antes de entregar el archivo.

---

## 2. Convenciones de los archivos Excel

Todos los libros tienen la misma estructura:

| Hoja | Contenido |
|---|---|
| `INSTRUCTIVO` | Paso, responsable, qué solicitar, código de colores, reglas y diccionario de columnas |
| Hoja(s) de datos | Fila 6 = encabezados · Fila 7 = ejemplo · Fila 8 en adelante = captura |

**Código de colores**

| Color | Significado |
|---|---|
| Amarillo | Celda a diligenciar |
| Gris | Celda calculada — no escribir, contiene fórmula |
| Azul claro | Fila de ejemplo — bórrela antes de usar |
| Verde | Parámetro de configuración |

**Reglas comunes**

- Los **nombres de columna están en ASCII sin tildes a propósito**: la aplicación los usa como identificadores de importación. No los modifique.
- Fechas en `AAAA-MM-DD`. Valores en pesos, sin puntos de miles ni símbolo `$`.
- Dato inexistente: **deje la celda vacía**. No escriba cero ni "NO REGISTRA".
- Las listas desplegables validan los valores permitidos.

---

## 3. Plantillas que calculan solas

Cuatro libros traen el motor de cálculo embebido en fórmulas:

| Plantilla | Qué calcula | Celda a configurar |
|---|---|---|
| `PL-08` | Edad, índice de obsolescencia, años restantes, fin de vida útil, semáforo, candidato a baja | `B3` fecha de corte · `H3` y `J3` umbrales |
| `PL-09` | Saldo ajustado, base depreciable, depreciación mensual y acumulada, saldo por depreciar, valor neto | `B3` fecha de corte · `H3` % residual · **`J3` método de conteo** |
| `PL-10` | Factor de estado, factor de vida restante, avalúo sugerido, tipo de ajuste | — |
| `PL-11` / `PL-11b` | Valor de terreno y construcción, vigencia del avalúo, estadística del estudio de mercado | `B3` fecha de corte |

> **Importante — celda `J3` de PL-09.** Define el método de conteo de meses (`mes_completo` o `dias_exactos`). Cambia materialmente el resultado de la depreciación y **debe constar en acta firmada por el contador** antes de calcular. Ver `ANEXO_C_FORMULAS_Y_REGLAS.md` §3.3.

Cambiar la fecha de corte en `B3` recalcula el archivo completo.

---

## 4. Convenciones de los documentos Word

Los ocho documentos usan **marcadores de reemplazo** `{{NOMBRE}}` que la aplicación sustituye con los datos de la entidad:

| Marcador | Reemplazo |
|---|---|
| `{{ENTIDAD_RAZON_SOCIAL}}` · `{{ENTIDAD_NIT}}` | Identificación de la entidad |
| `{{MUNICIPIO}}` · `{{DEPARTAMENTO}}` | Ubicación |
| `{{GERENTE_NOMBRE}}` · `{{ACTO_NOMBRAMIENTO_GERENTE}}` | Firmante |
| `{{FECHA_CORTE}}` | Fecha de corte del ejercicio |
| `{{NUMERO_RESOLUCION}}` · `{{ACTA_COMITE_NUMERO}}` | Identificación del acto y su respaldo |
| `{{TABLA_*}}` · `{{SUBCUENTA}}` · `{{SALDO_ANTERIOR}}` … | Cuadros generados desde PL-14 |

Cada documento abre con un recuadro **"CÓMO USAR ESTA PLANTILLA"**: elimínelo en la versión definitiva.

El texto jurídico es **editable por la entidad**. Verifique la vigencia de las normas citadas antes de firmar (ver `ANEXO_D_MARCO_NORMATIVO.md`).

---

## 5. Inventario de archivos

### Excel (20)

| Código | Archivo | Paso |
|---|---|:-:|
| PL-01 | `PL-01_parametros_entidad.xlsx` | 01 |
| PL-02 | `PL-02_clases_vida_util.xlsx` | 01 |
| PL-02b | `PL-02b_sedes_servicios.xlsx` | 01 |
| PL-03 | `PL-03_toma_inventario_fisico.xlsx` | 02 |
| PL-04 | `PL-04_etiquetas_plaqueteo.xlsx` | 02 |
| PL-05 | `PL-05_hoja_de_vida.xlsx` | 03 |
| PL-06 | `PL-06_saldos_contables.xlsx` | 04 |
| PL-07 | `PL-07_conciliacion.xlsx` | 04 |
| PL-07b | `PL-07b_partidas_conciliatorias.xlsx` | 04 |
| PL-08 | `PL-08_indice_obsolescencia.xlsx` | 05 |
| PL-08b | `PL-08b_override_vida_util.xlsx` | 05 |
| PL-09 | `PL-09_depreciacion.xlsx` | 06 |
| PL-09b | `PL-09b_deterioro.xlsx` | 06 |
| PL-10 | `PL-10_valuacion_muebles.xlsx` | 07 |
| PL-10b | `PL-10b_referencias_mercado.xlsx` | 07 |
| PL-11 | `PL-11_ficha_inmueble.xlsx` | 08 |
| PL-11b | `PL-11b_estudio_mercado_inmueble.xlsx` | 08 |
| PL-13 | `PL-13_baja_de_bienes.xlsx` | 09 |
| PL-14 | `PL-14_consolidado_subcuentas.xlsx` | 10 |
| PL-19 | `PL-19_plan_capacitacion.xlsx` | 11 |

### Word (8)

| Código | Archivo | Paso |
|---|---|:-:|
| PL-12 | `PL-12_acta_custodia.docx` | 02 |
| PL-13b | `PL-13b_certificacion_tecnica_baja.docx` | 09 |
| PL-13c | `PL-13c_acta_disposicion_final.docx` | 09 |
| PL-15 | `PL-15_resolucion_valuacion.docx` | 10 |
| PL-16 | `PL-16_acta_comite.docx` | 10 |
| PL-17 | `PL-17_acta_entrega_final.docx` | 11 |
| PL-18 | `PL-18_manual_activos.docx` | 11 |
| PL-20 | `PL-20_acta_liquidacion.docx` | 11 |

---

## 6. Verificación aplicada

- Las 20 plantillas Excel pasan `recalc.py` con **0 errores de fórmula**.
- Los 8 documentos Word pasan la validación XSD de Word.
- El motor de cálculo fue contrastado contra un caso real de avalúo hospitalario: el valor total del inmueble reproduce el peritazgo de referencia con una diferencia de 0,001% (redondeo del valor por m²).

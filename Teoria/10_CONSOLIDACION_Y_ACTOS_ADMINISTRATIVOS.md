# Paso 10 — Consolidación y Actos Administrativos

> **Bloque:** IV — Formalización · **Responsable:** Contador + Comité + Gerente · **Precondición:** Pasos 04 a 09 cerrados

---

## 1. Propósito

Totalizar los resultados de la valuación por subcuenta contable y traducirlos en los actos administrativos que ordenan al contador causar los nuevos saldos. Es el paso que convierte el trabajo técnico en **efecto jurídico y contable**.

---

## 2. Alcance

**Incluye:** consolidación por subcuenta, cuadro de ajustes, actas del Comité y proyectos de resolución.

**No incluye:** el registro contable en sí (lo ejecuta el contador en su software) ni la publicación en SECOP.

---

## 3. Actores

| Actor | R | A | C | I |
|---|:-:|:-:|:-:|:-:|
| Coordinador de valuación (proyecta) | X | | | |
| Contador | X | | | |
| Comité de Saneamiento Contable | | X | | |
| Gerente (firma) | | X | | |
| Asesor jurídico (revisa) | | | X | |
| Control Interno | | | | X |

---

## 4. Entradas — qué se debe solicitar

| Código | Insumo | A quién se solicita | Formato | Oblig. | Para qué se usa |
|---|---|---|---|:-:|---|
| `IN-10-01` | Resultados consolidados de los pasos 04 a 09 | Interno | Datos del sistema | Sí | Cuadros de ajuste |
| `IN-10-02` | Saldos contables anteriores por subcuenta | Paso 04 (interno) | Dato del sistema | Sí | Columna "saldo anterior" |
| `IN-10-03` | Manual de Políticas Contables vigente | Contador | PDF | Sí | Fundamento de los ajustes |
| `IN-10-04` | Acto de conformación del Comité y su reglamento | Jurídica | PDF | Sí | Validez de las sesiones |
| `IN-10-05` | Plantillas institucionales de resolución y acta | Jurídica | Word | Sí | Formato de los documentos |
| `IN-10-06` | Convocatoria y quórum de la sesión del Comité | Secretaría del Comité | Documento | Sí | Validez de la decisión |
| `IN-10-07` | Concepto del asesor jurídico sobre los proyectos | Jurídica | Documento | Sí | Revisión de legalidad |
| `IN-10-08` | Datos del gerente y su acto de nombramiento | Paso 01 (interno) | Parámetro | Sí | Encabezado y firma |

---

## 5. Plantillas que se diligencian

### `PL-14` — Consolidado por subcuenta
Archivo: `PL-14_consolidado_subcuentas.xlsx` · Generado por la app

| # | Columna | Origen | Descripción |
|:-:|---|---|---|
| 1 | `subcuenta` | Paso 01 | Código contable |
| 2 | `nombre_subcuenta` | Paso 01 | |
| 3 | `saldo_anterior` | Paso 04 | Al cierre de la vigencia previa |
| 4 | `incorporaciones` | Paso 04 | Sobrantes físicos |
| 5 | `retiros_por_baja` | Paso 09 | Valor bruto de bajas |
| 6 | `ajustes_de_valor` | Pasos 04 y 07 | Correcciones de valor |
| 7 | `valorizaciones` | Paso 07 | Mayor valor por avalúo |
| 8 | `desvalorizaciones` | Paso 07 | Menor valor por avalúo |
| 9 | `nuevo_saldo_bruto` | **Calculado** | (3)+(4)−(5)±(6)±(7,8) |
| 10 | `depreciacion_acum_anterior` | Paso 04 | |
| 11 | `ajuste_depreciacion` | Paso 06 | Diferencia recalculada |
| 12 | `depreciacion_retirada_por_baja` | Paso 09 | |
| 13 | `nueva_depreciacion_acumulada` | **Calculado** | (10)±(11)−(12) |
| 14 | `deterioro_anterior` | Paso 04 | |
| 15 | `nuevo_deterioro` | Paso 06 | |
| 16 | `valor_neto_final` | **Calculado** | (9)−(13)−(15) |
| 17 | `cantidad_bienes` | Pasos 02 y 09 | Ítems activos tras el ajuste |

### `PL-15` — Plantilla de resolución de valuación
Archivo: `PL-15_resolucion_valuacion.docx` · Documento parametrizable

Estructura del acto administrativo:

| Sección | Contenido | Fuente de datos |
|---|---|---|
| Encabezado institucional | Departamento, municipio, entidad, NIT, logo | `PL-01` |
| Número y fecha | Resolución No. ___ de ___ | Captura |
| Epígrafe | "Por la cual se establece la depuración integral de la cuenta del activo no corriente — Propiedad, Planta y Equipos — [subcuentas], valuación técnica, cálculo del índice de obsolescencia y actualización de la depreciación acumulada a corte [fecha]" | Parámetros |
| Competencia | Facultades legales del gerente | `PL-01` |
| Fundamento normativo | Normas aplicables | `ANEXO_D` |
| Considerandos | Necesidad, contratación del proceso, hallazgos y metodología | Paso 04 |
| **Artículo 1** | Ordena depurar y ajustar el saldo de la subcuenta (con cuadro de saldos) | `PL-14` col. 3, 9 |
| **Parágrafo Art. 1** | Ajuste de depreciación acumulada y deterioro | `PL-14` col. 10–15 |
| **Artículo 2** | Ordena causar los nuevos saldos conciliados con hojas de vida, índice de obsolescencia y depreciación | `PL-14` |
| **Parágrafo Art. 2** | Reconocimiento de hechos económicos, medición y refrendación del Comité | Texto tipo |
| **Artículo 3** | Ajuste de la cuenta crédito de depreciación acumulada y deterioro | `PL-14` |
| **Artículo 4** | Vigencia y derogatorias, con referencia al acta del Comité | Acta |
| Firma | Gerente | `PL-01` |
| Pie | Preparó / Revisó | Parámetros |

### `PL-16` — Acta de sesión del Comité de Saneamiento
Archivo: `PL-16_acta_comite.docx`

| Sección | Contenido |
|---|---|
| Encabezado | Entidad, acta No., fecha, hora, lugar |
| Asistentes y quórum | Nombres, cargos, verificación de quórum |
| Orden del día | Puntos a tratar |
| Desarrollo | Presentación de resultados por paso |
| Deliberaciones | Observaciones de los miembros |
| **Decisiones** | Aprobaciones de valuación, bajas y ajustes, con cuadros |
| Compromisos | Responsable y fecha |
| Firmas | Todos los asistentes |

### `PL-15b` — Catálogo de resoluciones del proceso

| Código | Resolución | Depende de |
|---|---|---|
| `R-01` | Actualización del Comité de Saneamiento Contable | Paso 01 |
| `R-02` | Depuración de inventarios | Paso 04 |
| `R-03` | Depuración de la cuenta de Propiedad, Planta y Equipos | Pasos 04, 06, 07 |
| `R-04` | Valuación de equipos médico-científicos | Pasos 05, 06, 07 |
| `R-05` | Valuación de maquinaria, muebles, cómputo, transporte y cocina | Pasos 05, 06, 07 |
| `R-06` | Ajustes de la depreciación acumulada | Paso 06 |
| `R-07` | Proceso de baja de bienes y activos | Paso 09 |
| `R-08` | Legalización de terrenos e infraestructura | Paso 08 |
| `R-09` | Actualización del manual de políticas contables | Paso 11 |
| `R-10` | Adopción del manual de activos e inventarios | Paso 11 |

---

## 6. Procedimiento

1. Ejecutar la consolidación automática por subcuenta (`PL-14`).
2. Verificar el cuadre en tres niveles (`RN-10-02`).
3. El contador valida los cuadros de ajuste.
4. Proyectar las resoluciones aplicables del catálogo `PL-15b`.
5. Remitir los proyectos al asesor jurídico para revisión de legalidad.
6. Convocar la sesión del Comité con la documentación completa.
7. Sesionar: presentar resultados, deliberar y decidir.
8. Levantar el acta (`PL-16`) con las decisiones y los cuadros aprobados.
9. Numerar y suscribir las resoluciones por el Gerente.
10. Entregar al contador para la causación.
11. Archivar el expediente completo.

---

## 7. Reglas de negocio

### `RN-10-01` — Fórmula de consolidación

```
nuevo_saldo_bruto = saldo_anterior
                  + incorporaciones
                  − retiros_por_baja
                  ± ajustes_de_valor
                  + valorizaciones
                  − desvalorizaciones

nueva_depreciacion_acumulada = depreciacion_acum_anterior
                             ± ajuste_depreciacion
                             − depreciacion_retirada_por_baja

valor_neto_final = nuevo_saldo_bruto
                 − nueva_depreciacion_acumulada
                 − nuevo_deterioro
```

### `RN-10-02` — Cuadre obligatorio en tres niveles
No se emite ninguna resolución si no se cumple simultáneamente:

```
Σ (detalle por bien)  =  saldo del auxiliar contable  =  saldo del mayor
```

La app debe mostrar el resultado de esta verificación y bloquear la generación si falla.

### `RN-10-03` — Una resolución por grupo homogéneo de subcuentas
La práctica de referencia separa: (a) equipos médico-científicos y (b) el resto de bienes (maquinaria, muebles, cómputo, transporte, cocina), porque los valúan especialistas distintos y su sustento técnico es diferente.

### `RN-10-04` — Ningún ajuste sin acta
Toda resolución debe citar el acta del Comité que la respalda, con número y fecha. La app no debe permitir emitir un acto sin acta asociada.

### `RN-10-05` — Cadena de responsabilidad documental
El pie de cada acto debe registrar quién **preparó** (firma contratista), quién **revisó** (asesor jurídico) y quién **firma** (Gerente).

### `RN-10-06` — Numeración y consecutivo
La numeración de resoluciones la asigna la entidad según su consecutivo oficial. La app permite registrarlo pero no lo inventa.

### `RN-10-07` — Inmutabilidad tras la firma
Emitida y firmada una resolución, los cálculos que la sustentan quedan **congelados**. Cualquier corrección posterior exige un nuevo acto administrativo que modifique el anterior, nunca la edición del original.

### `RN-10-08` — Efecto en cuentas de resultado
Las desvalorizaciones y las pérdidas por baja afectan el resultado del ejercicio; las valorizaciones afectan el patrimonio conforme al marco normativo aplicable. La resolución debe indicar la afectación esperada para orientar al contador.

---

## 8. Validaciones

**Bloqueantes:**

| Código | Validación |
|---|---|
| `VAL-10-01` | Los pasos 04 a 09 están cerrados |
| `VAL-10-02` | El cuadre en tres niveles es exitoso en todas las subcuentas |
| `VAL-10-03` | Existe acta del Comité con quórum válido |
| `VAL-10-04` | Todas las resoluciones citan su acta de respaldo |
| `VAL-10-05` | Ningún nuevo saldo neto es negativo |
| `VAL-10-06` | Las bajas incluidas están aprobadas por el Comité |
| `VAL-10-07` | Existe concepto del asesor jurídico sobre los proyectos |

**Advertencias:**

| Código | Advertencia |
|---|---|
| `VAL-10-08` | Variación patrimonial superior al 30% frente al saldo anterior |
| `VAL-10-09` | Subcuenta que queda en cero tras el ajuste |
| `VAL-10-10` | Resolución proyectada sin número asignado |
| `VAL-10-11` | Diferencia significativa entre el efecto informado y el registrado por el contador |

---

## 9. Salidas — qué se entrega

| Código | Entregable | Formato | Destinatario | Criterio de aceptación |
|---|---|---|---|---|
| `EN-10-01` | **Cuadro consolidado de ajustes por subcuenta** | Excel + PDF | Contador / Comité | `PL-14` cuadrado en tres niveles |
| `EN-10-02` | Proyectos de resolución de valuación | Word / PDF | Gerencia / Jurídica | Con cuadros de saldos incorporados |
| `EN-10-03` | Acta de sesión del Comité de Saneamiento | Word / PDF | Gerencia / auditoría | Firmada, con quórum y decisiones |
| `EN-10-04` | Resoluciones suscritas | PDF firmado | Contador / Jurídica | Numeradas y firmadas por el Gerente |
| `EN-10-05` | Informe de efecto patrimonial del saneamiento | Word / PDF | Gerencia / Comité | Antes y después por subcuenta |
| `EN-10-06` | Expediente documental del proceso | PDF compilado | Archivo institucional | Trazabilidad completa |
| `EN-10-07` | Instructivo de causación para el contador | Word / PDF | Contador | Cuentas afectadas y valores por asiento |

---

## 10. Implementación en la app

### 10.1 Entidades

```
ConsolidadoSubcuenta(id, ejercicio_id, subcuenta, nombre_subcuenta,
                     saldo_anterior, incorporaciones, retiros_por_baja,
                     ajustes_de_valor, valorizaciones, desvalorizaciones,
                     nuevo_saldo_bruto, depreciacion_acum_anterior,
                     ajuste_depreciacion, depreciacion_retirada_baja,
                     nueva_depreciacion_acumulada, deterioro_anterior,
                     nuevo_deterioro, valor_neto_final, cantidad_bienes,
                     calculado_en)

ActaComite(id, ejercicio_id, numero_acta, fecha, lugar, asistentes_json,
           quorum_valido, orden_del_dia, decisiones, documento_url,
           estado_firma)

ActoAdministrativo(id, ejercicio_id, tipo_resolucion, numero, fecha,
                   epigrafe, acta_comite_id, contenido_generado,
                   documento_url, estado, preparo, reviso, firmo,
                   fecha_firma, inmutable)

VerificacionCuadre(id, ejercicio_id, subcuenta, total_detalle,
                   total_auxiliar, total_mayor, cuadra, diferencia,
                   verificado_en)
```

### 10.2 Requisitos funcionales

| Código | Requisito |
|---|---|
| `RF-10-01` | Consolidación automática por subcuenta desde el detalle por bien |
| `RF-10-02` | Verificación de cuadre en tres niveles con semáforo y detalle de diferencias |
| `RF-10-03` | Generación de resoluciones desde plantilla parametrizable, con cuadros incrustados |
| `RF-10-04` | Editor de plantillas documentales con marcadores de reemplazo |
| `RF-10-05` | Gestión de actas del Comité con verificación de quórum |
| `RF-10-06` | Vinculación obligatoria resolución ↔ acta |
| `RF-10-07` | Congelamiento de cálculos al firmar la resolución |
| `RF-10-08` | Generación del instructivo de causación contable |
| `RF-10-09` | Compilación del expediente documental en un único PDF |
| `RF-10-10` | Comparativo patrimonial antes/después con gráficas |

### 10.3 Pantallas

1. **Tablero de consolidación** — subcuentas con semáforo de cuadre.
2. **Generador de resoluciones** — selección de tipo, previsualización y descarga.
3. **Gestión de actas** — registro de sesión, asistentes y decisiones.
4. **Verificador de cuadre** — detalle de diferencias por subcuenta.
5. **Expediente del ejercicio** — árbol documental descargable.

---

## 11. Definición de completado (DoD)

- [ ] Consolidado por subcuenta generado y cuadrado en tres niveles.
- [ ] Acta del Comité firmada con quórum válido.
- [ ] Resoluciones proyectadas, revisadas por jurídica y firmadas por el Gerente.
- [ ] Instructivo de causación entregado al contador.
- [ ] Cálculos congelados e inmutables.

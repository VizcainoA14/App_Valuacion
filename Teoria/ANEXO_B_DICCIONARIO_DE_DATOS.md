# Anexo B — Diccionario de Datos y Modelo de la Aplicación

Modelo de datos completo. Independiente del motor de base de datos.

---

## 1. Mapa de entidades

```
Entidad
 ├── Sede ──── Servicio
 ├── ClaseActivo
 ├── ParametroCalculo
 ├── ConvencionCodigo ── AbreviaturaTipo
 ├── Inmueble ──── AvaluoInmueble ──── OfertaComparable
 │                              └───── DocumentoInmueble
 ├── Responsable          (catálogo de personas; NO son cuentas de acceso)
 └── Ejercicio
      ├── Bien ─────┬── HojaVida ──── SoporteDocumental
      │             ├── FotoBien
      │             ├── MovimientoBien
      │             ├── Mantenimiento
      │             ├── CalculoObsolescencia ── OverrideVidaUtil
      │             ├── CalculoDepreciacion ─── Deterioro
      │             ├── ValuacionMueble
      │             └── PropuestaBaja ─┬── DisposicionFinal
      │                                └── EfectoContableBaja
      ├── SaldoContable
      ├── ActivoContable
      ├── PartidaConciliatoria
      ├── Conciliacion
      ├── ReferenciaMercado
      ├── ConsolidadoSubcuenta
      ├── VerificacionCuadre
      ├── ActaComite
      ├── ActoAdministrativo
      ├── ActaCustodia
      ├── BienEnCustodia
      ├── ProductoContractual
      ├── Capacitacion
      └── Bitacora
```

---

## 2. Entidades de configuración

### 2.1 `Entidad`

| Campo | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | UUID | No | PK |
| `razon_social` | texto(200) | No | Nombre oficial de la E.S.E |
| `nit` | texto(20) | No | Único |
| `municipio` | texto(100) | No | |
| `departamento` | texto(100) | No | |
| `nivel_complejidad` | enum | No | I, II, III |
| `nombre_gerente` | texto(150) | No | |
| `acto_nombramiento_gerente` | texto(200) | Sí | |
| `direccion` | texto(200) | No | |
| `telefono` | texto(50) | Sí | |
| `email` | texto(150) | Sí | |
| `logo_url` | texto | Sí | |
| `creado_en` | timestamp | No | |

### 2.2 `Sede`

| Campo | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | UUID | No | PK |
| `entidad_id` | UUID | No | FK |
| `codigo` | texto(10) | No | Único por entidad |
| `nombre` | texto(150) | No | |
| `direccion` | texto(200) | No | |
| `municipio` | texto(100) | No | |
| `activa` | booleano | No | Por defecto: verdadero |

### 2.3 `Servicio`

| Campo | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | UUID | No | PK |
| `sede_id` | UUID | No | FK |
| `codigo` | texto(10) | No | Único por sede |
| `nombre` | texto(150) | No | |
| `tipo` | enum | No | asistencial, administrativo, apoyo |
| `responsable` | texto(150) | Sí | |
| `activo` | booleano | No | |

### 2.4 `ClaseActivo`

| Campo | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | UUID | No | PK |
| `entidad_id` | UUID | No | FK |
| `codigo` | texto(10) | No | Ej. `EMC` |
| `nombre` | texto(150) | No | |
| `subcuenta_contable` | texto(20) | No | Código del plan de cuentas |
| `vida_util_contable_meses` | entero | Sí | Nulo si no deprecia |
| `vida_util_tecnica_anios` | decimal(5,2) | Sí | Para obsolescencia |
| `es_depreciable` | booleano | No | Falso para terrenos |
| `requiere_hoja_vida` | booleano | No | |
| `requiere_invima` | booleano | No | |
| `responsable_tecnico` | texto(100) | No | Perfil que valúa |
| `activo` | booleano | No | |

### 2.5 `ParametroCalculo`

| Campo | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | UUID | No | PK |
| `entidad_id` | UUID | No | FK |
| `clave` | texto(60) | No | Ver tabla de claves |
| `valor` | texto(200) | No | Serializado |
| `tipo_dato` | enum | No | texto, numero, booleano, enum |

**Claves obligatorias:**

| Clave | Tipo | Valores | Por defecto |
|---|---|---|---|
| `metodo_depreciacion` | enum | `linea_recta` | `linea_recta` |
| `metodo_conteo_meses` | enum | `mes_completo`, `dias_exactos`, `fraccion_anual` | **`dias_exactos`** (sugerido; requiere confirmación por acta antes de calcular) |
| `deprecia_mes_adquisicion` | booleano | sí/no | sí |
| `usa_puesta_en_servicio` | booleano | sí/no | no |
| `enfoque_adiciones` | enum | `simplificado`, `componente_separado` | `simplificado` |
| `base_comparacion_avaluo` | enum | `valor_neto_libros`, `saldo_por_depreciar` | `valor_neto_libros` |
| `valor_residual_pct` | número | 0–100 | 0 |
| `decimales_calculo` | entero | 0–4 | 2 |
| `umbral_capitalizacion` | número | monto | según manual |
| `umbral_semaforo_verde` | número | 0–1 | 0,50 |
| `umbral_semaforo_amarillo` | número | 0–1 | 0,80 |
| `umbral_semaforo_naranja` | número | 0–1 | 0,99 |
| `umbral_reparacion_baja_pct` | número | 0–100 | 50 |
| `tolerancia_cruce_valor_pct` | número | 0–100 | 5 |
| `vigencia_avaluo_meses` | entero | | 12 |
| `moneda` | texto | | COP |

> **Actualizado el 2026-09-01.** Se añadieron cuatro claves y se fijó un valor por defecto para
> `metodo_conteo_meses`. Ver `CORRECCIONES.md` § C-06 y § C-07.
>
> - `usa_puesta_en_servicio` y `enfoque_adiciones` eran usadas por `ANEXO_C` §3.2 y §3.6 sin figurar
>   en esta tabla.
> - `base_comparacion_avaluo` implementa la corrección de `ANEXO_C` §5.4.
> - `metodo_conteo_meses` pasa a tener el valor sugerido **`dias_exactos`**, por coherencia con el
>   divisor 365,25 que ya usa el índice de obsolescencia. **Sigue siendo obligatorio confirmarlo por
>   acta** (`IN-06-04`) antes de que la aplicación permita calcular: `VAL-06-01` no se levanta con el
>   valor sugerido, solo con la confirmación explícita.

### 2.6 `Ejercicio`

| Campo | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | UUID | No | PK |
| `entidad_id` | UUID | No | FK |
| `nombre` | texto(150) | No | Ej. "Valuación corte junio 2026" |
| `fecha_corte` | fecha | No | **Parámetro central** |
| `estado` | enum | No | Ver §6 |
| `paso_actual` | entero | No | 1 a 11 |
| `parametros_congelados` | JSON | No | Copia al abrir |
| `contrato_numero` | texto(50) | Sí | |
| `creado_por` | UUID | No | |
| `creado_en` | timestamp | No | |
| `cerrado_en` | timestamp | Sí | |
| `inmutable` | booleano | No | Verdadero al cerrar |

---

## 3. Entidad central: `Bien`

| Campo | Tipo | Nulo | Paso | Descripción |
|---|---|:-:|:-:|---|
| `id` | UUID | No | — | PK |
| `ejercicio_id` | UUID | No | — | FK |
| `codigo_institucional` | texto(30) | No | 02 | **Único por ejercicio** |
| `placa` | texto(30) | No | 02 | **Único por ejercicio** |
| `descripcion_funcional` | texto(200) | No | 02 | |
| `clase_activo_id` | UUID | No | 02 | FK — determina vida útil |
| `marca` | texto(100) | Sí | 02 | |
| `modelo` | texto(100) | Sí | 02 | |
| `serie` | texto(100) | Sí | 02 | |
| `sede_id` | UUID | No | 02 | FK |
| `servicio_id` | UUID | No | 02 | FK |
| `cantidad` | entero | No | 02 | ≥ 1 |
| `estado_actual` | enum | No | 02 | BUENO, REGULAR, MALO, INSERVIBLE |
| `condicion_tenencia` | enum | No | 02 | PROPIO, COMODATO, ARRENDADO, TERCERO |
| `responsable_custodia` | texto(150) | Sí | 02 | |
| `fecha_toma` | fecha | No | 02 | |
| `funcionario_conteo` | texto(150) | No | 02 | |
| `observaciones` | texto | Sí | 02 | |
| `estado_registro` | enum | No | — | Ver §6 |
| `creado_en` / `actualizado_en` | timestamp | No | — | |

**Índices recomendados:** `(ejercicio_id, codigo_institucional)` único · `(ejercicio_id, placa)` único · `(ejercicio_id, clase_activo_id)` · `(ejercicio_id, servicio_id)` · `serie`

---

## 4. Entidades de datos económicos y cálculo

### 4.1 `HojaVida`

| Campo | Tipo | Nulo | Crítico |
|---|---|:-:|:-:|
| `id` | UUID | No | |
| `bien_id` | UUID | No | |
| `tipo_instalacion` | enum | Sí | FIJO, MOVIL |
| `registro_invima` | texto(50) | Sí | |
| `especificaciones` | texto | Sí | |
| `fabricante` | texto(150) | Sí | |
| `pais_origen` | texto(100) | Sí | |
| `estado_operativo` | enum | No | OPERATIVO, NO_OPERATIVO, FUERA_SERVICIO |
| `forma_adquisicion` | enum | No | COMPRA, DONACION, COMODATO, REPOSICION, TRASLADO |
| `fecha_adquisicion` | fecha | No | ★ |
| `documento_adquisicion` | texto(150) | Sí | |
| `numero_factura` | texto(50) | Sí | |
| `proveedor` | texto(150) | Sí | |
| `costo_adquisicion` | decimal(18,2) | No | ★ |
| `adiciones_mejoras` | decimal(18,2) | Sí | Por defecto 0 |
| `fuente_financiacion` | texto(150) | Sí | |
| `fecha_puesta_servicio` | fecha | Sí | |
| `vida_util_tecnica_override` | decimal(5,2) | Sí | |
| `justificacion_override` | texto | Sí | Obligatoria si hay override |

★ = sin estos campos no hay cálculo posible (`RN-03-01`).

### 4.2 `CalculoObsolescencia`

| Campo | Tipo | Origen |
|---|---|---|
| `id`, `ejercicio_id`, `bien_id` | UUID | |
| `fecha_corte` | fecha | Ejercicio |
| `vida_util_tecnica_aplicada` | decimal(5,2) | Clase u override |
| `edad_actual_anios` | decimal(8,4) | Calculado |
| `indice_obsolescencia` | decimal(8,4) | Calculado — **sin truncar en 1** |
| `anios_restantes` | decimal(8,4) | Calculado |
| `fecha_fin_vida_util` | fecha | Calculado |
| `semaforo` | enum | VERDE, AMARILLO, NARANJA, ROJO |
| `obsolescencia_funcional` | booleano | Captura |
| `justificacion_funcional` | texto | Captura |
| `candidato_baja` | booleano | Calculado |
| `concepto_especialista` | texto | Captura |
| `calculado_en` | timestamp | |

### 4.3 `CalculoDepreciacion`

| Campo | Tipo | Origen |
|---|---|---|
| `id`, `ejercicio_id`, `bien_id` | UUID | |
| `fecha_corte` | fecha | Ejercicio |
| `valor_adquisicion` | decimal(18,2) | Hoja de vida |
| `adiciones_mejoras` | decimal(18,2) | Hoja de vida |
| `saldo_final_ajustado` | decimal(18,2) | Calculado |
| `valor_residual` | decimal(18,2) | Calculado |
| `base_depreciable` | decimal(18,2) | Calculado |
| `fecha_inicio_depreciacion` | fecha | Calculado |
| `vida_util_meses` | entero | Clase |
| `depreciacion_mensual` | decimal(18,4) | Calculado |
| `meses_transcurridos` | decimal(10,4) | Calculado |
| `metodo_conteo_aplicado` | enum | Parámetro — **se persiste** |
| `depreciacion_acumulada` | decimal(18,2) | Calculado |
| `deterioro` | decimal(18,2) | Paso 06 |
| `saldo_por_depreciar` | decimal(18,2) | Calculado |
| `valor_neto_libros` | decimal(18,2) | Calculado |
| `totalmente_depreciado` | booleano | Calculado |
| `calculado_en` | timestamp | |

> Se persiste `metodo_conteo_aplicado` en cada registro: permite auditar con qué regla se calculó, aunque el parámetro cambie después.

### 4.4 `ValuacionMueble`

| Campo | Tipo | Nulo |
|---|---|:-:|
| `id`, `ejercicio_id`, `bien_id` | UUID | No |
| `metodo_valuacion` | enum | No |
| `valor_equipo_nuevo_equivalente` | decimal(18,2) | Sí |
| `factor_estado` | decimal(4,2) | Sí |
| `factor_vida_restante` | decimal(6,4) | Sí |
| `valor_avaluo_calculado` | decimal(18,2) | Sí |
| `valor_avaluo_final` | decimal(18,2) | **No** |
| `diferencia_vs_libros` | decimal(18,2) | No |
| `tipo_ajuste` | enum | No — VALORIZACION, DESVALORIZACION, SIN_CAMBIO |
| `justificacion_tecnica` | texto | **No** |
| `especialista_id` | UUID | No |
| `fecha_valuacion` | timestamp | No |
| `soporte_mercado_url` | texto | Sí |
| `estado_aprobacion` | enum | No |

---

## 5. Catálogos de valores (enums)

| Enum | Valores |
|---|---|
| `estado_actual` | BUENO, REGULAR, MALO, INSERVIBLE |
| `condicion_tenencia` | PROPIO, COMODATO, ARRENDADO, TERCERO |
| `estado_operativo` | OPERATIVO, NO_OPERATIVO, FUERA_SERVICIO |
| `forma_adquisicion` | COMPRA, DONACION, COMODATO, REPOSICION, TRASLADO |
| `semaforo` | VERDE, AMARILLO, NARANJA, ROJO |
| `metodo_valuacion` | COSTO_REPOSICION_DEPRECIADO, COMPARACION_MERCADO, VALOR_EN_LIBROS, VALOR_RESIDUAL_CHATARRA, VALOR_CERO |
| `tipo_ajuste` | VALORIZACION, DESVALORIZACION, SIN_CAMBIO |
| `causal_baja` | OBSOLESCENCIA, INSERVIBLE, CASO_FORTUITO, DESUSO, DONACION_O_TRASLADO |
| `tipo_diferencia` | SOBRANTE_FISICO, FALTANTE_FISICO, DIFERENCIA_VALOR, DIFERENCIA_FECHA, DIFERENCIA_DEPRECIACION, CLASIFICACION_ERRONEA, DUPLICADO_LIBROS, BIEN_TERCERO |
| `accion_propuesta` | INCORPORAR, DAR_DE_BAJA, AJUSTAR_VALOR, AJUSTAR_DEPRECIACION, RECLASIFICAR |
| `indicio_deterioro` | DANO_FISICO, OBSOLESCENCIA, DESUSO, CAMBIO_NORMATIVO |
| `destino_final` | VENTA, REMATE, DESTRUCCION, DONACION, RECICLAJE_RAEE, GESTOR_AMBIENTAL |
| `estado_legalizacion` | LEGALIZADO, EN_TRAMITE, SIN_TITULO |
| `estado_conservacion` | 1_NUEVO, 2_BUENO, 3_REGULAR, 4_DEFICIENTE, 5_INSERVIBLE |

---

## 6. Máquinas de estado

### 6.1 `Ejercicio.estado`

```
ABIERTO → EN_LEVANTAMIENTO → EN_CONCILIACION → EN_CALCULO
        → EN_VALUACION → EN_APROBACION → CERRADO
```
`CERRADO` es terminal e inmutable.

### 6.2 `Bien.estado_registro`

```
BORRADOR ──→ VALIDADO ──→ ACTIVO ──→ PROPUESTO_BAJA ──→ DADO_DE_BAJA
    │            │          ▲               │              (terminal)
    └────────────┴──→ INCOMPLETO ───────────┘
                         ▲   │
                         └───┘   rechazo del Comité (RN-09-04):
                                 PROPUESTO_BAJA ──→ ACTIVO
```

**Transiciones válidas** (seis estados; es el enum canónico):

| Desde | Hacia | Condición |
|---|---|---|
| `BORRADOR` | `VALIDADO` | Pasa `VAL-02-01` … `VAL-02-04` |
| `BORRADOR` / `VALIDADO` / `ACTIVO` | `INCOMPLETO` | Falta `fecha_adquisicion` o `costo_adquisicion` (`RN-03-01`) |
| `VALIDADO` | `ACTIVO` | Tiene hoja de vida si su clase la requiere (`VAL-03-01`) |
| `INCOMPLETO` | `VALIDADO` / `ACTIVO` | Se completó el dato económico |
| `ACTIVO` | `PROPUESTO_BAJA` | Existe `PropuestaBaja` (paso 09) |
| **`PROPUESTO_BAJA`** | **`ACTIVO`** | **El Comité rechaza la baja (`RN-09-04`)** |
| `PROPUESTO_BAJA` | `DADO_DE_BAJA` | Acta del Comité aprueba (`INT-07`) |
| `DADO_DE_BAJA` | — | **Terminal** |

Un bien nunca se elimina físicamente (`RN-09-09`).

> **Corregido el 2026-09-01.** Faltaba la transición de regreso `PROPUESTO_BAJA → ACTIVO`, que
> `RN-09-04` sí exige. Además, el §10.1 del paso 02 listaba solo cuatro estados; **el enum canónico
> es el de esta sección, con seis**. Ver `CORRECCIONES.md` § C-08.

### 6.3 `PropuestaBaja.estado_aprobacion`

```
PROPUESTO → EN_REVISION → APROBADO_COMITE → RESOLUCION_EMITIDA
          → EJECUTADO → DISPOSICION_DOCUMENTADA
          
EN_REVISION → RECHAZADO  (el bien vuelve a ACTIVO)
```

### 6.4 `ActoAdministrativo.estado`

```
PROYECTADO → EN_REVISION_JURIDICA → APROBADO_COMITE
           → FIRMADO (inmutable) → PUBLICADO
```

---

## 7. Auditoría y trazabilidad

### 7.1 `Bitacora`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `ejercicio_id` | UUID | FK |
| `entidad_afectada` | texto(60) | Nombre de la tabla |
| `registro_id` | UUID | Registro afectado |
| `accion` | enum | CREAR, ACTUALIZAR, ELIMINAR, CALCULAR, APROBAR, RECHAZAR, IMPORTAR, EXPORTAR, CERRAR |
| `campo` | texto(60) | Campo modificado |
| `valor_anterior` | texto | |
| `valor_nuevo` | texto | |
| `responsable_id` | UUID | Quién decidió. Nulo cuando la acción no tiene responsable identificable (una importación, un recálculo) |
| `fecha` | timestamp | Cuándo |
| `origen` | texto(120) | Nombre del equipo + usuario del sistema operativo |
| ~~`ip`~~ | — | **Sin uso.** Ver nota |
| `justificacion` | texto | Obligatoria en cambios sensibles |

**Campos que exigen justificación al modificarse:** `costo_adquisicion`, `fecha_adquisicion`, `clase_activo_id`, `valor_avaluo_final`, `vida_util_tecnica_override`, `deterioro`, `causal_baja`, `fecha_corte`.

> **Actualizado el 2026-09-01.** `usuario_id` presuponía cuentas de acceso; la aplicación no tiene
> inicio de sesión (ver §7.2). Se sustituye por `responsable_id`, que apunta al catálogo de
> `Responsable`. El campo `ip` no aplica en una aplicación local sin red y se sustituye por `origen`.
> Ver `CORRECCIONES.md` § C-09.
>
> **La bitácora sigue siendo obligatoria y completa.** No tener usuarios no significa no tener
> trazabilidad: la Resolución 193 de 2016 exige poder reconstruir qué cambió, cuándo y con qué
> justificación, y eso se conserva íntegro.

### 7.2 `Responsable` y perfil

> **Reinterpretado el 2026-09-01.** La versión anterior modelaba estos perfiles como **cuentas de
> usuario con control de acceso**, lo que presupone un sistema multiusuario. La aplicación es de
> escritorio, monousuario y **sin inicio de sesión**: la maneja una sola persona en el hospital.
> Ver `CORRECCIONES.md` § C-09.
>
> Los perfiles **siguen siendo necesarios**, pero como **dato de atribución**, no como permiso: los
> documentos exigen decir quién certificó, quién valuó, quién avaluó y quién firma. Se modelan como
> un catálogo de personas que se configura una vez y se selecciona al firmar cada acto.

```
Responsable(id, entidad_id, nombre_completo, documento_identidad,
            perfil, cargo, tarjeta_profesional, registro_raa,
            es_externo, activo)
```

| Perfil | Interviene en | Qué firma |
|---|---|---|
| `COORDINADOR` | Todo el proceso | Informes, actas de parametrización |
| `ESPECIALISTA_BIOMEDICO` | Pasos 03, 05, 07, 09 (equipo médico) | Hojas de vida, conceptos, certificaciones técnicas de baja |
| `ESPECIALISTA_SISTEMAS` | Ídem para cómputo y comunicaciones | Ídem |
| `ESPECIALISTA_FISICOS` | Ídem para maquinaria, muebles, transporte | Ídem |
| `CONTADOR` | Pasos 04, 06, 10 | Acta de método de depreciación, matriz de conciliación, consolidado |
| `PERITO` | Paso 08 · **externo**, con `registro_raa` | Informe de avalúo, certificado de avalúo |
| `MIEMBRO_COMITE` | Pasos 09, 10 | Actas del Comité |
| `GERENTE` | Paso 10 | Resoluciones |
| `ASESOR_JURIDICO` | Paso 10 | Concepto jurídico sobre los proyectos |
| `SUPERVISOR` | Paso 11 | Certificación de cumplimiento, acta de entrega |

**Consecuencias del cambio:**

- No hay contraseñas, ni sesión, ni matriz de permisos. `Responsable` es un catálogo, no una cuenta.
- El campo `Bitacora.usuario_id` pasa a ser `Bitacora.responsable_id`, opcional: apunta a quien
  decidió, cuando la acción tiene un responsable identificable (una valuación, una certificación).
- El campo `Bitacora.ip` queda **sin uso** (siempre nulo): se sustituye por `origen`, con el nombre
  del equipo y el usuario del sistema operativo.
- Las "bandejas de trabajo por especialista" (`RF-07-05`) son **filtros** sobre la misma base, no
  colas de usuarios distintos.
- La trazabilidad exigida por la Resolución 193 de 2016 se mantiene íntegra: qué cambió, cuándo, con
  qué justificación y bajo la responsabilidad de quién.

---

## 8. Reglas de integridad

| Regla | Descripción |
|---|---|
| `INT-01` | `codigo_institucional` y `placa` únicos por ejercicio |
| `INT-02` | Un `Bien` no puede cambiar de `ejercicio_id` |
| `INT-03` | No se elimina un `Bien` con cálculos asociados; se cambia su estado |
| `INT-04` | `fecha_adquisicion` ≤ `fecha_corte` del ejercicio |
| `INT-05` | `depreciacion_acumulada` ≤ `base_depreciable` |
| `INT-06` | `valor_avaluo_final` ≥ 0 |
| `INT-07` | Toda `PropuestaBaja` en estado `EJECUTADO` tiene `acta_comite_id` |
| `INT-08` | Todo `ActoAdministrativo` firmado tiene `acta_comite_id` |
| `INT-09` | Un ejercicio `CERRADO` rechaza toda escritura |
| `INT-10` | `ClaseActivo` con `es_depreciable = falso` no admite `CalculoDepreciacion` |

---

## 9. Consideraciones de volumen y rendimiento

| Aspecto | Estimación / recomendación |
|---|---|
| Bienes por hospital de baja complejidad | 800 – 2.500 registros |
| Bienes por hospital de mediana/alta complejidad | 3.000 – 20.000 registros |
| Hojas de vida biomédicas | 20 % – 40 % del total |
| Cálculo masivo | Procesar por lotes; el cálculo de un ejercicio completo debe resolverse en segundos, no minutos |
| Fotografías | Fuera de la base de datos, en el sistema de archivos local; comprimir en el cliente |
| Exportación a Excel | Generación en segundo plano con notificación al finalizar para volúmenes altos |
| ~~Captura móvil~~ | **Fuera de alcance.** Ver nota de abajo |

> **Actualizado el 2026-09-01 — captura móvil.** La aplicación es de escritorio y monousuario. **No
> hay captura móvil ni sincronización diferencial.** El levantamiento en campo se hace en la
> plantilla `PL-03` (impresa o en Excel) y se **importa** a la aplicación. Ver `CORRECCIONES.md`
> § C-10.
>
> Se descarta expresamente la "resolución de conflictos por marca de tiempo" que recomendaba la
> versión anterior: cuando el dato en disputa es el costo de un activo, resolver automáticamente por
> la hora de edición es inaceptable. Toda diferencia la resuelve una persona.
>
> **Fotografías:** "almacenamiento de objetos" presuponía infraestructura en la nube. En una
> aplicación local el equivalente es el sistema de archivos: `<datos>/almacen/<ejercicio>/<bien>/`,
> con la ruta relativa y una suma SHA-256 en la base. Los campos `*_url` del modelo son **rutas
> relativas al almacén**, no URL.

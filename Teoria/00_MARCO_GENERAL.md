# 00 — Marco General del Proceso de Valuación de Activos

**Versión:** 2.0 · **Aplicabilidad:** cualquier E.S.E / hospital público colombiano

---

## 1. Qué es la valuación de activos en este contexto

La valuación de activos es el proceso técnico mediante el cual una entidad determina el **valor razonable y verificable** de los bienes que componen su cuenta de Propiedad, Planta y Equipo (PPE), de modo que los estados financieros reflejen su realidad patrimonial.

No es un ejercicio aislado: es un componente del **saneamiento contable**. Su resultado alimenta actos administrativos (resoluciones) que ordenan al contador ajustar los saldos en libros.

### 1.1 El problema que resuelve

En la mayoría de hospitales públicos se presenta simultáneamente:

- Bienes registrados en libros que **ya no existen** físicamente.
- Bienes existentes que **nunca se registraron**.
- Depreciación acumulada calculada de forma **inconsistente o desactualizada**.
- Valores en libros que **no corresponden** al valor real del bien.
- Ausencia de identificación física (plaqueteo) que impida rastrear el bien.
- Equipos biomédicos **obsoletos o inservibles** que siguen activos contablemente.

La valuación corrige las cinco situaciones y deja el inventario **conciliado, valorado, identificado y soportado**.

---

## 2. Alcance

### 2.1 Incluye
- Bienes muebles: equipo médico-científico, maquinaria y equipo, muebles y enseres, equipo de cómputo y comunicaciones, equipo de transporte, equipo de comedor y cocina.
- Bienes inmuebles: terrenos y edificaciones.
- Cálculo de depreciación, deterioro e índice de obsolescencia.
- Clasificación y soporte técnico de bajas.
- Generación de los actos administrativos de ajuste.

### 2.2 No incluye
- Inventario de consumibles, medicamentos y dispositivos médicos (almacén/farmacia) — es otro frente del saneamiento.
- Depuración de cartera, pasivos, flujo de efectivo.
- Estudio jurídico de títulos (el avalúo lo advierte explícitamente).
- Intangibles.

---

## 3. Las dos rutas de valuación

La palabra "valuación" cubre dos procedimientos técnicamente distintos. **La app debe modelarlos por separado.**

| | **Ruta A — Bienes muebles** | **Ruta B — Bienes inmuebles** |
|---|---|---|
| Objeto | Equipos, mobiliario, vehículos | Terreno y construcción |
| Método | Costo histórico depreciado + índice de obsolescencia + revaluación técnica | Avalúo comercial (comparación de mercado + costo de reposición depreciado) |
| Quién lo hace | Equipo técnico interno (ing. biomédica, sistemas, recursos físicos) | Perito avaluador registrado (R.A.A), externo |
| Volumen | Cientos a miles de registros | 1 a pocos predios |
| Rol de la app | **Calcula** | **Almacena y controla vigencia** |
| Paso | 02 – 07, 09 | 08 |

---

## 4. Flujo completo del proceso

```
        ┌─────────────────────────────────────────────┐
        │  01. PARAMETRIZACIÓN DE LA ENTIDAD          │
        │  (sedes, servicios, clases, vida útil,      │
        │   fecha de corte, plan de cuentas)          │
        └───────────────────┬─────────────────────────┘
                            ▼
        ┌─────────────────────────────────────────────┐
        │  BLOQUE I — LEVANTAMIENTO                   │
        │  02. Inventario físico y plaqueteo          │
        │  03. Hoja de vida de bienes                 │
        └───────────────────┬─────────────────────────┘
                            ▼
        ┌─────────────────────────────────────────────┐
        │  BLOQUE II — CONCILIACIÓN                   │
        │  04. Conciliación físico vs. contable       │
        └───────────────────┬─────────────────────────┘
                            ▼
        ┌─────────────────────────────────────────────┐
        │  BLOQUE III — CÁLCULO                       │
        │  05. Índice de obsolescencia                │
        │  06. Depreciación acumulada y deterioro     │
        └───────────────────┬─────────────────────────┘
                            ▼
        ┌──────────────────────────┬──────────────────┐
        │ 07. Valuación técnica    │ 08. Valuación    │
        │     de muebles           │     de inmuebles │
        └──────────────┬───────────┴────────┬─────────┘
                       ▼                    │
        ┌─────────────────────────────────┐ │
        │  09. Clasificación y baja       │ │
        └───────────────┬─────────────────┘ │
                        ▼                   │
        ┌───────────────────────────────────┴─────────┐
        │  BLOQUE IV — FORMALIZACIÓN                  │
        │  10. Consolidación y actos administrativos  │
        │  11. Entrega final y cierre                 │
        └─────────────────────────────────────────────┘
```

---

## 5. Principios teóricos que sustentan el cálculo

### 5.1 Costo histórico y medición posterior
El bien se reconoce inicialmente por su **costo de adquisición** (más adiciones y mejoras capitalizables). En mediciones posteriores ese valor se reduce por **depreciación acumulada** y, cuando aplica, por **deterioro**.

```
Valor en libros = Costo + Adiciones/Mejoras − Depreciación acumulada − Deterioro
```

### 5.2 Depreciación en línea recta
Distribuye el costo de manera uniforme a lo largo de la vida útil. Es el método estándar en el sector público colombiano. Requiere tres parámetros: **base depreciable**, **vida útil** y **fecha de inicio**.

### 5.3 Vida útil: contable vs. técnica
Son dos conceptos que la app debe manejar por separado:

- **Vida útil contable:** la que define el Manual de Políticas Contables de la entidad. Se usa para depreciar.
- **Vida útil técnica (esperada):** la que estima el fabricante o el especialista. Se usa para el índice de obsolescencia.

Pueden coincidir, pero no siempre. Modelarlas como campos independientes evita rehacer el sistema.

### 5.4 Obsolescencia ≠ depreciación
La depreciación es **contable** (consumo del costo en el tiempo). La obsolescencia es **técnica** (pérdida de utilidad por agotamiento de vida útil o superación tecnológica). Un bien puede estar totalmente depreciado y seguir siendo plenamente funcional, y viceversa.

### 5.5 Valor razonable
El valor por el que un activo podría intercambiarse entre partes interesadas y debidamente informadas. Es lo que persigue el paso 07 (muebles) y el paso 08 (inmuebles). La diferencia entre valor razonable y valor en libros es la que se lleva a la cuenta de valuaciones/revaluaciones.

### 5.6 Trazabilidad
Todo ajuste debe poder rastrearse hasta su evidencia: una toma física firmada, una factura, una hoja de vida, un concepto técnico o un avalúo. La app debe **impedir ajustes sin soporte**.

---

## 6. Estructura conceptual de la información

```
ENTIDAD (hospital)
 └── EJERCICIO DE VALUACIÓN (fecha de corte)
      ├── PARÁMETROS (clases, vidas útiles, método)
      ├── SEDES
      │    └── SERVICIOS / DEPENDENCIAS
      │         └── BIENES (muebles)
      │              ├── Hoja de vida
      │              ├── Mantenimientos
      │              ├── Cálculos (obsolescencia, depreciación)
      │              ├── Valuación técnica
      │              └── Baja (si aplica)
      ├── INMUEBLES
      │    └── Avalúo pericial
      ├── SALDOS CONTABLES importados
      ├── CONCILIACIÓN
      └── CONSOLIDADO POR SUBCUENTA
           └── ACTOS ADMINISTRATIVOS (resoluciones, actas)
```

---

## 7. Concepto de "ejercicio de valuación"

La app no trabaja sobre "el inventario" a secas, sino sobre un **ejercicio** identificado por:

| Atributo | Descripción |
|---|---|
| Entidad | Hospital al que pertenece |
| Fecha de corte | Fecha contra la que se calcula todo |
| Estado | Abierto / En cálculo / En aprobación / Cerrado |
| Parámetros congelados | Copia de los parámetros vigentes al abrirlo |

**Por qué importa:** al cerrarse, el ejercicio queda **inmutable** (es la evidencia del contrato). Un nuevo corte abre un ejercicio nuevo que hereda los bienes pero recalcula. Esto permite comparar vigencias y auditar.

---

## 8. Roles del proceso

| Rol | Responsabilidad principal |
|---|---|
| Gerente de la E.S.E | Firma los actos administrativos |
| Comité de Saneamiento Contable | Evalúa y recomienda los ajustes |
| Contador / Subgerente Administrativo y Financiero | Aporta saldos, causa los ajustes |
| Ingeniero(a) biomédico(a) | Valúa y certifica equipos médicos y sus bajas |
| Ingeniero(a) de sistemas | Valúa equipos de cómputo y comunicaciones |
| Recursos Físicos / Almacén | Valúa muebles, enseres, maquinaria |
| Perito avaluador (R.A.A) | Avalúa los inmuebles |
| Técnicos de inventario | Ejecutan la toma física y el plaqueteo |
| Asesor jurídico | Revisa los actos administrativos |
| Firma contratista | Coordina, calcula y elabora los productos |

---

## 9. Entregables globales del proceso

Estos son los productos finales que el contrato exige. Cada uno se detalla en su paso:

| Código | Entregable | Paso |
|---|---|---|
| `EN-G-01` | Informe de diagnóstico inicial | 04 |
| `EN-G-02` | Inventario físico plaqueteado y valorizado | 02, 07 |
| `EN-G-03` | Hojas de vida de equipos | 03 |
| `EN-G-04` | Reporte de índice de obsolescencia | 05 |
| `EN-G-05` | Listados depurados de activos depreciables | 06 |
| `EN-G-06` | Informe de valuación integral de activos | 07, 08 |
| `EN-G-07` | Certificación técnica y listado de bajas | 09 |
| `EN-G-08` | Actas de asignación de responsabilidad y custodia | 02 |
| `EN-G-09` | Manual de activos e inventarios | 11 |
| `EN-G-10` | Resoluciones del Comité de Saneamiento | 10 |
| `EN-G-11` | Capacitación a funcionarios | 11 |

---

## 10. Advertencias metodológicas para el desarrollador

1. **El método de conteo de meses debe ser configurable.** Los cálculos de depreciación de referencia mostraron inconsistencias entre "meses completos" y "días exactos". La app debe permitir elegirlo y aplicarlo de forma uniforme. Ver `ANEXO_C`.

2. **Las fechas llegan sucias.** Los archivos fuente mezclan formatos (`dd/mm/aaaa`, ISO, texto). El importador debe normalizar y reportar lo que no pudo interpretar, nunca adivinar en silencio.

3. **Habrá bienes sin costo de adquisición.** Es normal en equipos antiguos o donados. La app no debe asumir cero: debe marcarlos como *incompletos* y excluirlos de los totales hasta que se resuelvan.

4. **Los totales deben cuadrar en tres niveles:** detalle por bien → auxiliar contable → cuenta mayor del balance. Si no cuadran, el ejercicio no puede cerrarse.

5. **Nunca borrar, siempre versionar.** Un bien dado de baja no se elimina; cambia de estado y conserva su historia.

# Documentación de `/app`

Cómo está construida la aplicación. Escrito el **2026-09-04** leyendo el código, no de memoria.

> **Qué manda sobre qué.** Esta carpeta describe **cómo** está hecha la aplicación. **Qué** debe
> hacer lo dice `/especificacion/teoria` (v2.1), y en el motor de cálculo manda `ANEXO_C`. Si esta documentación
> contradice a `/especificacion/teoria`, la equivocada es esta. Las decisiones técnicas cerradas están en
> `/proyecto/plan/DECISIONES` (27 ADR) y el estado del trabajo en `/proyecto/gestion`.

## Índice

| Documento | Qué responde |
|---|---|
| [01_PANORAMA.md](01_PANORAMA.md) | Qué es, qué hace hoy, cifras del código y las seis etapas |
| [02_ARQUITECTURA.md](02_ARQUITECTURA.md) | Las cuatro capas, las ocho fronteras que un robot vigila, y por qué |
| [03_ARRANQUE_Y_DATOS.md](03_ARRANQUE_Y_DATOS.md) | Qué pasa al abrir la app: rutas, base, migraciones, respaldos |
| [04_BASE_DE_DATOS.md](04_BASE_DE_DATOS.md) | 44 tablas, 119 disparadores, dinero en centavos, inmutabilidad |
| [05_IPC.md](05_IPC.md) | Los 55 canales, la cadena de middleware y las seis prohibiciones |
| [06_MOTOR_DE_CALCULO.md](06_MOTOR_DE_CALCULO.md) | El dominio puro: depreciación, obsolescencia, deterioro, bajas |
| [07_IMPORTACION.md](07_IMPORTACION.md) | Cómo entra un Excel y cómo se rechaza fila por fila |
| [08_INTERFAZ.md](08_INTERFAZ.md) | Renderer: rutas, componentes, estado y accesibilidad |
| [09_PRUEBAS_Y_CALIDAD.md](09_PRUEBAS_Y_CALIDAD.md) | 379 tests, 15 E2E, la puerta de calidad y la CI |
| [10_CONSTRUIR_Y_DISTRIBUIR.md](10_CONSTRUIR_Y_DISTRIBUIR.md) | Scripts, empaquetado, instalador y desarrollo aislado |
| [decisiones-runtime.md](decisiones-runtime.md) | Versiones congeladas (`T-A-01`) — ya existía |
| [trazabilidad.csv](trazabilidad.csv) | 380 requisitos de `/especificacion/teoria` y su estado — generado |

## Si acabas de llegar

Lee [01_PANORAMA.md](01_PANORAMA.md) y luego [02_ARQUITECTURA.md](02_ARQUITECTURA.md). Con eso
entiendes dónde va cada cosa. Después, el documento del área que vayas a tocar.

Antes de escribir código, lee `proyecto/gestion/estado_actual.md`: dice en qué punto está el trabajo
y qué es lo siguiente. Es obligatorio y está ahí por una razón — sin él se duplica o se destruye
trabajo ajeno.

## Las reglas que no se negocian

Están en `/CLAUDE.md` y se repiten aquí porque son las que más caro cuesta romper:

1. **`/especificacion/teoria` manda**, y `ANEXO_C` prevalece en el motor de cálculo.
2. **El dinero nunca es un `number` de pesos.** Enteros de centavos en la base, `decimal.js` en el
   motor (ADR-006).
3. **El motor de cálculo es dominio puro.** No importa `fs`, `electron`, `sqlite`, `react` ni `Date`.
4. **Un ejercicio cerrado es inmutable**, también frente a SQL directo. Disparadores, no
   validaciones de formulario (ADR-017).
5. **Ningún valor esperado de los tests del motor se cambia sin justificarlo en la bitácora**
   (riesgo `RG-01`).
6. **Un cálculo que no se pudo hacer nunca es un cero.** Devuelve `NO_APLICA`, `NO_CALCULABLE` o
   `ERROR_DATOS` con su motivo.
7. **Todo en español**: código, tablas, enums y documentación. Solo las APIs de librerías y las
   palabras clave del lenguaje quedan en inglés.

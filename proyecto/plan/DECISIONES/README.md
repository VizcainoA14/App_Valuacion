# Registro de decisiones técnicas (ADR)

## Propósito

Cada decisión aquí registrada está **cerrada**. No se vuelve a discutir salvo que aparezca
información nueva, y en ese caso se abre un ADR nuevo que sustituye al anterior — no se edita el
original.

Es la respuesta al punto 8 del encargo: documentar alternativas comparadas y justificar la elección
para evitar discusiones redundantes en el futuro.

## Formato

Cada ADR contiene: **contexto** (qué problema resuelve), **alternativas** (comparadas con criterios
explícitos), **decisión**, **consecuencias** (incluidas las negativas) y, cuando aplica, **cuándo
reconsiderarla**.

## Índice

### Tecnología — [`adr_stack.md`](adr_stack.md)

| # | Decisión | Elección |
|:-:|---|---|
| 001 | Lenguaje | **TypeScript** en modo `strict` |
| 002 | Versión de Electron | Política de versión: última estable con soporte; mínimo 33.x |
| 003 | Herramienta de construcción | **electron-vite** + **electron-builder** |
| 004 | Motor de persistencia | **SQLite** con `better-sqlite3` |
| 005 | Capa de acceso a datos | **Drizzle ORM** |
| 006 | Representación de valores monetarios | **Enteros de centavos** + `decimal.js` |
| 007 | Contrato IPC | Canales namespaced + **Zod en el main** |
| 008 | Estado en el renderer | **Zustand** (interfaz) + **TanStack Query** (servidor) |
| 009 | Sistema de interfaz | **Radix UI** + **Tailwind 3.4** (no v4) |
| 010 | Tablas de alto volumen | **TanStack Table + Virtual** |
| 011 | Generación de Excel | **ExcelJS** |
| 012 | Generación de Word | **docxtemplater** |
| 013 | Generación de PDF | **`webContents.printToPDF`** |
| 014 | Códigos de barras y QR | **bwip-js** |

### Producto — [`adr_producto.md`](adr_producto.md)

| # | Decisión | Elección |
|:-:|---|---|
| 026 | **Destinatario y alcance** | **Producto para hospitales**: un *núcleo* (configurar → plantillas → importar → **calcular** → bajas → informe) y unas *extensiones*. `/especificacion/teoria` intacta; cambia el orden, no el contenido |
| 027 | Firmantes del informe | Se retira el catálogo de responsables; firman el Gerente y el Contador. **El bloque de firmas lo retira ADR-028** |
| 028 | **Desacople del proceso** | Inventario actualizado por **barridos**, bajas que solo se registran e informe sin firmas. Se retiran el ejercicio y las extensiones. **La entidad y los cortes a cualquier fecha los sustituye ADR-029** |
| 029 | **El proceso es lo principal** | La pantalla inicial son los **procesos**; cada uno, independiente, con su hospital, su inventario (de cero) y **un cálculo a su fecha de corte**. **Finalizar** lo deja de solo lectura, garantizado por disparadores |

### Arquitectura y proceso — [`adr_arquitectura.md`](adr_arquitectura.md)

| # | Decisión | Elección |
|:-:|---|---|
| 015 | Captura de inventario en campo (`RF-02-01`) | **Solo importación de `PL-03`**; la app no se usa en campo |
| 016 | Modelo de usuario y despliegue | **Sin login.** Monousuario + catálogo de responsables; **prohibido** SQLite en red |
| 017 | Inmutabilidad del ejercicio cerrado | **Triggers SQLite** + hash SHA-256 |
| 018 | Bitácora de auditoría | Decorador en el repositorio, dentro de la transacción |
| 019 | Arquitectura interna | **Monolito modular hexagonal**, fronteras verificadas |
| 020 | Cálculo pesado | **`utilityProcess`**, solo si la medición lo justifica |
| 021 | Migraciones y respaldos | Numeradas, solo hacia adelante, con respaldo verificado |
| 022 | Compatibilidad de navegadores | **Doble objetivo** de compilación |
| 023 | Estrategia de pruebas | **Vitest + Playwright**, cobertura proporcional al riesgo |
| 024 | Empaquetado y actualizaciones | NSIS; **sin actualización automática en v1** |
| 025 | Protección de datos | Sin cifrado de base en v1; cifrado de disco del SO |

## Decisiones de negocio ya tomadas

Seis asuntos requerían decisión del propietario del proyecto, no del equipo técnico. **Todos
resueltos el 2026-09-01.** El análisis está en
[FASE_1/1.4](../FASE_1_ANALISIS/1.4_contradicciones_teoria.md) y las correcciones aplicadas a la base
teórica en [`/especificacion/teoria/CORRECCIONES.md`](../../../especificacion/teoria/CORRECCIONES.md).

| # | Asunto | Decisión |
|:-:|---|---|
| CT-01 | ¿Manda la fórmula o el ejemplo numérico de `ANEXO_C`? | **La fórmula.** Ejemplos recalculados en `/especificacion/teoria` v2.1 |
| CT-02 | ¿Qué método de conteo de meses? | **`dias_exactos`** sugerido; acta del contador sigue siendo obligatoria |
| CT-03 | ¿Contra qué se compara el avalúo? | **`valor_neto_libros`**, parametrizable |
| CT-05 | ¿Captura móvil? | **No.** Solo importación de `PL-03` |
| CT-08 | ¿Uno o varios usuarios? | **Uno, sin login.** Catálogo de responsables |
| CT-11 | ¿Cómo se evita el doble conteo en la consolidación? | **Regla de exclusión mutua** |

Además, dos decisiones de proyecto: se versiona `.claude/` (skills y configuración de sesión), y la
**firma de código del instalador se aplaza al hito H** (`T-H-02`).

# ADR 001 – 014 · Decisiones de tecnología

---

## ADR-001 — Lenguaje: TypeScript en modo `strict`

**Contexto.** El encargo deja abierta la elección entre JavaScript y TypeScript. El sistema tiene
~40 entidades, 15 enumeraciones, 4 máquinas de estado, 68 reglas de negocio y un motor de cálculo
cuyo error tiene consecuencias legales.

**Alternativas.**

| Opción | A favor | En contra |
|---|---|---|
| JavaScript + JSDoc | Sin paso de compilación adicional | La verificación es opcional; en la práctica se degrada |
| **TypeScript `strict`** | Los 15 enums son uniones exhaustivas verificadas; el contrato IPC es un tipo compartido; `Centavos` como tipo nominal impide mezclar pesos y centavos | Curva de aprendizaje; compilación |

**Decisión: TypeScript en modo `strict`**, con `noUncheckedIndexedAccess` y
`exactOptionalPropertyTypes`.

**Justificación decisiva.** El argumento habitual contra TypeScript —el paso de compilación— no
aplica: Electron + React ya obligan a compilar. Y tres necesidades del proyecto son inalcanzables
sin tipos: (1) el tipo nominal `Centavos` que impide operar dinero como número corriente
([ADR-006](#adr-006--representación-de-valores-monetarios)); (2) la exhaustividad sobre los 15 enums,
que garantiza que añadir un estado obliga a atender todos los sitios que lo consumen; (3) el
contrato IPC compartido entre tres procesos, que sin tipos se desincroniza en silencio.

**Consecuencias.** El código es más verboso. La compilación añade segundos. A cambio, una clase
entera de errores desaparece antes de ejecutarse.

---

## ADR-002 — Versión de Electron

**Contexto.** Electron publica una major cada 8 semanas y mantiene solo las 3 últimas. El proyecto
durará más que ese ciclo. Fijar un número sin política produce una app con parches de seguridad
atrasados; no fijar nada produce un proyecto irreproducible.

**Decisión: una política, no un número.**

1. Al iniciar (`T-A-01`) se fija la **major estable más reciente con soporte activo**, verificada con
   `npm view electron dist-tags`, y se registra en `docs/decisiones-runtime.md`.
2. **Mínimo absoluto: Electron 33.x.** Por debajo se pierden parches de Chromium y `utilityProcess`
   maduro.
3. Versión **exacta** en `package.json`, con `package-lock.json` versionado.
4. Revisión cada 8 semanas. Los parches dentro de la misma major son obligatorios si son de
   seguridad.
5. Cambiar de major exige recompilar módulos nativos, ejecutar E2E completa y generar instaladores.
   No se hace en la semana previa a una entrega.

**Consecuencias.** Trabajo recurrente de mantenimiento. A cambio, se evita `RG-17` (quedarse sin
soporte a mitad del proyecto) y se mantiene el Chromium del renderer moderno, lo que permite el
objetivo de compilación agresivo de [ADR-022](adr_arquitectura.md#adr-022--compatibilidad-de-navegadores).

---

## ADR-003 — Herramienta de construcción

**Alternativas.**

| Opción | A favor | En contra |
|---|---|---|
| **electron-vite + electron-builder** | Un solo flujo para main, preload y renderer, con recarga en caliente; control total del empaquetado; configuración declarativa en YAML | Dos herramientas en lugar de una |
| Electron Forge (+ plugin Vite) | Todo en uno, mantenido por el equipo de Electron | Menos control fino del empaquetado; el plugin de Vite ha ido por detrás |
| Webpack a mano | Máximo control | Mucha configuración, arranque lento |

**Decisión: electron-vite (desarrollo y empaquetado de código) + electron-builder (instaladores).**

**Justificación.** electron-builder resuelve dos cosas críticas de este proyecto con configuración,
no con código: `asarUnpack` para el módulo nativo (`RG-06`) y `deleteAppDataOnUninstall: false`,
que impide que un desinstalador borre la base de datos con los ejercicios cerrados.

**Cuándo reconsiderar.** Si Forge alcanza paridad en control del empaquetado y el proyecto no
necesita ajustes finos del instalador.

---

## ADR-004 — Motor de persistencia

**Contexto.** Hasta 20.000 bienes por ejercicio, ~40.000 filas de cálculo, ~200.000 de bitácora.
Aplicación local, monolítica, sin servidor (`R-02`). Se necesitan transacciones, restricciones,
triggers y sumas exactas.

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Archivos JSON / LowDB | **Descartado.** Sin transacciones, sin integridad, sin consultas agregadas. Con 20.000 registros es inviable |
| `sql.js` (SQLite en WebAssembly) | **Descartado.** La base vive en memoria y se serializa entera al guardar: pérdida de datos ante un cierre inesperado |
| `node:sqlite` | **Descartado por ahora.** Aún experimental y atado a la versión de Node que traiga Electron. Candidato natural a futuro |
| PostgreSQL embebido | **Descartado.** Rompe `R-02`, multiplica el instalador y añade un servicio que administrar |
| **`better-sqlite3`** | **Elegido** |

**Decisión: SQLite mediante `better-sqlite3`**, en modo WAL.

**Justificación.** SQLite es el motor transaccional más probado para aplicaciones de escritorio.
Sostiene el volumen sin esfuerzo. Y aporta lo que este dominio necesita específicamente:

- **`SUM()` exacto sobre enteros de 64 bits**, que es lo que hace posible el cuadre con tolerancia
  de $1 sin error de punto flotante (`RNF-03`).
- **Triggers**, que permiten implementar `INT-09` en el motor: un ejercicio cerrado rechaza escritura
  aunque alguien use una herramienta externa.
- La API síncrona de `better-sqlite3` simplifica los casos de uso; el riesgo de bloquear el proceso
  main se atiende con lotes y, si hace falta, `utilityProcess` (ADR-020).

**Consecuencias negativas, asumidas.**
- Es un **módulo nativo**: recompilación y `asarUnpack` (`RG-06`). Mitigado empaquetando desde el
  hito A.
- No admite acceso concurrente por red (`RG-10`). De ahí la prohibición explícita y su verificación
  en arranque.

---

## ADR-005 — Capa de acceso a datos

**Alternativas.**

| Opción | Veredicto |
|---|---|
| SQL plano con `better-sqlite3` | Máximo control, cero abstracción; pero 40 entidades a mano son mucha superficie de error y de tipos escritos dos veces |
| **Drizzle ORM** | **Elegido.** Tipos derivados del esquema, sin binario externo, SQL generado predecible, `drizzle-kit` para migraciones |
| Prisma | **Descartado.** Su motor de consulta es un binario que hay que empaquetar por plataforma, complica el instalador y lo engorda |
| TypeORM / Sequelize | **Descartado.** Pesados, con decoradores y magia en tiempo de ejecución que oscurece el SQL |

**Decisión: Drizzle ORM**, con dos reglas:

1. Las consultas complejas (cuadre, consolidación, agregaciones por subcuenta) se escriben en **SQL
   plano** dentro del repositorio. Drizzle sirve para el CRUD tipado; el SQL crítico se escribe y se
   lee explícitamente.
2. Toda la superficie de Drizzle queda dentro de `repositorio/`. El resto del sistema ve interfaces,
   por lo que sustituirlo afectaría a una sola carpeta.

**Cuándo reconsiderar.** Si la API de Drizzle sigue cambiando y genera fricción de mantenimiento, se
migra a SQL plano con un constructor mínimo propio. El aislamiento hace la migración local.

---

## ADR-006 — Representación de valores monetarios

> **La decisión técnica más importante del proyecto.**

**Contexto.** `ANEXO_B` especifica `decimal(18,2)` para el dinero. `ANEXO_C` §7.1 exige que la suma
del detalle cuadre con el auxiliar con tolerancia de **$1**, sobre hasta 20.000 registros. Y `RED-05`
exige que el total mostrado sea exactamente la suma de las filas mostradas.

El `number` de JavaScript es un flotante binario de 64 bits: no puede representar exactamente
valores decimales, y el error se acumula al sumar.

**Alternativas.**

| Opción | Veredicto |
|---|---|
| `number` en pesos | **Descartado.** `0.1 + 0.2 !== 0.3`. Con 20.000 sumas, el cuadre falla por céntimos sin causa de negocio |
| `TEXT` decimal en la base + `decimal.js` en JS | Exacto, pero **`SUM()` de SQL deja de funcionar**: habría que traer 20.000 filas para sumarlas en memoria |
| `BigInt` de centavos | Exacto y de rango ilimitado, pero no cruza el IPC ni serializa a JSON sin conversión manual |
| **`INTEGER` de centavos + `decimal.js`** | **Elegido** |

**Decisión.**

```
Base de datos:  INTEGER de centavos  (SQLite INTEGER = 64 bits → SUM() exacto)
Motor:          decimal.js para todo cálculo intermedio
Frontera:       redondeo a centavos al persistir y al presentar  (RED-02, RED-04, RED-06)
Tipos:          Centavos como tipo nominal; ESLint prohíbe aritmética nativa sobre dinero
IPC:            cruza como number de centavos, nunca como number de pesos
Índices/factores: INTEGER escalado ×10.000  (RED-03)
```

**Rango.** SQLite `INTEGER` cubre ±9,22 × 10¹⁸ centavos. El `number` de JavaScript es exacto hasta
9,007 × 10¹⁵, es decir, unos **90 billones de pesos**. Muy por encima de cualquier PPE hospitalaria
(el orden de magnitud real es 10¹⁰ pesos). Para las sumas de control se usa la opción
`safeIntegers` de `better-sqlite3`, que devuelve `BigInt`, y se convierte tras verificar el rango.

**Consecuencias.** Todo el código debe pensar en centavos. La disciplina se sostiene con el tipo
nominal y la regla de ESLint, no con buena voluntad. A cambio, `RG-02` queda cerrado y el cuadre en
tres niveles es exacto, no aproximado.

---

## ADR-007 — Contrato IPC

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Canal genérico (`app:ejecutar` con un nombre de procedimiento) | **Descartado.** Reabre toda la superficie que el aislamiento cierra |
| Exponer `ipcRenderer` en el preload | **Descartado.** Equivale a desactivar el aislamiento de contexto |
| tRPC sobre IPC | Interesante, pero añade una dependencia y una capa para un problema que se resuelve con ~150 líneas |
| **Canales namespaced + contrato compartido + Zod en el main** | **Elegido** |

**Decisión.** Un archivo de contrato en `MOD-00` declara, por canal: esquema Zod de entrada, tipo de
salida, permiso requerido y si muta estado. Main, preload y renderer derivan de ahí. El preload
expone una lista blanca estática.

**Justificación.** La skill de Electron es explícita: *"validate all IPC message data in the main
process since the renderer is untrusted like a browser"*. Un contrato único hace que la validación
sea estructural: no se puede crear un canal sin declarar su esquema y su permiso.

**Consecuencias.** Añadir una operación exige tocar el contrato. Es intencional: hace visible cada
ampliación de la superficie de ataque.

---

## ADR-008 — Estado en el renderer

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Solo Context de React | **Descartado.** Re-renderizados masivos con listados grandes |
| Redux Toolkit | **Descartado.** Mucha ceremonia; el estado de interfaz aquí es pequeño |
| Solo Zustand | Insuficiente: obligaría a escribir a mano la caché y las invalidaciones de los datos que vienen por IPC |
| **Zustand + TanStack Query** | **Elegido** |

**Decisión.** Separar estado de servidor (TanStack Query, sobre IPC) de estado de interfaz (Zustand).

**Justificación.** Aunque no hay red, la relación renderer↔main **es** cliente-servidor: hay latencia,
hay datos que se quedan rancios y hay invalidaciones. TanStack Query resuelve exactamente eso. El
caso más claro: cambiar la fecha de corte invalida obsolescencia, depreciación, valuación,
consolidación y conciliación (`ANEXO_C` §10). Con una tabla de invalidación declarada, es una línea;
a mano, es una fuente permanente de datos obsoletos mostrados como vigentes.

---

## ADR-009 — Sistema de interfaz

**Contexto.** 52 pantallas, mucha densidad de datos, modo claro y oscuro, accesibilidad exigida
(`RNF-11`) y **el piso de compatibilidad `R-05`**.

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Material UI / Ant Design | **Descartado.** Pesados, opinión visual fuerte, difíciles de ajustar a la densidad de un listado de 20.000 filas |
| **Tailwind v4** | **RECHAZADO por incompatibilidad.** Requiere Chrome 111+/Safari 16.4+ por `@property` y `color-mix()`. Rompe `R-05` (`RG-09`) |
| CSS Modules a mano | Viable, pero sin sistema de espaciado ni tokens; con 52 pantallas se degrada |
| **Radix UI + Tailwind 3.4** | **Elegido** |

**Decisión: primitivas de Radix UI + Tailwind CSS 3.4.x.**

**Justificación.** Radix aporta accesibilidad correcta de origen (gestión de foco, roles ARIA,
navegación por teclado) sin imponer estética: es exactamente lo que hace falta para cumplir `RNF-11`
sin pelearse con un tema. Tailwind 3.4 soporta desde Chrome 90 y Safari 14, holgadamente dentro del
piso.

**Consecuencia y aviso.** Esta es la decisión con mayor riesgo de ser revertida por descuido: alguien
verá que existe Tailwind v4 y propondrá actualizar. **No se puede** mientras `R-05` esté vigente.
`eslint-plugin-compat` y `stylelint` detectarían el problema, pero la razón queda escrita aquí para
que nadie pierda una tarde averiguándola.

---

## ADR-010 — Tablas de alto volumen

**Decisión: TanStack Table (motor sin interfaz) + TanStack Virtual (virtualización), envueltos en un
componente propio `<TablaDatos>`.**

**Justificación.** Unas 30 de las 52 pantallas son listados sobre el mismo modelo. Un componente
único con virtualización, filtrado y orden **en el main**, selección sobre el filtro completo y
exportación resuelve las 30 con configuración de columnas.

TanStack Table no impone marcado, lo que permite ajustar densidad y estilo; y su separación entre
motor y presentación encaja con el filtrado del lado del main: la tabla no asume que tiene todos los
datos.

**Consecuencia.** `<TablaDatos>` es el componente más importante del renderer y se construye en el
hito C (`T-C-02`), antes de que existan listados que lo necesiten. Retrasarlo obligaría a reescribir
cada listado.

---

## ADR-011 — Generación de Excel

**Alternativas.**

| Opción | Veredicto |
|---|---|
| SheetJS (`xlsx`) | Rápido leyendo, pero la edición comunitaria tiene limitaciones en estilos y validación de datos, y su distribución cambió de canal |
| **ExcelJS** | **Elegido.** Escribe estilos, formato condicional y **validación de datos** (listas desplegables) |
| Generar CSV | **Descartado.** `ANEXO_A` exige `.xlsx` con estructura, colores y listas |

**Decisión: ExcelJS.**

**Justificación decisiva.** `ANEXO_A` §6.1 pide entregar cada plantilla en blanco **ya parametrizada
con los catálogos de la entidad**, es decir, con listas desplegables reales. Solo se puede si la
librería escribe validación de datos. ExcelJS lo hace; la edición comunitaria de SheetJS, no de forma
fiable.

**Consecuencias.** ExcelJS consume memoria con archivos grandes; para importaciones de 20.000 filas
se usa su API de flujo. Su mantenimiento es lento: aislado tras el puerto `LectorLibroExcel`, es
sustituible.

---

## ADR-012 — Generación de Word

**Contexto.** 8 documentos `.docx` con marcadores `{{CAMPO}}` (`ANEXO_A` §4.1), que la entidad debe
poder **editar** (`ANEXO_A` §4.2: ningún texto jurídico en el código).

**Alternativas.**

| Opción | Veredicto |
|---|---|
| `docx` (construcción programática) | **Descartado.** Metería los textos jurídicos en el código, contra `ANEXO_A` §4.2 |
| Convertir Markdown a `.docx` con Pandoc | **Descartado.** Dependencia externa que hay que instalar en el equipo del hospital |
| **docxtemplater** | **Elegido** |

**Decisión: docxtemplater**, con dos condiciones.

1. **`T-G-04` audita las 8 plantillas antes** de construir el generador. Los marcadores de
   sustitución simple funcionan tal cual; los de tabla (`{{TABLA_SALDOS_ANTERIORES}}`) **no son
   sustitución de texto** y requieren reescribir esa parte de la plantilla con la sintaxis de bucle.
   Es `RG-08`, y puede exigir acordar cambios en los `.docx` del cliente.
2. Validación previa: si tras sustituir queda un marcador sin resolver, **no se genera el
   documento**.

**Consecuencias.** Es la dependencia con mayor riesgo de sustitución, porque su formato de plantilla
forma parte del acuerdo con el cliente. Por eso la auditoría va primero.

---

## ADR-013 — Generación de PDF

**Alternativas.**

| Opción | Veredicto |
|---|---|
| pdfkit / PDFKit | Control total, pero maquetar informes tabulares a mano es lento y frágil |
| `@react-pdf/renderer` | Otro modelo de maquetación, distinto del de las pantallas: dos sistemas visuales que mantener |
| Puppeteer | **Descartado.** Descargaría un segundo Chromium, duplicando el instalador |
| **`webContents.printToPDF`** | **Elegido** |

**Decisión: `printToPDF` desde una ventana oculta.**

**Justificación.** Cero dependencias nuevas: usa el Chromium que la aplicación ya empaqueta. El
informe se compone con los mismos componentes React de las pantallas, más una hoja `impresion.css`.
Un solo sistema visual para pantalla y papel.

**Consecuencias.** Hay que esperar `document.fonts.ready` antes de imprimir; el CSS de impresión es
trabajo aparte; y la fidelidad se verifica a mano (Fase 6 §8). A cambio, el instalador no crece ni
un byte.

---

## ADR-014 — Códigos de barras y QR

**Decisión: `bwip-js`.**

**Justificación.** Genera Code128 y QR (los dos formatos que `RF-02-04` menciona) desde una sola
librería, funciona en Node y en navegador, y emite SVG y PNG. La alternativa serían dos paquetes
(`jsbarcode` + `qrcode`) con APIs distintas.

La hoja de etiquetas es HTML impreso con `printToPDF` (ADR-013), lo que permite parametrizar
etiquetas por fila, márgenes y tamaño según la papelería adhesiva del hospital.

**Verificación obligatoria.** La prueba no es visual: se imprime una hoja y **se lee con el escáner
USB real** (`T-G-06`). Un código que se ve bien pero no se lee no sirve de nada.

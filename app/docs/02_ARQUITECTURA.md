# 02 · Arquitectura

## Las cuatro capas

```
┌─────────────────────────────────────────────────────────────┐
│  renderer/            React 19 + Tailwind. Sin acceso a Node.│
│                       Habla SOLO por window.api              │
└──────────────────────────┬──────────────────────────────────┘
                           │  invocar(canal, entrada)
┌──────────────────────────┴──────────────────────────────────┐
│  preload/index.ts      UN archivo. Expone exactamente dos    │
│                        funciones. contextIsolation activo.   │
└──────────────────────────┬──────────────────────────────────┘
                           │  ipcRenderer.invoke
┌──────────────────────────┴──────────────────────────────────┐
│  main/                 Cadena de middleware → caso de uso →  │
│                        repositorio → SQLite. Excel y PDF.    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│  compartido/           Contrato IPC, DTOs, enums, errores…   │
│  compartido/motor/     …y el CÁLCULO, como dominio puro.     │
└─────────────────────────────────────────────────────────────┘
```

`compartido/` **no depende de nadie**. Es la única forma de que el mismo contrato y el mismo motor
valgan a los dos lados sin arrastrar Electron a la interfaz ni React al proceso principal.

## Las ocho fronteras que vigila un robot

No son convenciones que alguien deba recordar: las comprueba `npm run boundaries`
(dependency-cruiser) y la CI falla si se rompen.

| Regla | Qué impide |
|---|---|
| `motor-puro` | Que el motor importe `fs`, `electron`, `sqlite`, `react` o `Date` |
| `motor-solo-decimaljs` | Que el motor use cualquier librería que no sea `decimal.js` |
| `motor-sin-node` | Que el motor toque una API de Node |
| `compartido-no-depende-de-nadie` | Que `compartido/` importe de `main/` o `renderer/` |
| `renderer-no-toca-main` | Que la interfaz salte el IPC |
| `main-no-toca-renderer` | Lo contrario |
| `preload-minimo` | Que el puente crezca |
| `sin-imports-profundos-entre-modulos` | Que un módulo entre por dentro de otro en vez de por su `index.ts` |

> **Esta última regla se activó de verdad** mientras se implementaba ADR-027: el módulo de bajas
> importó directamente un repositorio de configuración y la CI lo rechazó. La solución fue exportarlo
> por el `index.ts` del módulo. La regla D-6 no es decorativa.

### Por qué el motor es puro

Porque sus cifras acaban en una **resolución firmada por el Gerente de una entidad pública**. Un
motor puro se prueba con casos escritos a mano tomados de `ANEXO_C`, sin base de datos, sin reloj y
sin sistema de archivos. Si el motor pudiera leer la hora, un test podría pasar hoy y fallar mañana;
si pudiera leer la base, probarlo exigiría montarla, y nadie lo probaría a fondo.

Tres barreras lo garantizan: TypeScript, ESLint y dependency-cruiser.

## Un módulo por dentro

Todos los módulos de `main/modules/` tienen la misma forma:

```
modules/<nombre>/
├── index.ts          Única superficie pública (regla D-6)
├── ipc/handlers.ts   Registra sus canales. Nada más.
├── casos-uso/        La lógica de aplicación. Recibe ctx, no importa Electron.
├── repositorio/      TODA la superficie de Drizzle vive aquí (ADR-005)
└── validaciones/     Los predicados de sus VAL-*
```

Los módulos: `configuracion`, `inventario`, `hojas-vida`, `calculo`, `bajas`, `informe`,
`documental`, `validaciones`.

**Un caso de uso nunca escribe SQL suelto ni construye consultas de Drizzle.** Eso vive en el
repositorio. La razón es poder cambiar el acceso a datos sin tocar la lógica, y poder leer la
lógica sin tropezar con `eq(tabla.campo, valor)` cada tres líneas.

## Cómo se añade algo

**Un canal IPC nuevo** = entrada en `compartido/ipc/canales.ts` (lista blanca) **y** en
`compartido/ipc/contrato.ts` (esquemas Zod) **y** `registro.registrar(...)` en el módulo. Nunca
inline. Los que mutan son síncronos —van dentro de una transacción— y escriben bitácora con
`ctx.bitacora` **en esa misma transacción**.

**Una validación nueva** = entrada en `compartido/reglas/validaciones.ts` (el catálogo, con su
código y severidad) **y** un predicado en el `val-NN.ts` de su módulo. El motor de validaciones no
puede importar módulos de dominio —sería un ciclo—, así que los predicados se **inyectan** desde
`ipc/registrarHandlers.ts`.

**Una pantalla nueva** usa las primitivas de `componentes/ui`, formularios con react-hook-form sobre
los esquemas Zod del contrato, textos en oración, icono + texto en todo semáforo y controles de
28 px o más.

**Un listado nuevo** usa `<TablaDatos>` con un canal paginado que filtre y ordene **en el proceso
principal**. Nunca traer todo al renderer: hay hospitales con 20.000 bienes.

## Qué se comparte y por qué

`compartido/` tiene diez carpetas, y cada una está ahí por una razón concreta:

| Carpeta | Por qué es compartida |
|---|---|
| `ipc/` | El contrato debe ser **el mismo** a los dos lados o el tipado no sirve de nada |
| `dtos/` | Lo que viaja por el cable |
| `enums/` | Los catálogos (`ESTADO_ACTUAL`, `CAUSAL_BAJA`…) alimentan a la vez los `CHECK` de la base y los desplegables de la interfaz |
| `motor/` | El cálculo. La interfaz muestra resultados que el proceso principal produjo con **este mismo código** |
| `reglas/` | El catálogo de la revisión de la configuración (7 validaciones), con su severidad y su mensaje |
| `parametros/` | Los 16 parámetros de cálculo, con su esquema |
| `tipos/` | `Centavos`, `X10k`, `FechaIso`, `Uuid`: tipos nominales que impiden confundir pesos con centavos |
| `errores/` | Las clases de error y su traducción a DTO |
| `esquemas/` | Los `zTexto`, `zUuid`, `zFechaIso` que usan contrato y formularios |
| `estados/` | Las máquinas de estados |

# 03 · Arranque y dónde viven los datos

## La secuencia, en orden

`main/arranque/index.ts`. Todo lo que toca Electron o el sistema **llega inyectado**, así que la
secuencia entera se prueba sin arrancar Electron.

```
1. Registro técnico          →  userData/logs/app-AAAA-MM-DD.log
2. config.json               →  ajustes de la instalación, si existe
3. Ruta de datos             →  --datos= → config.json → userData
4. ¿Unidad de red?           →  si lo es, la app NO abre la base y se cierra (código 3)
5. Base migrada              →  con respaldo previo si hay migraciones que aplicar
6. Respaldo diario           →  uno por día, con rotación
7. Registrar los 53 canales
```

## Dónde acaban los datos

Precedencia (plan 4.3 §6): **`--datos=<ruta>` → `config.json` → `userData`**.

Por defecto, `userData` de Electron:

```
%APPDATA%\Valuación de Activos\
├── valuacion.db          la base (más -wal y -shm)
├── respaldos/            respaldo diario, con rotación
├── logs/                 app-AAAA-MM-DD.log
├── almacen/              soportes documentales adjuntos
└── config.json           si se creó
```

> **Trampa conocida, y no es menor.** Electron deriva `userData` de `productName`, y ese nombre es
> **idéntico en desarrollo y en el instalador**. Por eso `npm run dev` abre **la misma base** que la
> app instalada y le aplica las migraciones de la rama en la que se esté trabajando; después el
> instalador, más viejo, puede no poder abrirla. Para desarrollar use **`npm run dev:aislado`**.
> Ver [10_CONSTRUIR_Y_DISTRIBUIR.md](10_CONSTRUIR_Y_DISTRIBUIR.md).

### Argumentos de línea de comandos

| Argumento | Qué hace |
|---|---|
| `--datos=<ruta>` | Cambia solo el directorio de datos |
| `--user-data=<ruta>` | Aísla la **instalación entera**. Lo usan los E2E y `dev:aislado`. Se lee antes de `ready` |

## El bloqueo de unidades de red

**Está prohibido poner la base en una unidad de red compartida**, y la aplicación lo impide: si la
ruta es de red, **no abre la base** y sale con código 3 mostrando por qué.

No es paranoia. SQLite se corrompe con el bloqueo de archivos por red, y aquí se custodia evidencia
contable que va a sustentar resoluciones firmadas. Perder la base no es perder «unos datos».

La detección tiene dos caminos:

- **UNC** (`\\servidor\recurso`) se detecta **sin consultar nada**, con una expresión regular. Es
  determinista y funciona igual en cualquier sistema.
- **Unidades mapeadas** (`Z:\...`) se consultan al sistema: PowerShell (`Win32_LogicalDisk.DriveType`,
  donde 4 = red) en Windows, `df -P -T` en el resto.

Si la consulta al sistema falla, **la aplicación arranca igual** y lo deja registrado: un fallo del
sistema operativo no debe impedir trabajar. Pero si la ruta es UNC, no hay indulto.

> **Tres defectos de la CI vinieron del mismo sitio, y conviene tenerlo presente.** El detector usaba
> `isAbsolute` y `resolve` de `node:path`, que se comportan según **la plataforma que ejecuta**, no
> según la que se está evaluando: `Z:\datos` es absoluta en Windows y relativa en POSIX, y
> `posix.resolve('\\\\servidor\\recurso')` antepone el directorio de trabajo y destruye la UNC. La
> corrección fue `esRutaAbsoluta(ruta, plataforma)` y no resolver nunca una UNC.
>
> **Desconfíe de cualquier uso de `node:path` sin plataforma explícita en el arranque.**

## Migraciones

Cuatro, aplicadas en orden por nombre:

| Archivo | Qué trae |
|---|---|
| `0000_esquema_inicial.sql` | Las 18 tablas (regeneradas desde cero con ADR-028) |
| `0001_indices_fts.sql` | Búsqueda de texto completo (FTS5) sobre el inventario |
| `0002_triggers_integridad.sql` | Los **13 disparadores** de integridad, estado e inmutabilidad |

Se **incrustan en el paquete como texto** (`import.meta.glob` con `?raw`): en la app instalada no
hay archivos `.sql` sueltos que puedan faltar o que alguien pueda editar. Los scripts de consola
leen los mismos archivos desde el disco.

Antes de aplicar migraciones se hace un **respaldo previo**. El registro de arranque deja constancia:

```
INFO  base de datos lista {"version":3,"migradaDesde":0,"aplicadas":["0000_…","0001_…","0002_…"]}
INFO  base de datos lista {"version":3,"migradaDesde":3,"aplicadas":[]}
```

La segunda línea es un arranque posterior: encontró la base ya al día y no aplicó nada.

## Instancia única

`app.requestSingleInstanceLock()`. Si ya hay una instancia abierta, la nueva **enfoca la ventana
existente y se cierra**, en vez de abrir dos procesos sobre la misma base.

El bloqueo va por `userData`, así que dos instalaciones con directorios distintos —la instalada y
`dev:aislado`— **no se estorban**.

## Seguridad del proceso

`main/seguridad/`:

- `endurecerApp.ts` — `contextIsolation` activo, `nodeIntegration` desactivado, sandbox del renderer.
- `denegarPermisos` — el renderer no obtiene cámara, micrófono, geolocalización ni notificaciones.
- `csp.ts` — Content-Security-Policy de la ventana.
- `opcionesVentana.ts` — opciones seguras por defecto.

Hay un E2E **conductual** que lo comprueba desde dentro de la ventana: que no exista `require`, que
no haya Node, y que `window.api` exponga **exactamente** `invocar` y `suscribir`. No se fía de la
configuración: lo verifica.

# 10 · Construir, desarrollar y distribuir

## Los comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo. **Escribe en la misma base que la app instalada** — lea el aviso |
| **`npm run dev:aislado`** | Desarrollo sobre una instalación propia y **en blanco cada vez** |
| `npm run build` | `typecheck` + `electron-vite build` → `out/` |
| `npm run pack` | Empaqueta sin instalador → `dist/win-unpacked/` |
| `npm run dist:win` | **El instalador** → `dist/*.exe` |
| `npm run verificar:todo` | La puerta de calidad |
| `npm run test:e2e` | Playwright |
| `npm run datos:prueba` | Genera el hospital ficticio en `/Datos_de_prueba` |
| `npm run instructivo` | Genera el manual de diligenciamiento |
| `npm run db:generar` | Migración nueva desde el esquema (drizzle-kit) |
| `npm run db:migrar` | Aplica migraciones desde consola |
| `npm run db:triggers` | Regenera los 119 disparadores |
| `npx tsx scripts/sembrar.ts` | Siembra datos de carga para medir rendimiento (no tiene atajo en `package.json`) |

## Desarrollo aislado: léalo antes de usar `npm run dev`

> **`npm run dev` abre la base real de la app instalada.**
>
> Electron deriva `userData` de `productName`, y ese nombre es idéntico en desarrollo y en el
> instalador. Los dos abren `%APPDATA%\Valuación de Activos\valuacion.db`. Comprobado ejecutando
> Electron, no deducido.
>
> **El riesgo concreto:** el arranque aplica las migraciones pendientes. Si trabaja en una rama con
> migraciones nuevas, actualiza el esquema de la base real y el instalador —más viejo— puede
> quedarse sin poder abrirla. Hay respaldo previo y respaldo diario, así que se recupera; pero es un
> susto evitable.
>
> Además comparten el bloqueo de instancia única: **con la app instalada abierta, `npm run dev` ni
> arranca**, lo que parece que dev está roto.

Use `dev:aislado`:

```
npm run dev:aislado                        → app/.datos-dev, en blanco
npm run dev:aislado -- --conservar         → mantiene lo de la vez anterior
npm run dev:aislado -- caso-b              → escenario aparte, en blanco
npm run dev:aislado -- --conservar caso-b  → ese escenario, sin borrar
```

Aísla la instalación entera —base, respaldos, registros y almacén—, igual que los E2E.
`app/.datos-dev/` está en `.gitignore`.

### La limpieza es al abrir, no al cerrar

Deliberado. Si se limpiara al cerrar, un cierre brusco —terminal matada, cuelgue, un `electron.exe`
que queda colgado— se la saltaría, y la ejecución siguiente arrancaría con restos **justo cuando se
la cree limpia**. Limpiando al abrir, la garantía no depende de cómo terminó la vez anterior; de
paso, los registros de la sesión anterior siguen ahí para mirarlos.

El script solo puede borrar dentro de `.datos-dev`: el nombre de escenario se restringe a un
segmento (`[A-Za-z0-9._-]+`) y se comprueba además que el destino esté bajo esa raíz. Sin eso, una
errata como `../..` sería un borrado recursivo sobre cualquier carpeta del equipo.

También limpia `ELECTRON_RUN_AS_NODE`, que convierte el binario de Electron en un Node pelado y hace
fallar `import { BrowserWindow } from 'electron'` al arrancar.

> **Si arranca y se cierra en silencio**, suele quedar un `electron.exe` de un intento anterior
> reteniendo el bloqueo. Ciérrelo y reintente.

## El instalador

`electron-builder.yml`. NSIS, no *one-click* (`allowToChangeInstallationDirectory`): el hospital elige dónde instalar. `perMachine: false`, así que no exige privilegios de administrador. **Actualizar o desinstalar jamás borra los datos del usuario** (`T-H-01`).

```
appId:       co.fundasaberes.valuacion-activos
productName: Valuación de Activos
artifact:    ${productName}-${version}-instalador.${ext}
```

Pesa unos **109 MB** y lleva dentro:

- El `asar` con la aplicación.
- `better-sqlite3` desempaquetado (módulo nativo, ABI 149).
- **`resources/plantillas/` con los 28 archivos** `.xlsx` y `.docx`, vía `extraResources`.

### Dos cosas pendientes del propietario

**No hay firma de código** (`T-H-02`). Windows mostrará el aviso de SmartScreen al instalar. Es una
decisión con coste que corresponde al propietario.

**No hay actualización automática.** No está configurado `publish`, así que una versión nueva se
instala encima de la anterior a mano. Los datos sobreviven: viven en `userData`, no en el directorio
de instalación.

## Añadir una migración

1. Cambiar el esquema en `src/main/infraestructura/db/esquema/`.
2. `npm run db:generar`.
3. **Renombrar** el archivo generado a algo descriptivo (`0003_firmantes_entidad.sql`, no
   `0003_needy_vanisher.sql`) y actualizar el `tag` en `meta/_journal.json`.
4. Revisar el SQL. Si toca disparadores, `npm run db:triggers` y comprobar que el test de
   sincronía pasa.
5. **Probarla sobre una base preexistente**, no solo sobre una nueva. Es el caso real de un hospital
   que ya tiene la aplicación instalada.

> Prefiera migraciones **aditivas**. SQLite **no permite eliminar una columna que participa en una
> clave foránea** —está comprobado—, y reconstruir una tabla con disparadores sobre bases con datos
> reales es caro y arriesgado. Es la razón de que la tabla `responsable` siga existiendo tras
> ADR-027: catorce columnas apuntan a ella.

## Versiones

Todas exactas, sin `^` ni `~`, con `package-lock.json` versionado. Cambiar cualquiera exige entrada
en la bitácora; cambiar la major de Electron, el procedimiento de ADR-002.

La versión de la aplicación sigue en **0.1.0**. Subirla es decisión del propietario.

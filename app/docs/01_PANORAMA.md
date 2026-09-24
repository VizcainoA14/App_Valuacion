# 01 · Panorama

## Qué es

Una aplicación de **escritorio** para que el responsable de activos de una **E.S.E** colombiana
(hospital público) valore sus bienes cuando quiera: carga lo que contó en el barrido, calcula la
depreciación y la obsolescencia a la fecha que elija, ve qué bienes son candidatos a baja y se lleva
el informe en PDF.

Se **cede a los hospitales**: el hospital la instala, la usa solo y se lleva su informe. No hay
servidor, ni nube, ni cuenta de usuario.

## Qué hace, de punta a punta

| Sección | Qué hace | Cada cuánto |
|---|---|---|
| **Iniciar un proceso** | Nombre, **fecha de corte** y datos del hospital; a mano o desde `PL-01`. Es lo primero que ofrece la aplicación, junto a continuar uno en curso (ADR-029) | En cada valuación |
| **Configurar** | Sedes, servicios, clases de activo y parámetros de cálculo del proceso | Al iniciarlo |
| **Formatos** | Descarga las 5 plantillas, ya con sus catálogos como listas desplegables | Antes de cada barrido |
| **Inventario** | Carga un **barrido** (`PL-03`) y los datos económicos (`PL-05`), con reporte fila por fila. El barrido actualiza lo que ya había | En cada barrido |
| **Calcular** | Depreciación, obsolescencia y semáforo **a la fecha de corte del proceso**. Uno por proceso: recalcular lo reemplaza. 20.000 bienes en 1,2 s | Cuando el inventario esté cargado |
| **Bajas** | El cálculo señala candidatos con su motivo; el hospital **registra** las que decidió | Cuando se decidan |
| **Informe** | El informe del cálculo en PDF, tamaño Carta, con el método declarado | Al final |
| **Finalizar** | El proceso queda de solo lectura; se consulta y su informe se vuelve a sacar cuando se quiera | Al terminar |

El proceso completo de saneamiento contable —conciliación, avalúos, Comité, resoluciones,
entrega— lo hace el hospital **por su cuenta**; la aplicación no lo tramita ni se bloquea por él
(ADR-028). `/especificacion/teoria` sigue describiéndolo entero.

## Tres decisiones que explican casi todo

**No hay inicio de sesión ni usuarios** (ADR-016). Es una aplicación monousuario en el equipo del
hospital. Por eso no hay permisos, ni roles, ni sesión en el IPC. Lo que sí hay es una **bitácora
inmutable** de todo lo que cambia.

**La app no se usa en campo** (ADR-015). No hay cámara, ni escáner, ni aplicación móvil. El
inventario entra **solo por importación de `PL-03`**. Quien cuenta los bienes llena un Excel; quien
usa la aplicación lo importa.

**La app calcula y registra; no decide ni tramita** (ADR-028). Señala candidatos a baja con su
motivo; la persona decide por el trámite de su entidad y aquí solo lo anota. Nada espera un acta,
una firma o la aprobación de un comité para dejar trabajar.

## El código en cifras

Contado el 2026-09-24, tras ADR-028:

| | |
|---|---:|
| Líneas de TypeScript/TSX | **19.053** |
| Archivos de `src/main` | 120 |
| Archivos de `src/renderer` | 41 |
| Archivos de `src/compartido` | 43 |
| Archivos de `src/preload` | **1** |
| Módulos analizados por dependency-cruiser | 202 |
| Tablas en la base | **18** |
| Disparadores | **16** |
| Canales IPC | **53** |
| Validaciones declaradas (`VAL-*`) | **7** (revisión de la configuración) |
| Pruebas unitarias y de integración | **360** |
| Pruebas de extremo a extremo | **16** |

Que `src/preload` tenga **un solo archivo** no es casualidad: es el puente entre el mundo aislado de
la interfaz y el proceso con acceso al sistema, y cuanto más pequeño, menos superficie de ataque.

## El stack, congelado

Las versiones son **exactas** en `package.json`, sin `^` ni `~`, y `npm run verificar:versiones` lo
comprueba. Cambiar cualquiera exige entrada en la bitácora.

| | |
|---|---|
| Electron | 44.1.1 |
| React | 19.2.8 |
| TypeScript | 5.9.3 |
| Vite | 7.3.6 |
| better-sqlite3 | 13.0.3 |
| Drizzle ORM | 0.45.2 |
| Zod | 4.5.4 |
| decimal.js | 10.6.0 |
| ExcelJS | 4.4.0 |
| Tailwind | 3.4.19 |
| Vitest | 4.1.11 |
| Playwright | 1.62.1 |
| electron-builder | 26.15.3 |

El detalle y la verificación están en [decisiones-runtime.md](decisiones-runtime.md).

## Dónde vive cada cosa

```
app/
├── src/
│   ├── compartido/     Lo que main y renderer comparten. NO depende de nadie.
│   │   └── motor/      El cálculo. Dominio puro: sin fs, electron, sqlite, react ni Date.
│   ├── main/           Proceso principal: base de datos, IPC, Excel, PDF, arranque.
│   ├── preload/        Un archivo. Expone exactamente `invocar` y `suscribir`.
│   └── renderer/       La interfaz. React + Tailwind. No toca el sistema.
├── recursos/semillas/  Catálogos sugeridos, abreviaturas, hospital de demostración.
├── scripts/            Herramientas de consola (migrar, sembrar, generar datos…).
├── tests/e2e/          Playwright sobre la app real, y también sobre el instalador.
└── docs/               Esto.
```

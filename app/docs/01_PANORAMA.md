# 01 · Panorama

## Qué es

Una aplicación de **escritorio** que ejecuta el proceso de valuación de activos de una **E.S.E**
colombiana (hospital público): recoge el inventario físico, calcula la depreciación, la
obsolescencia y el deterioro, señala qué bienes cumplen criterio de baja y emite el informe en PDF
que sustenta el saneamiento contable.

Se **cede a los hospitales**: el hospital la instala, la usa solo y se lleva su informe. No hay
servidor, ni nube, ni cuenta de usuario.

## Qué hace hoy, de punta a punta

Un hospital recorre el proceso completo sin ayuda:

| # | Etapa | Qué hace |
|:-:|---|---|
| 1 | **Configurar** | Datos de la entidad, sedes, servicios, clases de activo, parámetros y ejercicio |
| 2 | **Formatos** | Descarga las 28 plantillas, ya con sus catálogos como listas desplegables |
| 3 | **Importar** | Sube `PL-03` (inventario) y `PL-05` (fecha y costo), con reporte fila por fila |
| 4 | **Calcular** | Depreciación, obsolescencia, deterioro y semáforo. 20.000 bienes en 1,27 s |
| 5 | **Bajas** | Propone candidatos con su motivo; el hospital decide. La app **no da de baja nada** |
| 6 | **Informe** | PDF en tamaño Carta, con el método declarado y firmado por Gerente y Contador |

Lo que **no** hace todavía: conciliación contable (paso 04), valuación técnica de muebles (07),
inmuebles (08), Comité y resoluciones (09-10) y entrega contractual (11). Son las *extensiones*, y el
orden lo fija ADR-026.

## Tres decisiones que explican casi todo

**No hay inicio de sesión ni usuarios** (ADR-016). Es una aplicación monousuario en el equipo del
hospital. Por eso no hay permisos, ni roles, ni sesión en el IPC. Lo que sí hay es una **bitácora
inmutable** de todo lo que cambia.

**La app no se usa en campo** (ADR-015). No hay cámara, ni escáner, ni aplicación móvil. El
inventario entra **solo por importación de `PL-03`**. Quien cuenta los bienes llena un Excel; quien
usa la aplicación lo importa.

**La app registra estados; no decide.** Ninguna baja se ejecuta desde el código. La aplicación
señala candidatos con su motivo, la persona decide, y el paso a EJECUTADO lo bloquea un disparador
hasta que exista el acta del Comité. Si algo parece que «el sistema decidió», está mal planteado.

## El código en cifras

Contado el 2026-09-04:

| | |
|---|---:|
| Líneas de TypeScript/TSX | **21.967** |
| Archivos de `src/main` | 132 |
| Archivos de `src/renderer` | 45 |
| Archivos de `src/compartido` | 43 |
| Archivos de `src/preload` | **1** |
| Módulos analizados por dependency-cruiser | 218 |
| Tablas en la base | **44** |
| Disparadores de integridad | **119** |
| Canales IPC | **55** |
| Validaciones declaradas (`VAL-*`) | **58** |
| Pruebas unitarias y de integración | **379** |
| Pruebas de extremo a extremo | **15** |

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

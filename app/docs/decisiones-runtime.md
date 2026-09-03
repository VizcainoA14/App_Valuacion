# Decisiones de runtime — versiones congeladas

**Tarea:** `T-A-01` · **Fecha de congelación:** 2026-09-02 · **Verificado contra:** registro público de npm y
`https://electronjs.org/headers/index.json`

> Este archivo **sustituye** la línea base propuesta en `plan_desarrollo/FASE_3_STACK/3.1_stack_y_versiones.md`
> (así lo ordena ese mismo documento, §1). Todas las versiones se fijan **exactas** en `package.json`
> (sin `^` ni `~`) con `package-lock.json` versionado. Cambiar cualquiera de estas versiones exige una
> entrada en `/gestion_proyecto/bitacora.md` y, si es la major de Electron, el procedimiento de ADR-002.
>
> Para re-verificar: `npm run verificar:versiones`.

---

## 1. Tiempo de ejecución

| Componente | Versión congelada | Verificación |
|---|---|---|
| **Electron** | **44.1.1** | `latest` en npm al 2026-09-02. Majors con soporte activo: 44 / 43 / 42. Cumple el mínimo absoluto 33.x de ADR-002 y da la ventana de soporte más larga |
| **Chromium (renderer)** | **152.0.7977.65** | El que incorpora Electron 44.1.1. Determina el objetivo `electron >= 44.0` del entorno `[electron]` de `.browserslistrc` |
| **Node interno de Electron** | **24.19.0** | El que ejecuta el proceso main. Por eso `@types/node` se fija en la serie 24.x |
| **ABI de módulos nativos** | **149** | `better-sqlite3` debe compilarse/obtenerse contra este ABI (`electron-builder install-app-deps`) |
| **Node de herramientas (dev)** | **22.20.0** (máquina de desarrollo) | `engines.node: ">=22.20.0"`. Solo construye; no ejecuta la app. `better-sqlite3` 13 exige Node ≥ 22 |

## 2. Lenguaje y construcción

| Componente | Versión congelada | Justificación de la elección |
|---|---|---|
| **TypeScript** | **5.9.3** | La última de la serie 5.x. Se descartó **7.0.2** (`latest`): es el compilador nativo nuevo y `typescript-eslint` 8.69.0 solo soporta `>=4.8.4 <6.1.0`. Se descartó 6.0.3 (release puente, sin beneficio y con deprecaciones). Migrar a 6/7 exigirá un ADR nuevo |
| **Vite** | **7.3.6** | La última que `electron-vite` 5.0.0 acepta (peer: `^5 ‖ ^6 ‖ ^7`). Vite 8.2.2 existe pero **no** es compatible con electron-vite 5 |
| **electron-vite** | **5.0.0** | `latest` |
| **@vitejs/plugin-react** | **5.2.0** | La serie 6.x exige Vite 8; la 5.x soporta Vite 7 |
| **electron-builder** | **26.15.3** | `latest`. **Sin `install-app-deps`**: ver §4, better-sqlite3 ya no se recompila |
| **browserslist-to-esbuild** | **2.1.1** | Traduce `.browserslistrc` al objetivo de esbuild (plan 3.2 §4) |

## 3. Interfaz (congeladas las que se instalan en el hito A)

| Componente | Versión congelada | Nota |
|---|---|---|
| **React / React DOM** | **19.2.8** | — |
| **@types/react / @types/react-dom** | **19.2.18 / 19.2.5** | — |
| **Tailwind CSS** | **3.4.19** | **NO v4** (rompe el piso `R-05`, riesgo `RG-09`). Se instala en el hito B/C junto con el sistema de diseño |

Congeladas el 2026-09-02 al construir el paso 01 (`T-B-10`), tras verificar sus peers y el piso `R-05`:

| Componente | Versión congelada | Nota |
|---|---|---|
| **react-router** | **7.18.3** | Modo memoria. La 8.3.1 exige React ≥ 19.2.7 y cambia API; se sigue la major del plan |
| **@tanstack/react-query** | **5.102.8** | Estado de servidor sobre IPC |
| **@tanstack/react-table** | **8.21.3** | La 9.2.4 existe; se pospone hasta `T-C-02` con medición |
| **@tanstack/react-virtual** | **3.14.10** | Virtualización de 20.000 filas |
| **zustand** | **5.0.15** | Estado de interfaz |
| **react-hook-form / @hookform/resolvers** | **7.87.0 / 5.9.1** | `zodResolver` con Zod 4 |
| **lucide-react** | **1.39.0** | Iconografía |
| **@radix-ui/react-\*** | dialog 1.1.23 · tabs 1.1.21 · select 2.3.7 · tooltip 1.2.16 · checkbox 1.3.11 · switch 1.3.7 · label 2.1.15 · radio-group 1.4.7 · dropdown-menu 2.1.24 · popover 1.1.23 · toast 1.2.23 · scroll-area 1.2.18 · separator 1.1.15 | Primitivas accesibles |
| **postcss / autoprefixer** | **8.5.26 / 10.5.4** | Autoprefixer lee `.browserslistrc` |
| **clsx / tailwind-merge / class-variance-authority** | **2.1.1 / 3.6.0 / 0.7.1** | Composición de clases |
| **exceljs** | **4.4.0** | Importador TR-02 (solo en el main) |

Recharts y docxtemplater/pizzip/bwip-js se congelan cuando lleguen sus tareas (hitos D y G).

> **`uuid` 14.0.2 retirado el 2026-09-02.** Es un paquete solo ESM: aunque electron-builder lo
> incluía en el `app.asar`, el main empaquetado no lograba resolverlo y la aplicación instalada salía
> con código 1 antes de escribir el registro (lo detectó el E2E sobre el paquete, que no se había
> vuelto a ejecutar desde el hito A). UUID v7 se implementa en `infraestructura/db/identificadores.ts`
> sobre `node:crypto` (RFC 9562), con test de versión, variante, orden temporal y unicidad.
> **Regla derivada:** el E2E con `PROBAR_PAQUETE=1` forma parte del cierre de cada hito, no solo de CI.

## 4. Dominio y datos

| Componente | Versión congelada | Nota |
|---|---|---|
| **better-sqlite3** | **13.0.3** | Único módulo nativo autorizado. `engines: node >= 22` ✓. **Hallazgo de T-A-01:** la v13 es **Node-API** con binarios empaquetados en `prebuilds/<plataforma>-<arquitectura>.node` — estables entre ABIs de Node y Electron. Ya **no** se recompila con `install-app-deps` (que además exige Visual Studio C++ y falla sin él): se eliminó el `postinstall` del plan 4.2 §1 y se fijó `npmRebuild: false` en `electron-builder.yml`. `asarUnpack` sigue siendo obligatorio. Verificado con `SELECT 1` en Node 22 y en el paquete de Electron 44 (E2E) |
| **@types/better-sqlite3** | **9.6.0** | — |
| **decimal.js** | **10.6.0** | Se instala en el hito B (`T-B-02`). ADR-006 |
| **Zod** | **4.5.4** | La serie 4 está estable y madura; el plan la autorizaba condicionada a eso |

## 5. Calidad y pruebas

| Componente | Versión congelada | Nota |
|---|---|---|
| **ESLint** | **10.9.1** | Configuración plana. `eslint-plugin-compat` 7.0.2 y `typescript-eslint` 8.69.0 la soportan |
| **typescript-eslint** | **8.69.0** | Peer TS `<6.1.0` — la razón por la que TS queda en 5.9.3 |
| **eslint-plugin-compat** | **7.0.2** | Verifica el piso `R-05` |
| **dependency-cruiser** | **18.2.0** | Reglas de frontera D-1…D-6 |
| **Prettier** | **3.9.6** | — |
| **Stylelint** | **17.14.1** + `stylelint-config-standard` 40.0.0 + `stylelint-no-unsupported-browser-features` 8.1.1 | Lo único que detecta CSS fuera del piso |
| **Vitest** | **4.1.11** | — |
| **@testing-library/react** | **16.3.3** | — |
| **@playwright/test** | **1.62.1** | E2E con la API `_electron`, sobre el paquete construido |
| **fast-check** | **4.9.0** | Propiedades del motor (hito D) |
| **tsx** | **4.23.13** | Ejecuta los scripts de `scripts/` |

## 6. Piso de compatibilidad (`R-05`) vigente

Congelado al 2026-09 (4 años atrás = septiembre de 2022), según plan 3.2 §2:

```
chrome >= 105 · edge >= 105 · firefox >= 104 · safari >= 15.6 · ios_saf >= 15.6 · samsung >= 18
```

Entorno `[electron]` de `.browserslistrc`: `electron >= 44.0` (Chromium 152). El piso se recalcula en
cada cierre de hito (plan 3.2 §8).

`update-browserslist-db` se ejecutó como parte de `T-A-01` tras el `npm install` inicial.

## 7. Mediciones base (`T-A-05`)

Medidas el 2026-09-02 sobre el esqueleto del hito A (sin reglas de negocio), en la máquina de
desarrollo (Windows 11). CI vigila el paquete del renderer: +10 % entre commits exige justificación.

| Métrica | Objetivo (plan 3.1 §9) | Medido | Nota |
|---|---|---|---|
| Instalador Windows (NSIS) | < 120 MB | **98,9 MB** ✓ | Tras recortar prebuilds ajenos y locales (es, es-419, en-US) |
| Aplicación instalada | < 350 MB | **324 MB** ✓ | `dist/win-unpacked`; 234 MB son el binario de Electron |
| Paquete del renderer (JS sin comprimir) | < 2,5 MB | **193,5 kB** ✓ | React + esqueleto de diagnóstico |
| Arranque en frío | < 5 s (`RNF-14`) | **≈ 5,0 s** primer arranque / 0,7–1,2 s siguientes | Primer arranque incluye instrumentación de Playwright y primer escaneo del antivirus. La medición **en el hardware objetivo** (i3, 8 GB, HDD) queda para la Fase 9 |

Dos recortes de tamaño aplicados en `electron-builder.yml` (re-verificados con el E2E sobre el
paquete): better-sqlite3 se empaqueta solo con el prebuild de la plataforma destino (sin `deps/`,
`src/` ni binarios de otras plataformas, −25 MB) y Chromium solo con los idiomas es/es-419/en-US
(−47 MB).

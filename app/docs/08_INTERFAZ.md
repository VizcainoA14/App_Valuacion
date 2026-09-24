# 08 · La interfaz

React 19 + Tailwind 3.4. **No toca el sistema**: todo pasa por `window.api`.

## Router en memoria

`createMemoryRouter`. **No es un descuido**: no hay servidor, y `file://` con historial produce
pantallas en blanco al recargar.

| Ruta | Sección |
|---|---|
| `/` | **Procesos**: iniciar uno nuevo, continuar uno en curso, consultar uno finalizado |
| `/nuevo-proceso` | Asistente de inicio: nombre, fecha de corte y hospital, también desde `PL-01` |
| `/formatos` | **Formatos** en blanco, sin listas desplegables |
| `/proceso/:p` | **Resumen**: en qué va el proceso, y el botón **Finalizar** |
| `/proceso/:p/configuracion/{hospital,sedes,clases,parametros}` | **Configurar** |
| `/proceso/:p/formatos` | **Formatos** con los catálogos del proceso |
| `/proceso/:p/inventario/{importar,bienes,barridos}` | **Inventario** |
| `/proceso/:p/calculo` | **Calcular** / **Recalcular** a la fecha del proceso; totales, semáforo, exclusiones y bien por bien |
| `/proceso/:p/bajas` | **Bajas**: candidatos del cálculo y bajas registradas |
| `/proceso/:p/informe` | **Informe** del cálculo |

Todo cuelga del **proceso** (ADR-029), y el proceso es siempre **el de la ruta**: no se recuerda uno
"activo" que pudiera mezclar lo de dos procesos. Un proceso finalizado muestra una banda de solo
lectura y sus pantallas no ofrecen acciones que modifiquen (`useSoloLectura`); la base lo impediría
igual.

## Estado: dos clases, y no se mezclan

**Datos de negocio** → TanStack Query sobre el IPC. Viven en SQLite; la interfaz solo los consulta.

**Estado de la interfaz** → Zustand (`app/estado.ts`). Existe solo mientras la ventana está abierta:
tema y densidad.

Confundirlos es la vía rápida a datos rancios en pantalla.

## Componentes

`componentes/ui/` — primitivas accesibles: `Boton`, `Campo`, `AreaTexto`, `Selector`, `Casilla`,
`Aviso`, `Insignia`, `Cargando`, `EstadoVacio`, `Seccion`, `Encabezado`, `TablaSimple`.

Compuestos:

| | |
|---|---|
| `TablaDatos/` | Tabla **virtualizada** con filtro, orden y paginación **en el proceso principal** |
| `AsistentePasos/` | El progreso de la configuración, parte por parte |
| `Dialogo/` | Modal accesible |
| `ImportarPlantilla.tsx` | La importación, reutilizada por el asistente de inicio del proceso |

`TablaDatos` está virtualizada porque hay hospitales con 20.000 bienes. **Nunca se trae todo al
renderer**: el canal pagina, filtra y ordena del otro lado.

## Formato

`formato/` centraliza la presentación en **es-CO**: `formatearDinero`, `formatearFecha`,
`formatearMarcaTiempo`, `formatearIndice`, `formatearPorcentajeX`, `formatearEntero`,
`formatearDecimal`.

Está centralizado a propósito: el dinero viene en centavos y mostrarlo mal es fácil.

## Accesibilidad

Reglas que se aplican en todas las pantallas:

- Contraste ≥ 4,5:1 en claro y oscuro, con tokens semánticos de Tailwind.
- **Icono + texto en todo semáforo.** Nunca solo color: no todo el mundo distingue verde de naranja.
- Controles de 28 px o más.
- Textos en oración, no en mayúscula sostenida ni en Título De Cada Palabra.
- El asterisco de «obligatorio» va en la etiqueta, **fuera del nombre accesible** del control.
- Formularios con react-hook-form sobre los **esquemas Zod del contrato**: la misma validación a los
  dos lados.

Para diseñar o revisar una pantalla, la skill `apple-design` del repositorio lleva las guías.

## Red de seguridad

`app/LimiteError.tsx`. Una excepción de render ya no deja la ventana en blanco: muestra el error y
**lo envía al registro técnico del proceso principal** (`app:registrarErrorRenderer` →
`userData/logs/`).

> Si alguien reporta «no muestra nada», el primer sitio donde mirar es `userData/logs/app-*.log`.
> El límite de error registra ahí toda excepción con su pila.

## Qué desapareció con ADR-027, ADR-028 y ADR-029

La sección **Responsables** (ADR-027) y, con ADR-028, todo lo que dependía del ejercicio: la
pantalla del ejercicio y su fecha de corte única, el panel de validaciones que bloqueaba el avance
entre pasos, la casilla de "método confirmado por acta", las propuestas de baja con su recorrido
por el Comité, los datos del contador y el bloque de firmas del informe.

Con ADR-029 se fueron el selector de entidades, la lista de cortes a distintas fechas y la
clonación de parametrización entre entidades.

La obsolescencia funcional, que antes se marcaba sobre un resultado de cálculo, ahora se declara
sobre el **bien** desde el listado del cálculo, y pesa al recalcular.

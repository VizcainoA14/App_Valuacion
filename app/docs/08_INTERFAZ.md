# 08 · La interfaz

React 19 + Tailwind 3.4. **No toca el sistema**: todo pasa por `window.api`.

## Router en memoria

`createMemoryRouter`. **No es un descuido**: no hay servidor, y `file://` con historial produce
pantallas en blanco al recargar.

| Ruta | Etapa |
|---|---|
| `/` | Selector de entidad |
| `/formatos` | **Etapa 2.** No exige entidad: se pueden obtener los formatos antes de configurar nada |
| `/nueva-entidad` | Asistente de creación, también desde `PL-01` |
| `/entidad/:id/paso/01/{entidad,sedes,clases,parametros,ejercicio}` | **Etapa 1** |
| `/entidad/:e/ejercicio/:j/paso/02/{importar,bienes,cobertura}` | **Etapa 3** |
| `/entidad/:e/ejercicio/:j/paso/05/{calcular,resultados}` | **Etapa 4** |
| `/entidad/:e/ejercicio/:j/paso/09/{candidatos,propuestas}` | **Etapa 5** |
| `/entidad/:e/ejercicio/:j/paso/11` | **Etapa 6 · informe** |

El paso 01 cuelga de la **entidad**, no del ejercicio, porque el ejercicio nace ahí. Los demás
cuelgan del ejercicio.

## Estado: dos clases, y no se mezclan

**Datos de negocio** → TanStack Query sobre el IPC. Viven en SQLite; la interfaz solo los consulta.

**Estado de la interfaz** → Zustand (`app/estado.ts`). Existe solo mientras la ventana está abierta:
tema, densidad, entidad activa y ejercicio activo.

Confundirlos es la vía rápida a datos rancios en pantalla.

## Componentes

`componentes/ui/` — primitivas accesibles: `Boton`, `Campo`, `AreaTexto`, `Selector`, `Casilla`,
`Aviso`, `Insignia`, `Cargando`, `EstadoVacio`, `Seccion`, `Encabezado`, `TablaSimple`.

Compuestos:

| | |
|---|---|
| `TablaDatos/` | Tabla **virtualizada** con filtro, orden y paginación **en el proceso principal** |
| `PanelValidaciones/` | Muestra las `VAL-*` con su severidad y si se cumplen |
| `AsistentePasos/` | El recorrido guiado |
| `Dialogo/` | Modal accesible |
| `ImportarPlantilla.tsx` | La importación, reutilizada por el asistente de entidad |

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

## Qué desapareció con ADR-027

La sección **Responsables** ya no existe, y con ella dos preguntas obligatorias del recorrido:
«responsable que abre el ejercicio» y «especialista que certifica».

En su lugar, los datos de la entidad piden **Nombre del contador** y **Tarjeta profesional**. Junto
al gerente que ya se pedía, son los dos firmantes del informe.

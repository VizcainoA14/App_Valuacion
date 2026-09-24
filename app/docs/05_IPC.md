# 05 · Comunicación entre procesos (IPC)

**53 canales** y **3 eventos**. Es la única frontera entre la interfaz y el sistema, así que está
cerrada por los dos lados: lista blanca en el preload y contrato tipado en el proceso principal.

## El puente: un archivo, dos funciones

`src/preload/index.ts` expone **exactamente** esto:

```ts
window.api = {
  invocar(canal, entrada): Promise<RespuestaIpc<…>>,
  suscribir(evento, callback): () => void,   // devuelve la baja
}
```

Ambas comprueban una **lista blanca** antes de dejar pasar nada. Un canal desconocido no llega
siquiera a `ipcRenderer.invoke`: se devuelve un rechazo tipado.

El preload solo importa `canales.ts` en tiempo de ejecución. Con el sandbox activo **no puede cargar
Zod**, y por eso la lista blanca es un array de literales sin dependencias — el contrato con sus
esquemas se verifica contra ella con `satisfies`.

Hay un E2E que lo comprueba desde dentro de la ventana: `window.api` tiene esas dos claves y
ninguna más.

## Las seis prohibiciones

Plan 2.3 §8. No son estilo: cada una cierra una vía de ataque o de fuga.

| | Prohibido | Por qué |
|---|---|---|
| **P-1** | Rutas de archivo desde el renderer | La interfaz no elige qué archivo se abre; pide un diálogo y el proceso principal decide |
| **P-2** | SQL o nombres de tabla por el IPC | Un canal recibe datos, no consultas |
| **P-3** | Código para evaluar | |
| **P-4** | Trazas de excepción hacia el renderer | Una traza revela rutas y estructura interna |
| **P-5** | `sendSync` | Congela la interfaz |
| **P-6** | Difusión a todas las ventanas | Los eventos van a quien los pidió |

## La cadena de middleware

`main/ipc/registroIpc.ts` es la **única** forma de crear un canal. Nadie llama a `ipcMain.handle`
directamente.

```
1. ¿El canal existe en el contrato?              → si no, error registrado
2. Validar la entrada con Zod                    → ErrorValidacion, con el campo culpable
3/4. (sin sesión ni permisos — ADR-016)
5. (sin ejercicio que cerrar — ADR-028; lo inmutable lo defienden los disparadores)
6. Ejecutar el caso de uso                       → si `muta`, dentro de una transacción
7. Bitácora en la MISMA transacción              → ctx.bitacora
8. Envolver la salida en RespuestaIpc
9. Traducir el error a DTO, sin traza            → P-4
```

Los pasos 6 y 7 juntos son el motivo de que la bitácora sea fiable: **el cambio y su registro
comparten transacción**, así que no puede existir uno sin el otro.

## El sobre de respuesta

Todo canal devuelve lo mismo:

```ts
type RespuestaIpc<T> =
  | { ok: true; datos: T }
  | { ok: false; error: { tipo; codigo; mensaje; campo? } };
```

El renderer nunca recibe una excepción: recibe un objeto. Los tipos de error son `VALIDACION`,
`REGLA_NEGOCIO` e `INFRAESTRUCTURA`, y el `codigo` es el que la interfaz usa para decidir qué
mostrar (`FECHA_CORTE_FUTURA`, `PROCESO_FINALIZADO`, `JUSTIFICACION_GENERICA`…).

## Los canales, por familia

| Familia | N.º | Qué cubre |
|---|:-:|---|
| `proceso:*` | 6 | listar, porId, crear, actualizar, finalizar, eliminar |
| `bien:*` | 5 | listar, porId, idsDelFiltro, cobertura, marcarObsolescenciaFuncional |
| `barrido:*` | 1 | listar |
| `corte:*` | 2 | actual (el del proceso, o `null`), porId |
| `calculo:*` | 4 | ejecutar (a la fecha del proceso; reemplaza el corte anterior), resumen, listar, exclusiones |
| `baja:*` | 4 | candidatos (del cálculo), listar, registrar, anular |
| `clase:*` | 4 | listar, crear, actualizar, precargarSugeridas |
| `sede:*` / `servicio:*` | 3 + 3 | catálogos |
| `plantilla:*` | 3 | catálogo y entrega de las 5 plantillas |
| `evento:*` | 3 | progreso, tareaFinalizada, alerta |
| `convencion:*` | 3 | codificación de bienes |
| `importacion:*` | 2 | previsualizar, confirmar |
| `informe:*` | 2 | previsualizar y generar, siempre del cálculo del proceso |
| `parametros:*` | 2 | obtener, actualizar |
| `abreviatura:*` | 2 | |
| `demo:*` | 2 | cargar y borrar el hospital de demostración |
| `app:*` | 2 | obtenerEstado, registrarErrorRenderer |
| `validaciones:evaluar` | 1 | la revisión de la configuración (7 validaciones) |
| `tarea:cancelar` | 1 | |

Nótese lo que **no** hay: ni responsables (ADR-027), ni ejercicio, ni propuestas de baja con sus transiciones (ADR-028).

## Tareas largas y eventos

`main/ipc/tareas.ts` gestiona las operaciones que no caben en una llamada: importaciones grandes,
cálculos, generación de PDF. Informan por `evento:progreso` y terminan con `evento:tareaFinalizada`.
`tarea:cancelar` las interrumpe.

Los eventos van **solo a quien los pidió** (P-6).

## Del lado de la interfaz

`renderer/ipc/consultas.ts` envuelve todo en TanStack Query:

- `useCanal(canal, entrada)` — una consulta.
- `useMutacion(canal, canalesQueInvalida)` — una mutación que **declara qué invalida**.

Declararlo es obligatorio y por una razón vivida: tras calcular, la bandeja de bajas seguía
mostrando datos viejos porque `calculo:calcular` no invalidaba `baja:candidatos`. Lo encontró un
E2E. Si una mutación cambia algo que otra pantalla lee, hay que decirlo aquí.

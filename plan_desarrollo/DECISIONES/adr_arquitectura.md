# ADR 015 – 025 · Decisiones de arquitectura y proceso

---

## ADR-015 — Captura de inventario en campo (`RF-02-01`)

> **DECIDIDO el 2026-09-01 por el propietario del proyecto.** Sustituye la propuesta preliminar de
> este ADR, que contemplaba escáner USB y un módulo LAN opcional. Ver
> [CT-05](../FASE_1_ANALISIS/1.4_contradicciones_teoria.md#ct-05--captura-móvil-offline).

**Contexto.** `RF-02-01` pedía "captura móvil de inventario con funcionamiento offline y
sincronización posterior"; `RF-02-02`, lectura de códigos con la cámara; `ANEXO_B` §9, "base local con
sincronización diferencial y resolución de conflictos por marca de tiempo". Eso describe una
**segunda aplicación, móvil**, con su propia base de datos y un mecanismo de fusión.

**Alternativas evaluadas.**

| Opción | Veredicto |
|---|---|
| App móvil nativa o PWA con sincronización | **Descartada.** Es un segundo proyecto: otra base, otro ciclo de despliegue, otro modelo de conflictos. Rompe la restricción de monolito |
| Servidor HTTP embebido + PWA en la LAN del hospital | **Descartada.** Contenida, pero añade superficie de ataque en la red del hospital y un modelo de conflictos real |
| Captura optimizada en portátil + escáner USB | **Descartada.** Cubría el caso con poco código, pero exige llevar el equipo al servicio y comprar el escáner |
| **Solo importación de `PL-03`** | **ELEGIDA** |

**Decisión.** La aplicación **no se usa en campo**. El levantamiento se realiza sobre la plantilla
`PL-03` —impresa o diligenciada en Excel— y se **importa** a la aplicación.

| Requisito | Estado |
|---|---|
| `RF-02-01` captura móvil offline | **NO IMPLEMENTADO** |
| `RF-02-02` lectura de códigos con la cámara | **NO IMPLEMENTADO** |
| `RF-02-04` generación e impresión de etiquetas | **Se mantiene.** La aplicación genera Code128/QR para imprimir y adherir; lo que no hay es lectura |
| `RF-02-06` validación de duplicados en tiempo real | Se aplica en la **importación** y en la edición manual de un bien |
| `RF-02-07` importación masiva de `PL-03` | **Sube a crítico.** Es la única vía de entrada de inventario |

**Consecuencia principal, y hay que asumirla con los ojos abiertos.** El importador deja de ser un
componente más y pasa a ser **la puerta única del sistema**: todo error de transcripción del conteo
en papel llega a la aplicación y debe depurarse allí. Por eso `T-C-07` (importador) y `T-C-08`
(probarlo contra los 20 `.xlsx` reales) suben de prioridad, y la previsualización editable con
errores resaltados deja de ser una comodidad para ser un requisito de viabilidad.

**Lo que la aplicación sí ofrece para mitigarlo:**

- Previsualización con errores resaltados **antes** de confirmar la importación (`ANEXO_A` §6.2).
- Reporte fila por fila: número de fila, columna, valor recibido, motivo del rechazo.
- Detección de duplicados de código y placa dentro del lote y contra lo ya cargado.
- Edición manual de cualquier bien después de importar, para corregir sin repetir el archivo.
- Plantillas descargables **ya parametrizadas** con los catálogos del hospital (listas desplegables
  con las sedes, servicios y clases reales), que reducen los errores en origen.

**Se descarta expresamente** la "resolución de conflictos por marca de tiempo" de `ANEXO_B` §9:
cuando el dato en disputa es el costo de un activo, decidir por la hora de edición es inaceptable.

**Efecto en el plan.** Se elimina la tarea `T-C-04` y la dependencia `@zxing/browser`. La pantalla
"Captura en campo (móvil)" del paso 02 se sustituye por "Importador de inventario".

**Cuándo reconsiderar.** Si el volumen de un hospital concreto hace inviable el conteo en papel, se
evalúa la captura optimizada en portátil con escáner USB, que fue la segunda opción y sigue siendo la
de mejor relación coste/beneficio.

---

## ADR-016 — Modelo de usuario y despliegue

> **DECIDIDO el 2026-09-01 por el propietario del proyecto.** Sustituye la propuesta preliminar, que
> contemplaba perfiles locales con autenticación. Ver
> [CT-08](../FASE_1_ANALISIS/1.4_contradicciones_teoria.md#ct-08--modelo-multiusuario).

**Contexto.** `ANEXO_B` §7.2 definía 10 roles con permisos de acceso y §7.1 registraba la dirección
IP de origen. Eso describe un sistema cliente-servidor multiusuario, incompatible con una aplicación
de escritorio local.

**Decisión.** La aplicación es **de escritorio, monousuario y sin inicio de sesión**. Se instala a una
persona en el hospital y esa persona la opera de principio a fin.

**Pero los perfiles no desaparecen: cambian de naturaleza.** Los documentos que la aplicación genera
exigen decir quién hizo qué —"certificación firmada por el especialista", "avalúo del perito R.A.A",
"acta firmada por el contador"— y el perito de inmuebles es **externo a la entidad**. Esa información
es **dato de atribución**, no permiso de acceso.

```
Responsable(id, entidad_id, nombre_completo, documento_identidad,
            perfil, cargo, tarjeta_profesional, registro_raa,
            es_externo, activo)
```

Se configura una vez en la parametrización del hospital y se selecciona al valuar, certificar o
firmar. Sale impreso en el documento y queda en la bitácora.

| Antes (`ANEXO_B` §7.2) | Después |
|---|---|
| `Usuario` + `Rol` con matriz de permisos | `Responsable`: catálogo de personas |
| Contraseñas, sesión, bloqueo por intentos | **No existen** |
| Middleware de autorización en el IPC | **No existe.** El contrato conserva la validación de entrada (Zod), que sí es necesaria |
| `Bitacora.usuario_id` | `Bitacora.responsable_id`, opcional |
| `Bitacora.ip` | `Bitacora.origen` = equipo + usuario del sistema operativo |
| "Bandejas de trabajo por especialista" (`RF-07-05`) | Filtros por perfil sobre la misma base |

**Lo que NO cambia, y conviene subrayarlo.** La bitácora sigue siendo obligatoria y completa. No
tener usuarios no significa no tener trazabilidad: la Resolución 193 de 2016 exige poder reconstruir
qué cambió, cuándo y con qué justificación, y `ANEXO_B` §7.1 mantiene los ocho campos sensibles que
exigen justificación. Eso se conserva íntegro.

**Multi-hospital.** El modelo de datos ya cuelga todo de `Entidad`, así que una misma instalación
puede albergar varios hospitales sin coste adicional. El uso previsto es una instalación por
hospital, pero soportar varios hace valioso `RF-01-09` (clonar la parametrización de una entidad a
otra), que acelera cada contrato nuevo.

**Restricción operativa que se mantiene.** **Prohibido** colocar el archivo SQLite en una unidad de
red compartida: SQLite se corrompe con el bloqueo de archivos por red, y aquí se custodia evidencia
contable. La aplicación lo verifica al arrancar y **bloquea**, no advierte (`T-B-06`, `RG-10`). La
necesidad legítima que hay detrás —"que esté en el servidor"— se atiende con `respaldos.rutaExterna`:
base local, respaldos copiados a la red.

**Efecto en el plan.** `T-B-07` pasa de "usuarios, roles y permisos" a "catálogo de responsables", se
simplifica sustancialmente y queda desbloqueada. Se eliminan `argon2`/`scrypt` y el middleware de
autorización. ADR-025 se simplifica en consecuencia.

---

## ADR-017 — Inmutabilidad del ejercicio cerrado

**Contexto.** `INT-09`, `RN-11-05` y `RN-10-07`: un ejercicio cerrado es evidencia contractual y no
puede alterarse. Es el requisito de integridad más fuerte del sistema.

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Solo validación en la capa de aplicación | **Insuficiente.** Un script, una migración mal escrita o una herramienta externa lo eluden sin dejar rastro |
| Copiar el ejercicio cerrado a un archivo aparte de solo lectura | Complica las consultas históricas y duplica los datos |
| **Triggers SQLite + hash de contenido** | **Elegido** |

**Decisión: dos capas.**

**1. Triggers.** Cada tabla con `ejercicio_id` lleva tres triggers (`INSERT`, `UPDATE`, `DELETE`) que
consultan el estado del ejercicio y ejecutan `RAISE(ABORT, 'INT-09: ejercicio cerrado')`. Se generan
por script (`scripts/generar-triggers.ts`) a partir de la lista de tablas: añadir una tabla y olvidar
su trigger deja de ser posible.

**2. Sello de integridad.** Al cerrar se calcula un SHA-256 sobre una serialización canónica y
ordenada del contenido del ejercicio, y se guarda con fecha, usuario y versión de la aplicación.
Reverificable en cualquier momento.

**Justificación.** El trigger impide la alteración por las vías normales, incluida la de una
herramienta externa. El hash no impide nada, pero **hace detectable** cualquier alteración — que es
lo que una auditoría necesita demostrar. La prueba de aceptación es explícita: tras cerrar, un
`UPDATE` por SQL directo debe fallar.

**Límite honesto.** Quien tenga acceso administrativo puede borrar los triggers y reescribir la base.
El hash lo delata; el cifrado opcional (ADR-025) y el cifrado de disco del sistema operativo elevan
la barrera. Ninguna aplicación local puede ir más allá.

---

## ADR-018 — Bitácora de auditoría

**Contexto.** `ANEXO_B` §7.1 exige registrar toda acción con usuario, fecha, valor anterior, valor
nuevo, y **justificación obligatoria en 8 campos sensibles**.

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Triggers SQLite | Capturan todo cambio, pero **no conocen al usuario ni la justificación**: son contexto de aplicación |
| Llamadas explícitas en cada caso de uso | Se olvidan. Con 40 entidades, la omisión es cuestión de tiempo |
| **Decorador en la capa de repositorio + triggers como red de seguridad** | **Elegido** |

**Decisión.** El decorador de repositorio captura usuario, justificación, valor anterior y nuevo, y
escribe **dentro de la misma transacción** que el cambio: si el cambio persiste, su rastro también.
Un trigger de respaldo registra las escrituras que no pasaron por el repositorio, marcándolas como
`origen: DIRECTO` — señal de que algo se saltó la capa de aplicación.

**Justificación obligatoria.** Los 8 campos de `ANEXO_B` §7.1 (`costo_adquisicion`,
`fecha_adquisicion`, `clase_activo_id`, `valor_avaluo_final`, `vida_util_tecnica_override`,
`deterioro`, `causal_baja`, `fecha_corte`) se declaran como datos y se atienden en un único
componente `<CampoSensible>`, no campo por campo.

**Distinción crítica.** La bitácora **no es** el registro técnico de eventos. El log es técnico y se
borra tras 14 días; la bitácora es evidencia de auditoría, vive en la base y **nunca** se borra.
Confundirlas lleva a purgar evidencia contable creyendo que se limpian temporales.

---

## ADR-019 — Arquitectura interna: monolito modular hexagonal

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Monolito por capas técnicas (controladores/servicios/repositorios) | **Descartado.** Con 11 dominios, un requisito queda repartido en 4 carpetas |
| Monolito de una pieza | **Descartado.** 94 `RF` sin fronteras produce una bola de barro en meses |
| Microservicios | **Descartado.** Rompe `R-02` y no hay ningún problema que lo justifique |
| **Monolito modular hexagonal** | **Elegido** |

**Decisión.** Módulos por **dominio de negocio**, espejando la estructura de `/Teoria` (un módulo por
paso), con un núcleo de dominio puro y fronteras verificadas por herramienta (reglas D-1…D-6, con
`dependency-cruiser`).

**La regla que sostiene todo:** `MOD-06` (motor de cálculo) importa **solo** de `MOD-00`. Nada de
`fs`, `electron`, `sqlite`, `react` ni `Date`. Esto hace que los 15 casos de `ANEXO_C` §11 se
ejecuten en milisegundos, sin base de datos y sin simulacros, en cada commit — que es la única forma
de mantener sano el componente cuyo error tiene consecuencias legales.

**Consecuencias.** Más carpetas y más `index.ts`. Un caso de uso que necesita datos de otro módulo
debe pasar por su API pública. Es fricción deliberada: hace visible cada acoplamiento nuevo.

---

## ADR-020 — Cálculo pesado en `utilityProcess`

**Contexto.** `RNF-02` exige calcular 20.000 bienes "en segundos, no minutos", sin congelar la
interfaz. `better-sqlite3` es síncrono: si el cálculo corre en el hilo del main, bloquea también el
IPC y la aplicación parece colgada (`RG-07`).

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Todo en el main, en lotes con `setImmediate` | Simple; puede bastar. Hay que medirlo |
| `worker_threads` | Compartir un módulo nativo entre hilos del mismo proceso es delicado |
| **`utilityProcess`** | Proceso aparte, memoria propia, conexión SQLite propia, terminable de golpe al cancelar |

**Decisión: medir primero (`T-D-06`), decidir después.**

| Medición con 20.000 bienes | Decisión |
|---|---|
| < 2 s | Se queda en el main. **No se implementa `utilityProcess`.** Se documenta |
| 2–15 s | Lotes con progreso; se evalúa `utilityProcess` |
| > 15 s | Incumple `RNF-02`: `utilityProcess` obligatorio + revisión de índices y consultas |

**Justificación.** Añadir un proceso separado tiene coste real: serialización, sincronización, un
modo de fallo nuevo. Pagarlo antes de saber si hace falta es complejidad sin beneficio. La medición
y la decisión se registran en bitácora, para que nadie tenga que rehacer el análisis.

---

## ADR-021 — Migraciones y respaldos

**Decisión.**

| Aspecto | Regla |
|---|---|
| Migraciones | Numeradas, **solo hacia adelante**, nunca editadas después de publicarse |
| Versión | `PRAGMA user_version` |
| Antes de migrar | **Respaldo automático verificado**: se copia, se abre la copia y se ejecuta `PRAGMA integrity_check` |
| Base más nueva que la app | La aplicación **se niega a abrir** y lo explica. Nunca "intentar y ver" |
| Respaldos | Con la API `db.backup()` de SQLite, nunca copiando el archivo con conexiones abiertas |
| Al cerrar un ejercicio | Respaldo **permanente**: es evidencia contractual |
| CI | Ejecuta la cadena completa de migraciones sobre una base sembrada de la versión anterior |

**Justificación.** Sin migraciones hacia atrás porque revertir un esquema con datos reales es una
fuente de pérdida silenciosa; si una migración sale mal, se restaura el respaldo, que es una
operación conocida y verificable. La verificación del respaldo *antes* de migrar es lo que convierte
esa promesa en algo real: un respaldo que no se ha probado no es un respaldo.

---

## ADR-022 — Compatibilidad de navegadores

**Contexto.** Restricción `R-05`: maximizar la compatibilidad con navegadores de hasta 4 años. En
Electron, el renderer corre sobre un Chromium conocido y moderno, así que compilar hacia atrás solo
produce paquetes más grandes… salvo por el código que algún día correría en un navegador real.

**Decisión: dos objetivos de compilación.**

| Perfil | Objetivo | Aplica a |
|---|---|---|
| `electron` (por defecto) | El Chromium de la versión de Electron fijada | Renderer de escritorio |
| `production` / `web` | Chrome/Edge 105, Firefox 104, Safari 15.6 (sep 2022) | Código compartido y cualquier despliegue en navegador |

**Y una asimetría deliberada:** el **CSS se compila siempre al objetivo conservador**, aunque el JS
no. Motivo: una regla CSS no soportada no lanza error, simplemente no se aplica, y el diseño se
descompone sin que nadie se entere. El coste de mantener el CSS conservador es despreciable.

**Consecuencia práctica más importante.** El piso excluye `:has()` (Firefox 121), anidamiento CSS,
consultas de contenedor, `color-mix()` y `@property`. Estos dos últimos son la base de **Tailwind
v4**, que por tanto queda descartado ([ADR-009](adr_stack.md#adr-009--sistema-de-interfaz)).

**Verificación.** `eslint-plugin-compat` como **error**, `lib` de TypeScript restringida a ES2021,
`stylelint` con la lista de características no soportadas, y auditoría de cada dependencia del
renderer (Fase 3.2 §5).

**Revisión.** El piso es móvil: en septiembre de 2027, "4 años" será Chrome 118. Se recalcula al
cierre de cada hito y se registra en bitácora.

---

## ADR-023 — Estrategia de pruebas

**Decisión: Vitest (unitarias e integración) + Testing Library (componentes) + Playwright con la API
`_electron` (E2E) + fast-check (propiedades).**

**Alternativas descartadas:** Jest (fricción con ESM y con la configuración de Vite; Vitest reutiliza
la misma), Spectron (discontinuado), Cypress (soporte de Electron inferior al de Playwright).

**El principio, más importante que las herramientas: cobertura proporcional a la consecuencia del
error.**

| Componente | Cobertura |
|---|:-:|
| Motor de cálculo | **100 % de ramas** |
| Reglas de integridad `INT-*` | **100 %**, probadas por SQL directo |
| Casos de uso | ≥ 80 % |
| Componentes de interfaz | ≥ 60 % |

Una cobertura del 100% en el motor y del 60% en los diálogos es la asignación correcta.

**Dos reglas de disciplina:**
1. Los tests del motor se escriben **antes** que el motor (`T-D-01` precede a `T-D-03` y `T-D-05`).
   Si no, los valores esperados se copian de lo que el código produce y el motor se valida contra sí
   mismo (`RG-01`).
2. **Ningún valor esperado del motor se modifica sin una entrada en bitácora que lo justifique.**

**E2E sobre el paquete construido**, no sobre el servidor de desarrollo: es la única forma de probar
lo que el usuario recibirá.

---

## ADR-024 — Empaquetado y actualizaciones

**Decisión.**

- **Instalador:** NSIS para Windows (plataforma principal), con instalación por usuario por defecto
  y elevación opcional. AppImage/deb para Linux; DMG solo si se solicita.
- **`deleteAppDataOnUninstall: false`** — el desinstalador **nunca** borra `userData`, que contiene
  la base con los ejercicios cerrados.
- **Sin actualización automática en v1.** `electron-updater` queda integrado y desactivado.

**Justificación de no auto-actualizar.**
1. La red de un hospital suele bloquear las descargas salientes; un actualizador que falla en
   silencio es peor que no tenerlo.
2. Una actualización que se instala sola durante un cálculo masivo o un cierre de ejercicio es un
   riesgo desproporcionado frente al beneficio.
3. La instalación la controla el área de sistemas, con su procedimiento.

**Lo que sí se hace:** versión de aplicación y de esquema visibles en la interfaz y en el pie de los
informes; `versiones.json` publicado junto al instalador; hash SHA-256 publicado.

**Versionado semántico con un matiz propio:** un cambio en el motor de cálculo que altere resultados
es **siempre** una versión mayor. Los ejercicios ya cerrados siguen siendo válidos —están congelados
y sellados—, pero un recálculo daría otra cifra, y eso no puede pasar desapercibido en un parche.

**Firma de código: decisión pendiente del cliente** (`T-H-02`, `RG-18`). Sin firma, SmartScreen
advierte y algunos antivirus bloquean. Si se opta por no firmar, debe comunicarse al área de
sistemas **antes** de la entrega, no el día de la instalación.

---

## ADR-025 — Protección de datos

> **Simplificado el 2026-09-01** tras la decisión de ADR-016: al no haber inicio de sesión, no hay
> contraseñas que proteger y el capítulo de credenciales desaparece.

**Contexto.** La base contiene información patrimonial de una entidad pública y datos personales de
funcionarios (responsables de custodia, especialistas, miembros del Comité). El riesgo dominante en
este despliegue **no es el robo de datos: es la pérdida del ejercicio**, que es evidencia
contractual irrecuperable.

**Alternativas.**

| Opción | Veredicto |
|---|---|
| Cifrado de la base con SQLCipher (`better-sqlite3-multiple-ciphers`) | Protege el archivo en reposo, pero introduce una clave que alguien debe custodiar: **perderla equivale a perder el ejercicio**. Y sustituye el módulo nativo ya validado |
| **Sin cifrado de aplicación + cifrado de disco del sistema operativo** | **Elegido** |

**Decisión.**

1. **Base sin cifrar.** El manual de instalación **recomienda BitLocker** (o el cifrado de disco
   equivalente), que es la medida que el área de sistemas del hospital ya sabe administrar y que
   protege ante el escenario realista: equipo robado o extraviado.
2. **`safeStorage` de Electron** para cualquier secreto que llegue a existir (cifrado por el sistema
   operativo, atado al usuario). Hoy no hay ninguno.
3. **Los datos no salen del equipo** salvo en los entregables que el contrato exige (`RNF-08`).
4. El archivo de exportación `.valz` **contiene datos personales**: la aplicación advierte al
   exportar que debe tratarse como documento confidencial.
5. Los conjuntos de prueba con datos reales se **anonimizan** antes de versionarse.
6. **Cifrado de base disponible como opción**, no activada por defecto, con advertencia explícita de
   que perder la clave equivale a perder los datos.

**Justificación.** Cifrar por defecto cambiaría un riesgo remoto (que alguien copie el archivo) por
otro más probable (que se extravíe la clave). El cifrado de disco del sistema operativo cubre el
escenario realista sin introducir una clave nueva.

**Lo que sí protege la integridad de los datos** —que es la preocupación real de una auditoría— no
es el cifrado, sino ADR-017: los triggers de `INT-09` rechazan la escritura sobre un ejercicio
cerrado incluso desde SQL directo, y el hash SHA-256 hace **detectable** cualquier alteración
posterior.

**Sobre no tener inicio de sesión.** Quien tenga acceso al equipo tiene acceso a la aplicación. Es
una consecuencia aceptada de ADR-016 y es coherente con el despliegue: un equipo asignado a una
persona, dentro de la entidad, con el control de acceso del propio sistema operativo. La aplicación
no añade una capa de seguridad que el sistema operativo ya provee mejor.

**Cuándo reconsiderar.** Si el cliente exige cifrado a nivel de aplicación por política interna, se
activa la opción 6 y se documenta el procedimiento de custodia de la clave — que es el verdadero
trabajo, no el cambio técnico.
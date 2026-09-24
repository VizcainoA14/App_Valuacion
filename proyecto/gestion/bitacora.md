# Bitácora del proyecto

Registro cronológico y breve de lo que ocurre en cada sesión de trabajo. **Lo más reciente arriba.**

## Cómo escribir una entrada

Una entrada por sesión, con este formato:

```markdown
## AAAA-MM-DD · <quién> · <título en una línea>

**Tareas:** T-X-nn (estado) · T-X-mm (estado)

- Qué se hizo.
- Qué decisión se tomó y por qué (si aplica).
- Qué quedó pendiente.

**Siguiente:** qué toca ahora.
```

Reglas:

1. **Breve.** Tres a ocho viñetas. Lo extenso va en el documento que corresponda, no aquí.
2. **Toda decisión técnica no trivial se registra**, aunque sea "medimos X y decidimos no hacer Y".
   Una decisión sin registrar se vuelve a discutir dentro de tres meses.
3. **Obligatorio registrar:** cambios de versión de dependencias, resultados de mediciones de
   rendimiento, resolución de una contradicción `CT-*`, y —muy en particular— **cualquier
   modificación de un valor esperado en los tests del motor de cálculo**, con su justificación
   (mitigación de `RG-01`).
4. Nunca se borra ni se reescribe una entrada pasada. Si algo estaba mal, se corrige en una entrada
   nueva.

---

## 2026-09-24 · Claude · ADR-029: el proceso de valuación es lo principal, y cada uno es independiente

**Tareas:** ADR-029 (nuevo) · RF-01-09 clonar parametrización ⏭️

- **Pedido del propietario:** quitar la entidad; lo primero que se ve es iniciar o continuar un
  proceso, y los procesos son independientes. Decidió: hospital dentro de cada proceso, botón
  «Finalizar», una fecha de corte por proceso (recalcular reemplaza), inventario de cero.
- **Modelo:** `entidad` → `proceso` (nombre, fecha de corte, estado, datos del hospital); un corte por
  proceso (`ux_corte_proceso`); cambiar la fecha descarta el cálculo; `proceso:finalizar` exige
  cálculo. Canales `corte:listar`/`corte:eliminar` y la clonación, retirados.
- **Solo lectura por la base:** el generador emite 50 disparadores de finalización y **exige** que
  cada tabla declare cómo llega a su proceso; una tabla sin ruta rompe `db:triggers`. 68 en total.
- **Corrección propia a mitad del trabajo:** se había retirado `INT-03` para poder borrar procesos
  con inventario. Al contrastarlo con `ANEXO_B` («un bien nunca se elimina físicamente», RN-09-09)
  se restauró: un proceso solo se elimina en curso y **sin inventario** (`PROCESO_CON_INVENTARIO`).
- **`RG-01`: ningún valor esperado cambió.** Las pruebas de `calculo.test.ts` crean el proceso con la
  fecha 2025-06-30 y reproducen las mismas cifras (1.135.672.423 centavos, 474.785.600). Lo que se
  reescribió fueron los caminos: «varios cortes» pasó a «recalcular reemplaza», y se añadieron casos
  de finalización, independencia entre procesos y fecha futura.
- **Interfaz:** inicio = procesos (en curso / finalizados); `/proceso/:id` con Resumen y Finalizar;
  banda de solo lectura; Calcular y Recalcular en una pantalla. Sin «proceso activo» recordado.
- **Verificado:** `verificar:todo` (369), rendimiento (5), 16 E2E sobre `out/` y sobre el paquete, con capturas revisadas.
  Las capturas destaparon dos detalles corregidos: el nombre por defecto mostraba la fecha ISO, y un
  proceso finalizado sugería «recalcule».

**Siguiente:** commit de ADR-028 + ADR-029; después `T-C-03` (ficha editable del bien).

---

## 2026-09-24 · Claude · ADR-028: inventario vivo, cálculo por cortes y sin trámites externos

**Tareas:** ADR-028 (nuevo) · `T-F-02` flujo del Comité ⏭️ · extensiones de ADR-026 ⏭️

- **Pedido del propietario:** que el responsable del hospital haga el barrido y la app calcule, sin
  que nada externo la determine. Decidió: ningún hospital tiene la app, borrar extensiones, informe
  al final sin firmas. Registrado en ADR-028 (`adr_producto.md`).
- **Modelo nuevo:** el bien es de la entidad; cada `PL-03` es un barrido que agrega, actualiza y marca
  NO_ENCONTRADO (solo en los servicios que recorre); cada cálculo es un corte inmutable con sus
  parámetros, resultados y exclusiones; las bajas se registran y se anulan, no se tramitan.
- **Retirado:** ejercicio, `responsable`, contador, confirmación por acta del método (`VAL-01-07`),
  propuestas de baja, deterioro, 26 tablas de extensiones, 51 validaciones, 23 plantillas del
  instalador. Migraciones regeneradas desde cero: 18 tablas, 16 disparadores.
- **Motor intacto** (`compartido/motor` sin cambios) y **ningún valor esperado modificado** (`RG-01`):
  las cifras de `ANEXO_C` §3.3 se reproducen igual a través de cortes.
- **Tests reescritos donde cambió el camino, no los valores:** `calculo`, `bajas`, `integridad`,
  `importarInventario` (casos nuevos de barrido), `validaciones`, E2E. `paso01.spec` pasa a
  `configuracion.spec`.
- **Defecto encontrado por la medición:** un barrido de 10.000 bienes tardaba 17 s en actualizar; el
  trigger FTS5 se disparaba por nombrar la columna. Ahora 0,28 s.
- **Intermitente, anterior y ajeno a este cambio:** la propiedad fast-check de `fechas.test.ts`
  (*mes_completo nunca supera a dias_exactos…*) falló 1 vez en ~20 corridas; no se reprodujo en 17
  más. No se tocó el motor. Queda anotado para investigarlo con la semilla del fallo.
- **Trazabilidad:** 214 requisitos `FUERA_DE_ALCANCE (ADR-028)`; `/especificacion/teoria` no se
  modificó.

- **Instalador y recorrido real:** `npm run pack` y los E2E sobre el paquete, en verde. E2E nuevo
  `datosDePrueba.spec.ts` recorre el hospital ficticio de PL-01 al PDF; revisado con capturas.
  Corrigió dos defectos de presentación: el aviso de importación desbordaba la cabecera de la
  sección, y el informe mostraba las horas en UTC en vez de la hora del equipo.
- **Tamaño:** `win-unpacked` pesa 365 MB (Electron incluido); el comentario de `electron-builder.yml`
  habla de un presupuesto de 350 MB. Las plantillas empaquetadas pasaron de 28 archivos a 5 (108 kB); no se midió el tamaño anterior del paquete.

**Siguiente:** commit de ADR-028; después `T-C-03` (ficha editable del bien).

---

## 2026-09-24 · Claude · Cuatro skills de terceros añadidas al proyecto

**Tareas:** mantenimiento del repositorio (no abre tarea del backlog)

- Con `find-skills` se buscó en skills.sh según las dependencias reales de `app/package.json`.
- Se añadieron a `.claude/skills/`, como carpetas reales para que viajen con el repositorio:
  `vercel-react-best-practices` y `web-design-guidelines` (Vercel), `vitest` (antfu) y
  `playwright-best-practices` (Currents). Enlazadas en la tabla de skills de `CLAUDE.md`.
- `web-design-guidelines` descarga sus reglas de GitHub en cada uso: su contenido puede cambiar.
- Descartadas: ninguna skill de SQLite/better-sqlite3 ni de Electron superaba el umbral de calidad.
- No toca código de la app; no se corrió `verificar:todo`.

**Siguiente:** sin cambios respecto de `estado_actual.md` §4.

## 2026-09-24 · Claude · Reorganización de carpetas del repositorio

**Tareas:** mantenimiento del repositorio (no abre tarea del backlog)

- **De 7 carpetas en la raíz a 4**, en minúsculas y agrupadas por propósito, con `git mv` para
  conservar el historial: `Teoria` → `especificacion/teoria`, `Normatividad` →
  `especificacion/normatividad`, `Plantillas_Valuacion_Activos` → `especificacion/plantillas`,
  `plan_desarrollo` → `proyecto/plan`, `gestion_proyecto` → `proyecto/gestion`, `Datos_de_prueba` →
  `datos_de_prueba`. `app/` no se movió.
- **Decisión del propietario:** mover también `/Teoria`. Su contenido no cambió; solo las rutas de
  `CORRECCIONES.md`, con una nota fechada que lo explica.
- **Decisión del propietario:** las rutas de las entradas pasadas de esta bitácora se actualizaron.
  Es la única excepción a la regla 4, y solo cambian las rutas: el texto de las entradas es el mismo.
- Rutas en el código: `electron-builder.yml` (`extraResources`), `rutaPlantillas`, `sembrar.ts`,
  `generar-datos-prueba.ts`, `generar-instructivo.ts`, `trazabilidad.ts` y los tests que leen las
  plantillas y los datos de prueba. **El instalador no cambia**: empaquetadas, las plantillas siguen
  en `resources/plantillas`.
- Se actualizaron las rutas de 83 archivos, entre ellos el protocolo de sesión (`config_sesion.json`,
  la skill `gestion-memoria`, `CLAUDE.md`). Cada enlace relativo se recalculó según la nueva
  ubicación de origen y destino: **0 enlaces rotos antes y 0 después**.
- `verificar:todo` en verde (379 tests, 218 módulos, trazabilidad 380/380). **No se corrieron** los
  E2E ni `pack`.

**Siguiente:** sin cambios, ver `estado_actual.md` §4. Conviene correr los E2E y `pack` para
confirmar que el instalador sigue encontrando `especificacion/plantillas`.

---

## 2026-09-04 · Claude · Documentación técnica de `/app`

**Tareas:** documentación (no abre tarea del backlog)

**Qué se hizo.** Diez documentos en `app/docs/`, con índice: panorama, arquitectura, arranque y
datos, base de datos, IPC, motor de cálculo, importación, interfaz, pruebas y calidad, construir y
distribuir. Enlazados desde el mapa de `CLAUDE.md`.

**Escritos leyendo el código, no de memoria.** Todas las cifras se contaron sobre el repositorio:
21.967 líneas de TS/TSX, 44 tablas, 119 disparadores en la migración `0002`, 55 canales IPC, 58
validaciones declaradas, 218 módulos, 379 tests unitarios en 35 archivos, 15 E2E en 12 archivos y 5
de rendimiento en 3.

**Tres afirmaciones propias resultaron falsas y se corrigieron** antes de publicarlas:

1. `npm run sembrar` **no existe** como script; el archivo `scripts/sembrar.ts` sí, y se invoca con
   `npx tsx`.
2. Los E2E son **15 pruebas en 12 archivos**, no 15 archivos: `arranque` tiene 3 y
   `arranque-datos` 2.
3. El rendimiento son **5 pruebas en 3 archivos**.

En cambio se confirmó lo que sí era cierto: `calculo.test.ts` da **42 casos** (34 bloques `it` más
un `it.each` que expande el resto).

**Criterio al escribir.** Se documentó no solo *qué* hace cada parte sino *por qué* está así, con las
razones vividas: por qué el motor es puro, por qué el dinero es entero de centavos, por qué las
fechas no usan `Date`, por qué la integridad son disparadores y no validaciones de formulario, por
qué existe el índice laxo del importador y dónde está su frontera, y por qué la limpieza de
`dev:aislado` es al abrir y no al cerrar. También lo que la CI enseñó: los tres defectos que fueron
el mismo error de fondo.

Se dejaron escritas las trampas que muerden a quien retome esto: que `npm run dev` abre la base real
de la app instalada, que `out/` no basta para probar, y que SQLite no deja eliminar una columna que
participa en una clave foránea.

**Siguiente:** mantenerlos al día cuando el código cambie. Un documento que miente es peor que no
tenerlo.

---

## 2026-09-04 · Claude · Verificación normativa y retirada del catálogo de responsables (ADR-027)

**Tareas:** investigación normativa (nueva carpeta `/especificacion/normatividad`) · ADR-027

### 1. Verificación contra fuentes oficiales del Estado

Se creó **`/especificacion/normatividad`** con cinco fichas y un índice, contrastando el proceso que implementa la
aplicación con la normativa colombiana consultada en línea. Cada afirmación va marcada como
✅ verificada, ⚠️ indirecta o ❓ por confirmar, y el README enumera lo que **no** se pudo verificar.

**Veredicto: el proceso está bien planteado.** No apareció ninguna contradicción entre el motor de
cálculo y la norma. Coinciden la línea recta, el tope en la base depreciable, el valor residual que
no se deprecia, la revisión anual de la vida útil con concepto técnico, el inventario físico
periódico (Res. 193/2016 num. 9) y la depuración contable **permanente** (num. 3.2.15).

**Lo que más tranquiliza:** devolver `NO_CALCULABLE` en vez de un cero cuando falta el valor
recuperable no era solo prudencia de ingeniería. La Guía de Aplicación 003 de la CGN dice que *«el
deterioro se reconoce solo cuando existen indicios»*; un cero habría sido afirmar que no hay
deterioro, que es una afirmación contable con consecuencias.

**Cuatro puntos a precisar**, ninguno un error de cálculo:

1. **El marco contable no es automático.** Una E.S.E aplica la Resolución 414 de 2014 (empresas) o
   la 533 de 2015 (entidades de gobierno) según la clasifique el **Comité Interinstitucional de la
   Comisión de Estadísticas de Finanzas Públicas**. Cambia el Catálogo General de Cuentas.
   `ANEXO_D` acierta al poner la 414 por defecto, pero falta la advertencia de que se confirme.
2. Las vidas útiles precargadas son **sugerencias**; la interfaz no lo dice.
3. El art. 355 de la Ley 1819 de 2016 está redactado para **entidades territoriales**; que aplique
   a una E.S.E lo debe decidir su revisoría, no el programa.
4. Las subcuentas (1605…1680) **no se verificaron** contra el catálogo vigente.

También se confirmó que la cadena del saneamiento es Ley 1739/2014 → 1753/2015 → **1819/2016 art.
355** → Res. 107/2017, y **no** la Ley 1955 de 2019, que se cita por error con frecuencia.
`ANEXO_D` §2.2 ya la tenía bien.

### 2. ADR-027 — fuera el catálogo de responsables

El propietario pidió que no hubiera «responsables ni nada por el estilo». La investigación dice que
**se puede**: el Comité Técnico de Sostenibilidad Contable es una *herramienta sugerida* en la
Res. 193/2016, no una obligación, y ningún texto exige un catálogo de personas con perfiles. Lo que
la norma sí asigna (num. 1.1) es responsabilidad al **representante legal** y al **contador**.

Así que se retiró el catálogo y se conservó lo único que la norma respalda: **el informe lo firman
el Gerente y el Contador**, ahora dos campos de la entidad.

- Fuera: 4 canales IPC, el módulo `plataforma`, el DTO, la pantalla y las preguntas obligatorias de
  «responsable que abre el ejercicio» y «especialista que certifica».
- La entidad gana `nombre_contador` y `tarjeta_profesional_contador` (migración `0003`).
- El bloque de firmas pasa de tres columnas —una en blanco— a **dos con nombre propio**.

**La tabla `responsable` sobrevive, y queda escrito por qué.** Catorce columnas del esquema apuntan
a ella; se comprobó que **SQLite no permite eliminar una columna que participa en una clave
foránea**, así que retirarla obligaría a reconstruir catorce tablas con sus disparadores sobre bases
con datos reales, a cambio de algo que el usuario no ve. Un repositorio interno (`firmanteRepo`)
mantiene dos filas por entidad derivadas de sus propios datos. Es un compromiso admitido: hay un
concepto en la base que ya no existe en el producto.

**Decisión del propietario:** consultado sobre la etapa de bajas, eligió **conservarla como estaba**.
Por tanto **las 6 etapas de ADR-026 siguen en pie**; lo que se simplificó es el contenido de cada
una, no su número. La fusión de «Formatos» dentro de «Inventario» **no se hizo** y queda pendiente
si el propietario la quiere.

`ANEXO_B` §7.2 y `TR-12` quedan NO IMPLEMENTADOS, como `RF-02-01`/`RF-02-02` por ADR-015.
**`/especificacion/teoria` no se tocó.**

**Verificación.** `verificar:todo` en verde: **379 tests** (los 8 del catálogo retirado se fueron con
él), typecheck de los cinco proyectos, lint y 218 módulos sin violaciones de frontera. Un único test
falló al principio y era exactamente el cambio esperado: el especialista de una propuesta de baja
pasó a ser el Gerente.

**Cierre.** Los **15 E2E pasan dos veces**: sobre `out/` y sobre el paquete (`PROBAR_PAQUETE=1`),
incluido el `paso01` reescrito sin el catálogo. Se comprobó además que la migración `0003` corre
sobre una base **preexistente** —15 → 17 columnas en `entidad`, 122 disparadores intactos—, que es
el caso real de un hospital que ya tiene la aplicación instalada. Instalador reconstruido.

**Siguiente:** sin cambios en el plan. Pendiente si el propietario lo quiere: fundir la etapa
«Formatos» dentro de «Inventario» para bajar de 6 etapas a 5.

---

## 2026-09-04 · Claude · `npm run dev` compartía base con la app instalada: `dev:aislado`

**Tareas:** herramienta de desarrollo (no abre tarea del backlog)

**La pregunta que lo destapó:** «si ejecuto dev, ¿este guarda información?». Sí — y en el mismo
directorio que la app instalada.

**Comprobado, no supuesto.** Se ejecutó Electron con un `package.json` mínimo con el mismo
`productName`:

```
getName()  = Valuación de Activos
userData   = C:\Users\…\AppData\Roaming\Valuación de Activos
```

Electron deriva `userData` de `productName`, y ese campo vale `Valuación de Activos` tanto en
`app/package.json` como en `electron-builder.yml`. Desarrollo e instalador abren **la misma**
`valuacion.db`.

**Por qué importa más de lo que parece.** El arranque aplica las migraciones pendientes. Trabajar en
una rama con migraciones nuevas actualiza el esquema de la base real del hospital, y después el
instalador —más viejo— puede no poder abrirla. Hay respaldo previo y respaldo diario, así que se
recupera; pero es un susto evitable. (El bloqueo de instancia única también se comparte: con la app
instalada abierta, `npm run dev` ni arranca, lo que parece que dev está roto.)

**Hecho.** `npm run dev:aislado` → `scripts/dev-aislado.ts`: crea `app/.datos-dev` (ignorado por git)
y arranca `electron-vite dev` pasando `--user-data`. Aísla la instalación entera —base, respaldos,
registros y almacén— igual que los E2E. Acepta un nombre de escenario:
`npm run dev:aislado -- mi-escenario`. Limpia `ELECTRON_RUN_AS_NODE`, que convierte el binario de
Electron en un Node pelado y rompe el arranque (lo pisó este mismo entorno al probarlo).

**Verificación.** Con dev aislado corriendo se creó `app/.datos-dev/valuacion.db` con sus propios
`logs/` y `respaldos/`, y la base instalada quedó **intacta**: misma marca de tiempo (10:53:27) y
mismo tamaño (806.912 bytes) antes y después.

**Ampliación el mismo día — la instalación aislada es efímera.** A petición del propietario, cada
ejecución empieza en blanco. **Se limpia al abrir, no al cerrar:** hacerlo al cerrar deja el
directorio sucio en cuanto la ejecución termina de forma anómala —terminal matada, cuelgue, el
`electron.exe` que queda colgado reteniendo el bloqueo de instancia única, cosa que ocurrió mientras
se probaba esto— y entonces la garantía falla justo cuando se la cree cumplida. Limpiando al abrir,
no depende de cómo terminó la vez anterior, y los registros de la sesión anterior siguen ahí para el
post mortem. `-- --conservar` mantiene los datos; `-- <nombre>` da escenarios paralelos.

Como el script borra directorios, el nombre de escenario se restringe a **un solo segmento**
(`/^[A-Za-z0-9._-]+$/`) y se comprueba además que el destino esté bajo `.datos-dev`: sin eso, una
errata como `../..` sería un borrado recursivo sobre cualquier carpeta del equipo. Ambas guardas
probadas con `../../../fuera` y `C:/Windows`.

**Verificado con el propio registro de la app:** arranque efímero → la base **nace de nuevo**
(11:30:02 → 11:40:19), el log queda con 1 arranque en vez de 2 y vuelve a migrar (`migradaDesde: 0`,
3 migraciones). Con `--conservar` → misma base (nacida 11:40:19) y `migradaDesde: 3, aplicadas: []`.

**Siguiente:** sin cambios en el plan.

---

## 2026-09-04 · Claude · Defecto reportado: `PL-03` rechazaba 28 filas por una tilde y un guion

**Tareas:** corrección de defecto sobre `T-C-07` (no abre tarea nueva)

**Lo reportado.** Al importar `PL-03`, 28 de 41 filas fallaban con *«La clase no existe en el
catálogo de la entidad (impórtela con PL-02 antes)»*.

**Reproducción exacta antes de tocar nada.** Se contaron las clases del `PL-03` de
`/datos_de_prueba` y se simuló la normalización del importador contra el catálogo **sugerido**
(el que se precarga al crear la entidad): `EQUIPO MEDICO CIENTIFICO` (23 filas) y
`EQUIPO DE COMUNICACION Y COMPUTACION` (5) no casaban. 23 + 5 = **28**, el número reportado.

**Causa.** `importarPl03.ts` comparaba con una clave que solo pasaba a mayúscula y colapsaba
espacios. El catálogo sugerido de `/especificacion/teoria` §5 dice «Equipo médico-científico»; quien llena el
formato escribe «EQUIPO MEDICO CIENTIFICO», en mayúscula sostenida y sin tildes, como se llena un
formato en papel. **Una tilde y un guion tumbaban 23 bienes.**

**Corrección.**

1. **Índice doble** en clases, sedes y servicios: clave exacta y clave laxa (sin tildes, con la
   puntuación como separador). La búsqueda prueba **primero la exacta**, así que una coincidencia
   literal siempre gana y la tolerancia no puede robarle una fila a otra clase.
2. **El error dice qué hay en el catálogo.** Antes mandaba a importar `PL-02` sin decir contra qué
   se comparó; ahora enumera las clases (o sedes, o servicios) realmente registradas. La diferencia
   entre un callejón sin salida y algo que se puede arreglar.
3. **Los datos de prueba se alinearon** en el único nombre que de verdad difería: `COM` pasa de
   `EQUIPO DE COMUNICACION Y COMPUTACION` a `EQUIPO DE COMUNICACION Y COMPUTO`, como el catálogo
   sugerido. El corpus ya no depende del orden de importación para algo que no está enseñando.
4. **El instructivo lo explica**: qué se perdona (mayúsculas, tildes, puntuación, y el código en vez
   del nombre) y qué no.

**Dónde está la frontera, y por qué se deja ahí.** La tolerancia llega a la ortografía, no al
vocabulario: «cómputo» y «computación» son palabras distintas y esa fila **sigue siendo un error**.
Adivinarla sería inventar a qué clase pertenece un bien —y con ella su vida útil y su depreciación—
en un cálculo que después se firma. El test de regresión fija ese límite explícitamente.

**Verificación.** `verificar:todo` en verde: **387 tests** (uno nuevo), typecheck, lint, 223 módulos
sin violaciones de frontera. Sobre el corpus regenerado, las filas que fallarían contra el catálogo
precargado pasan de **28 a 0**.

**Siguiente:** sin cambios en el plan; sigue `T-C-03` (ficha editable del bien) como lo más útil.

---

## 2026-09-04 · Claude · Eliminar una entidad, con la frontera que impone la propia base

**Tareas:** `RF-01-01` ampliado · canal `entidad:eliminar`

Pedido del propietario. Antes de implementarlo hubo que decidir **hasta dónde llega**,
porque este proyecto custodia evidencia contable y hay dos reglas que se cruzan:

- `ejercicio.entidad_id` es **`restrict`**: la base ya impide borrar una entidad que tenga
  ejercicios.
- **`INT-03`** aborta el borrado de cualquier bien de una entidad real (`RN-09-09`); solo
  exceptúa al hospital de demostración.

Es decir: **borrar una entidad con inventario es imposible sin debilitar una regla de
integridad documentada**, y eso sería un ADR nuevo, no una decisión de implementación
(regla 9 del repositorio).

### La frontera adoptada

**Se puede eliminar mientras no exista ningún ejercicio.** Es una regla que se explica en
una frase —"se borra mientras la valuación no haya empezado"— y cubre el caso frecuente y
legítimo: la entidad creada con el NIT equivocado, la duplicada, la de una prueba que nunca
se usó. En cuanto hay ejercicio hay trabajo y bitácora; y si alguno se cerró, es evidencia
firmada.

Cuando se rechaza, **el mensaje dice qué pasa y qué hacer**: nombra los ejercicios que lo
impiden y recuerda que los datos de la entidad se **corrigen** desde su pantalla, con
justificación y bitácora. Si hay ejercicios cerrados, lo dice aparte y cita ADR-017.

### Decisiones de detalle

- **La bitácora no se borra.** Que una entidad se eliminó también es historia: se registra
  `ELIMINAR` con la razón social, el NIT y el motivo **antes** de borrar, porque después el
  responsable ya no existe. Las filas quedan sin entidad viva, y está bien: un registro de
  auditoría no se poda.
- **Se exige un motivo** (mínimo 5 caracteres), que queda en la bitácora. Es la operación
  irreversible que más lejos llega hoy en la aplicación.
- El resto del catálogo —sedes, servicios, clases, parámetros, abreviaturas, convención y
  responsables— se va con ella por `cascade`, que ya estaba declarado en el esquema.
- **El hospital de demostración se rechaza** y se remite a su propio botón: ese sí arrastra
  bienes y ejercicios porque son datos ficticios, y tiene su propia advertencia.
- En la interfaz, el botón va **fuera del enlace** de la tarjeta: pulsar "eliminar" no puede
  ser también "entrar".

### Lo que esto NO resuelve

Una entidad con inventario ya importado **no se puede borrar**. Para pruebas, lo práctico es
usar el hospital de demostración (que sí se borra entero) o una instalación aparte con
`--user-data`. Si el propietario quiere borrado total de entidades reales, es un ADR.

**Estado:** 386 tests + 5 de rendimiento + **15 E2E**, en verde también sobre el paquete.
Instalador: 108,1 MB · SHA-256 `841a8bc90e58890c05f11828390a2d7b4943a500a2810bc982f65a9ca7ac13bd`.

---

## 2026-09-04 · Claude · Instructivo de diligenciamiento: qué formatos llena el hospital

**Tareas:** script `instructivo` (nuevo)

El propietario va a **entregar los Excel a un funcionario para que los llene**, y preguntó
si estaban todos. La pregunta correcta no era cuántos archivos generé, sino **cuáles de las
28 plantillas hay que llenar hoy**. La respuesta, sacada del catálogo:

| | Cuántas | Cuáles |
|---|:-:|---|
| La aplicación **las lee** | 5 | `PL-01`, `PL-02`, `PL-02b`, `PL-03`, `PL-05` |
| **Las produce** la aplicación | 5 | `PL-04`, `PL-07`, `PL-08`, `PL-09`, `PL-14` |
| Se diligencian, pero son de **etapas aún no construidas** | 18 | conciliación, valuación, inmuebles, Comité, entrega |

Así que el juego de datos de prueba **sí estaba completo**: son exactamente las cinco que
hoy tienen camino. Lo que faltaba no era un archivo, era **decir cuáles y cómo se llenan**.

### `npm run instructivo`

Genera `datos_de_prueba/INSTRUCTIVO_DILIGENCIAMIENTO.md` **desde las definiciones reales
del importador** (`PL_02`, `PL_02B`, `PL_03`, `PL_05`, `CLAVES_PL_01` y el catálogo de
plantillas). No se escribe a mano a propósito: un instructivo desfasado hace que alguien
llene mal 500 filas y lo descubra al importar.

Sale columna por columna con el tipo, si es obligatoria, **los valores admitidos de cada
lista cerrada** y una nota escrita para quien llena, no para quien programa. Incluye:

- Las **tres reglas** que evitan casi todos los errores: no renombrar columnas, dejar
  quieta la fila azul de ejemplo, y **lo que no se sabe se deja vacío, nunca en cero**.
- Los errores más frecuentes de `PL-03`: código o placa repetidos, servicio que no
  pertenece a la sede, y que la serie repetida sí se admite.
- El **orden de trabajo**: descargar `PL-03` y `PL-05` **después** de cargar el catálogo,
  porque solo entonces salen con las listas desplegables del hospital. Entregarlos antes
  obliga al personal a escribir los nombres a mano y garantiza errores de digitación.

**No cambió código de la aplicación**, así que el instalador sigue siendo el mismo.

---

## 2026-09-04 · Claude · La entidad se puede crear desde el PL-01 diligenciado

**Tareas:** `RF-01-02` ampliado · corrección del `LEEME` de los datos de prueba

El propietario reportó que al crear una entidad nueva no se podían importar sus datos.
**Tenía razón, y mi propia documentación afirmaba lo contrario.** El `LEEME` de
`/datos_de_prueba` decía *"Nueva entidad. Puede teclear los datos o importarlos con
PL-01"*, cuando el importador exigía una entidad **ya existente**: `PL-01` solo servía
para actualizar, nunca para crear. Había que copiar a mano lo que ya estaba escrito en
el Excel.

### Lo que se hizo

`PL-01` puede llegar **sin entidad y crearla**. Es el caso real: el hospital recibe el
formato, lo devuelve lleno, y de ahí debe nacer todo.

- **`ImportadorPlantilla` gana `requiereEntidad`** (por defecto `true`). Solo `PL-01` lo
  pone en `false`. Las demás siguen exigiendo entidad y lo dicen con su propio código de
  error: importar sedes o bienes «al aire» no significa nada.
- **`aplicarPl01` reutiliza `crearEntidad`** en vez de duplicar la inserción. Así hereda
  gratis el NIT único, la precarga del catálogo sugerido y la entrada en bitácora.
- **La identificación obligatoria se valida en la previsualización**, no al confirmar: si
  falta la razón social o el NIT, el usuario lo ve **antes** de decidir, con el nombre del
  campo. Y si el NIT ya existe, se le dice que abra esa entidad en vez de duplicarla.
- **El acta del contador no se hereda de un Excel.** Al crear desde plantilla,
  `metodo_conteo_meses_confirmado` queda en falso: `VAL-01-07` exige un acta, y un archivo
  no es un acta (CT-02).
- `ResultadoImportacion` ahora dice **a qué entidad afectó**, que es lo que permite a la
  interfaz llevar al usuario a la entidad recién creada.

En la pantalla de *Nueva entidad* hay ahora dos caminos visibles: **Crear desde PL-01** o
teclear. El diálogo de previsualización se extrajo a `InformeImportacionDialogo` para no
duplicarlo: allí la importación es una vía de creación, no una acción sobre algo existente.

### Detalle de implementación que conviene recordar

Cuando la plantilla crea la entidad todavía no hay identificador, así que la copia del
archivo original se guarda en `almacen/importaciones/_entidades_nuevas/` y la bitácora la
enlaza después con la entidad ya creada. El orden importa: el archivo se conserva **antes**
de escribir, porque la hoja `SIN_SOPORTE` de `PL-05` lo cita como evidencia.

**Probado:** tres pruebas de integración (nace completa con sus parámetros; el NIT
duplicado se avisa en la previsualización; las demás plantillas siguen exigiendo entidad) y
un E2E que recorre la pantalla real con el `PL-01` del hospital ficticio y comprueba que
los datos del Excel llegaron a los formularios.

**Corregido también el `LEEME`**, que ahora describe lo que la aplicación hace de verdad.

**Estado:** 383 tests + 5 de rendimiento + **14 E2E**, en verde también sobre el paquete.
Instalador reconstruido: 108,1 MB · SHA-256 `e90740513c076390a71619bf7c03fbf1846ba8fadc49d0c09c8c09288e7ecbfa`.

---

## 2026-09-03 · Claude · Tercer defecto de la CI: la UNC dejaba de serlo en Linux

**Tareas:** `T-A-08` 🟡 (Windows en verde de punta a punta; Linux fallaba en el último paso)

La corrida de Linux llegó esta vez hasta los E2E sobre el paquete y falló **uno solo**:
*"una ruta de datos UNC bloquea el arranque sin abrir la base"*, por tiempo agotado a los
60 s. En Windows pasa.

**Causa —la misma familia que el defecto anterior:** `resolverRutaDatos` aplicaba
`resolve()` al argumento `--datos`, y `resolve` es del sistema **anfitrión**. Comprobado:

| | Resultado | ¿Sigue siendo UNC? |
|---|---|---|
| Argumento crudo | `\\servidor\compartida\valuacion` | **sí** |
| `win32.resolve` | `\\servidor\compartida\valuacion` | **sí** → Windows bloquea |
| `posix.resolve` | `/home/runner/.../\\servidor\compartida\valuacion` | **no** → Linux no bloquea |

En Linux la UNC se convertía en una ruta relativa colgada del directorio de trabajo, el
bloqueo de `RG-10` no se disparaba, la aplicación arrancaba con normalidad y el E2E se
quedaba esperando una salida que nunca llegaba.

**Corrección:** una ruta UNC **ya es absoluta**; resolverla contra el directorio de trabajo
es incorrecto en cualquier sistema. `resolverRutaDatos` la deja intacta.

Prueba unitaria añadida, **con su alcance declarado**: en Windows pasa con y sin la
corrección, porque `win32.resolve` devuelve la UNC tal cual; solo puede fallar donde
`resolve` sea POSIX. El guardián real de esto es el E2E de Linux, que es quien lo encontró.

### Van tres defectos, y los tres son el mismo error de fondo

`isAbsolute`, `resolve` y los finales de línea: **lógica que se creía determinista pero
dependía del equipo donde corría**. En una sola máquina, con un solo sistema y una sola
configuración de git, los tres eran invisibles. Conviene desconfiar de cualquier uso de
`node:path` sin plataforma explícita en el arranque.

### Sobre la actualización automática (pregunta del propietario)

Preguntó por qué la aplicación instalada en su equipo no se actualiza sola cuando la CI
pasa. **No se actualiza porque no existe ese mecanismo, y es deliberado: lo decidió
[ADR-024](../plan/DECISIONES/adr_arquitectura.md)** —"sin actualización
automática en v1"— por tres razones: la red de un hospital suele bloquear descargas
salientes y un actualizador que falla en silencio es peor que no tenerlo; una
actualización que se instala sola durante un cálculo masivo o un cierre de ejercicio es un
riesgo desproporcionado; y la instalación la controla el área de sistemas.

Además, **la CI no publica nada**: compila el instalador para probarlo y lo descarta. No
sube artefactos ni crea *releases*.

**Discrepancia menor detectada:** ADR-024 dice que `electron-updater` queda *"integrado y
desactivado"*, pero no está ni instalado. El efecto es el mismo para v1 (no hay
actualización automática), pero la redacción anticipa tener la dependencia presente. Es
una decisión para el hito H (`T-H-01`…`T-H-04`), no un pendiente del núcleo.

**Estado:** 380 tests + 5 de rendimiento + 13 E2E, en verde también sobre el paquete.

---

## 2026-09-03 · Claude · Defecto de navegación reportado, y datos de prueba de un hospital ficticio

**Tareas:** corrección de `Layout` · script `datos:prueba` (nuevo)

### El defecto: entrar en Formatos deshabilitaba las demás etapas

Lo reportó el propietario: *"si entro a una entidad y luego ingreso en formatos, las
pestañas de configurar, inventario y las demás se bloquean"*.

**Causa:** el `Layout` deducía la entidad **solo de la URL** (`useParams()`). La etapa 2
es alcanzable sin haber configurado nada —así lo decidió ADR-026, para que un hospital
recién instalado pueda bajar sus formatos—, de modo que su ruta es `/formatos`, sin
`:entidadId`. Al entrar ahí, `entidadId` quedaba `undefined` y todas las etapas que
necesitan entidad se dibujaban deshabilitadas, como si no hubiera ninguna seleccionada.

Lo llamativo es que el estado ya guardaba `entidadActivaId` —lo usa la propia pantalla de
Formatos para inyectar los catálogos— pero el `Layout` no lo miraba. **Ahora manda la ruta
cuando la trae, y si no, la última entidad elegida**, y navegar por URL a otra entidad la
convierte en la activa. Si la entidad recordada ya no existe (se borró la demostración),
se olvida sola en vez de dejar la barra lateral apuntando a nada.

Cubierto por `formatos.spec.ts`: tras entrar en Formatos, las cinco etapas restantes
siguen enlazadas y se puede volver a Inventario y seguir trabajando.

### Datos de prueba: E.S.E. Hospital Santa Ana de Guarne

`npm run datos:prueba` genera en `/datos_de_prueba` un juego completo **a partir de las
plantillas reales**, no de imitaciones: así las columnas, la fila de encabezados y la de
ejemplo son exactamente las que la aplicación espera.

Dos escenarios:

- **`01_caso_limpio`** — 41 bienes, 6 clases, 2 sedes, 8 servicios. Repartidos a propósito
  para que el semáforo muestre **los cuatro colores**, haya candidatos a baja por índice y
  por estado, dos bienes **sin soporte económico** que se resuelven con la hoja
  `SIN_SOPORTE` (RN-03-04), un **terreno** (no depreciable) y un **ventilador en comodato**
  (no entra al patrimonio, RN-02-04). Siete mantenimientos, dos de ellos correctivos
  fallidos, que alimentan el criterio de baja.
- **`02_caso_con_problemas`** — diez filas de `PL-03` y cinco de `PL-05`, **cada una con un
  defecto distinto y documentado**: código y placa repetidos, clase/sede/servicio que no
  existen, estado inventado, campo obligatorio vacío, serie repetida (advertencia), toma
  posterior al corte (advertencia), adquisición posterior al corte, costo cero sin ser
  donación, vida útil sobrescrita sin justificar.

**Lo que el LEEME afirma está probado**, no prometido: `datosPrueba.test.ts` importa los
archivos por el camino real y comprueba el recorrido completo —catálogo, inventario, datos
económicos, cálculo y bandeja de bajas— y que el caso con problemas dé exactamente **3
filas válidas y 7 con error**, con los mensajes que el LEEME promete. Si alguien cambia una
regla y el juego de datos deja de cuadrar, la prueba lo dice.

**Estado:** 379 tests + 5 de rendimiento + 13 E2E, en verde.

---

## 2026-09-03 · Claude · La primera corrida de la CI encontró dos defectos reales (T-A-08)

**Tareas:** `T-A-08` 🟡 (el workflow ya se ejecuta; falta verlo verde de punta a punta)

El propietario hizo el primer push. La CI corrió en **Windows y Linux a la vez** y falló en el paso
de pruebas, con **fallos distintos en cada sistema**. Los dos eran defectos de verdad, y los dos
llevaban meses ahí sin que la suite local los viera: en una sola máquina, con un solo sistema
operativo y una sola configuración de git, ninguno de los dos se manifiesta.

### Defecto 1 — el detector de unidades de red mentía fuera de Windows

**Dónde:** `main/arranque/rutaDatos.ts`. **Falló en Linux**, 2 pruebas.

`esUnidadDeRed(ruta, plataforma, ejecutar)` recibe la plataforma **como parámetro**, justamente para
poder razonar sobre Windows desde cualquier sistema. Pero por dentro usaba `isAbsolute` de
`node:path`, que resuelve según el sistema **anfitrión**. En Linux, `Z:\valuacion` no es una ruta
absoluta POSIX, así que la función la descartaba como *"ruta relativa"* y devolvía `esRed: false`
sin llegar a consultar nada.

En producción no se manifestaba —en Windows el anfitrión es Windows—, pero el contrato de la función
era falso: decía estar parametrizada por plataforma y no lo estaba. Ahora hay `esRutaAbsoluta(ruta,
plataforma)`, que elige `win32.isAbsolute` o `posix.isAbsolute` según lo que se declara, no según
dónde corre el proceso.

### Defecto 2 — CRLF: la migración de triggers no coincidía consigo misma

**Dónde:** `infraestructura/db/integridad.test.ts`. **Falló en Windows**, 1 prueba.

La prueba de `T-B-04` compara byte a byte `0002_triggers_integridad.sql` con lo que produce
`scripts/generar-triggers.ts`, para que nadie edite los 119 triggers a mano. Los ejecutores Windows
de GitHub traen `core.autocrlf=true`, así que el `checkout` convirtió LF → CRLF y el archivo dejó de
ser idéntico al generado. En Linux pasó; en Windows no. El diff de 600 líneas era engañoso: el
contenido era el mismo, cambiaban los finales de línea.

Dos correcciones, y las dos hacen falta:

- **`.gitattributes` nuevo** con `* text=auto eol=lf` y los binarios declarados (`.xlsx`, `.docx`,
  fuentes, imágenes). Este repositorio se compara, se hashea y se audita: su contenido tiene que ser
  idéntico en cualquier equipo, no depender de la configuración de git de quien clona.
- **La prueba normaliza los finales de línea** antes de comparar, con la razón anotada. Lo que la
  prueba debe medir es que nadie tocó los triggers a mano, no cómo hizo el `checkout` quien la
  ejecuta. Verificado convirtiendo el archivo a CRLF a propósito: ahora pasa.

### Lo que esto dice del proyecto

La CI hizo exactamente aquello para lo que se escribió, en su primera ejecución. Las 376 pruebas
pasaban en local; dos de ellas dependían del sistema operativo y de una opción de git, y nadie lo
habría notado hasta que otra persona clonara el repositorio en otra máquina.

**Pendiente de la próxima corrida:** en Linux el fallo detuvo el trabajo antes de `pack` y de los
E2E, así que **el empaquetado y los 13 E2E sobre Linux siguen sin verificarse**. Localmente todo está
en verde —376 unitarias + 5 de rendimiento + 13 E2E, también sobre el instalador— y `npm audit
--audit-level=high` pasa (solo hay 6 vulnerabilidades *moderadas*, de `uuid` a través de `exceljs`).

---

## 2026-09-03 · Claude · Etapas 5 y 6: el núcleo de ADR-026 queda completo (T-F-01, T-F-02, T-D-07, T-D-10, T-G-03)

**Tareas:** `T-F-01` ✅ · `T-F-02` ✅ · `T-D-07` ✅ · `T-D-10` ✅ · `T-G-03` ✅

Con esto un hospital recorre el proceso entero sin ayuda: configura, descarga sus formatos, importa
el inventario, calcula, decide las bajas y **se lleva su informe en PDF**.

### Etapa 5 — bajas

El motor ya señalaba los candidatos; faltaba convertir eso en una decisión con respaldo.

- **La bandeja muestra los motivos, no un booleano.** Se vuelven a derivar del mismo
  `esCandidatoBaja` que los produjo, para que la pantalla y la resolución digan exactamente lo mismo.
- **RN-09-06 se hace cumplir de verdad.** Una justificación de menos de 20 caracteres, o una de la
  lista de genéricas ("Obsoleto", "Dañado", "Mal estado"), se rechaza con el ejemplo que la propia
  `/especificacion/teoria` usa: *"falla en tarjeta de control, reparación no autorizada por costo"*. Sin esto la
  regla existía en el papel y no en el producto.
- **RN-09-03** (`motor/baja.ts`): la relación reparación/reposición con el umbral parametrizable, y
  **sin cotización no hay evaluación** —NO_CALCULABLE, no un cero que parezca barato—. La relación se
  persiste con la propuesta para que la resolución cite el mismo número que vio el Comité aunque el
  umbral cambie después.
- **RN-09-05**: el efecto contable sale del paso 06, no de otra fuente. La pérdida nunca es negativa.
- **RN-09-04**: la app registra estados. El rechazo exige observación y **devuelve el bien a ACTIVO**,
  de modo que puede volver a proponerse con mejor soporte. Ejecutar sin acta del Comité **aborta en la
  base** (INT-07), no en la interfaz: hay una prueba que lo comprueba.
- **Cierre del inventario.** Faltaba el paso VALIDADO → ACTIVO. Se hizo explícito (`bien:activarValidados`)
  en vez de colarlo dentro de `proponer`: activar el inventario es una decisión del hospital, no un
  efecto colateral.

### Etapas 05 y 06 completas: 31 predicados nuevos

`T-D-07` y `T-D-10` estaban a medias porque el catálogo de validaciones solo cubría los pasos 01-03.
Ahora declara **58** (`+9` del paso 05, `+10` del 06, `+12` del 09) y **todas tienen predicado**: la
prueba de `codigosSinPredicado()` sigue en cero.

`VAL-06-07` (diferencia contra la depreciación de libros) queda **NO IMPLEMENTADO y anotado**: ese
dato lo trae la conciliación del paso 04, que es extensión. Se deja inactiva antes que inventar una
diferencia contra una fuente que no existe.

### Etapa 6 — el informe (T-G-03)

`printToPDF` desde una `BrowserWindow` **oculta, sin Node y sin JavaScript**: el PDF sale idéntico a
la vista previa porque es la misma maqueta, y cargar el HTML con privilegios sería regalar superficie
de ataque a cambio de nada.

El documento lleva, en este orden: **el método aplicado** (RF-06-08 lo exige en el encabezado, y va
además en el pie de cada página), el resumen contable, el consolidado por subcuenta con su cuadre,
el estado de la vida útil, las bajas propuestas con su justificación individual, **los bienes que
quedaron fuera y por qué**, las firmas, y el anexo con el listado bien por bien. Tamaño Carta, que es
el estándar en Colombia.

El informe **se niega a generarse** si el ejercicio no está calculado, y avisa si el cálculo quedó
desfasado: firmar cifras viejas es peor que no tener informe.

### Dos defectos que encontraron las pruebas

- **La bandeja de bajas servía caché rancia.** `calculo:ejecutar` invalidaba las consultas del cálculo
  pero no las de bajas, así que tras calcular la etapa 5 seguía diciendo "ningún candidato". Lo
  encontró el E2E, no una revisión de código.
- **El diálogo de guardado ofrecía "Libros de Excel" para un PDF.** Corregido con un mapa de formatos.

Para probar la generación real del PDF, el E2E sustituye `dialog.showSaveDialog` **desde el proceso
principal** con `app.evaluate`: se controla Electron, sin añadir plumbing de pruebas al código de
producción. El archivo se abre y se comprueba que empieza por `%PDF-`.

**Estado:** 376 tests unitarios/integración + 5 de rendimiento + **13 E2E**, en verde también sobre el
instalador (108 MB). Sin violaciones de frontera (223 módulos). Trazabilidad: **110 requisitos
implementados** (eran 72).

**Siguiente:** el núcleo está cerrado. Queda `T-C-03` (ficha editable del bien) y las extensiones,
empezando por el Comité y las resoluciones, que son las que desbloquean la ejecución de las bajas.

---

## 2026-09-02 · Claude · Etapa 4: el motor de cálculo (T-D-01, T-D-03, T-D-04, T-D-05, T-D-06)

**Tareas:** `T-D-01` ✅ · `T-D-03` ✅ · `T-D-04` ✅ · `T-D-05` ✅ · `T-D-06` ✅ · `T-D-07` 🟡 · `T-D-10` 🟡
**Contradicción nueva:** **CT-20**

### Los casos de prueba, primero, y fallando

`RG-01` dice que si los valores esperados del motor se escriben mirando el código, el motor queda
validado contra sí mismo y sus errores llegan a resoluciones firmadas por el Gerente de una entidad
pública. Así que se escribieron **42 casos antes de que existiera una sola línea del motor**, y se
ejecutaron para verlos fallar (`Cannot find module './obsolescencia'`). Cada valor esperado sale de
`/especificacion/teoria`: `ANEXO_C` §2.3, §2.4, §2.6, §2.7, §3.2, §3.3, §3.4, §4 y la tabla de §11.

El resultado es que las cifras publicadas se reproducen **al dígito**:

| Caso de `ANEXO_C` | Lo que publica `/especificacion/teoria` | Lo que da el motor |
|---|---|---|
| §2.3 obsolescencia | 3.780 días · 10,3491 · 0,6899 · 4,6509 · 2030-02-23 · AMARILLO | idéntico |
| §3.3 `mes_completo` | 86 meses · 11.342.100,44 · 12.397.179,56 | idéntico |
| §3.3 `dias_exactos` | 86,1109 meses · 11.356.724,23 · 12.382.555,77 | idéntico |
| §3.3 diferencia entre métodos | $14.623,79 | idéntico |

### Cuatro desenlaces, no un cero

`ANEXO_C` distingue **NO_APLICA** (un terreno no se deprecia), **NO_CALCULABLE** (falta la fecha o el
costo del bien) y **ERROR_DATOS** (una clase sin vida útil, una adquisición posterior al corte). El
motor los devuelve como estados distintos y la aplicación los muestra por separado, porque significan
cosas distintas: uno no hay que arreglarlo, otro lo arregla el hospital y el tercero exige corregir la
parametrización. Devolver `0` en los tres casos escondería el problema dentro de una cifra que
después se firma.

### CT-20 — un parámetro que el pseudocódigo no usaba

`ANEXO_B` §2.5 declara `umbral_semaforo_naranja` (0,99) pero `ANEXO_C` §2.6 clasifica ese tramo con un
**1,0 literal**. Con los valores por defecto, un índice de 0,995 sería ROJO con el parámetro y NARANJA
con el literal. Se resolvió a favor del **parámetro**, porque CT-04 ya había concluido que "los tres
umbrales siguen siendo parámetros configurables" y porque `validarUmbrales` exige `naranja < 1`, así
que todo índice ≥ 1 sigue cayendo en ROJO —que es lo que garantiza el caso 1 de §11—. Se documentó en
`1.4_contradicciones_teoria.md`; **`/especificacion/teoria` no se tocó**. Se anotó también el segundo hueco del mismo
tipo: el `>= 0.81` de §2.7 frente a un umbral amarillo de 0,80 deja fuera el tramo 0,8001–0,8099 con
índices de cuatro decimales, así que se lee como "por encima del umbral amarillo".

### Lo que el motor no decide

- **No calcula sin acta.** Si `metodo_conteo_meses_confirmado` es falso, `calculo:ejecutar` se niega y
  lo explica: calcular con un método que el contador no ha firmado produce cifras que no cuadran y
  hay que rehacer el ejercicio entero (CT-02, VAL-01-07).
- **No pisa el juicio humano.** La obsolescencia funcional (RN-05-03) la declara un especialista con
  justificación obligatoria; un recálculo **no la borra**, y hay una prueba que lo verifica. Un
  recálculo que destruyera el dictamen del ingeniero biomédico sería peor que no recalcular.
- **No da de baja nada.** `esCandidatoBaja` devuelve **los motivos**, no un booleano, porque "el
  sistema lo marcó" no es una motivación admisible en una resolución. El motor sugiere; el Comité
  resuelve.
- **Lee los parámetros congelados** del ejercicio (RN-01-01), nunca el catálogo vigente.

### Un defecto que encontró la base de datos, otra vez

El importador de `PL-03` escribía los bienes directamente como `INCOMPLETO` y el trigger lo rechazó:
*"Bien: todo registro nace en BORRADOR"*. Y aquí, la limpieza de cálculos sobrantes comparaba por
marca de tiempo, de modo que dos corridas dentro del mismo milisegundo no limpiaban nada; ahora se
compara contra la lista de bienes efectivamente calculados, que no depende del reloj.

### Rendimiento

**20.050 bienes calculados en 1,27 s**, y el recálculo en 1,13 s, contra un presupuesto de 10 s. No
hace falta mover el cálculo a un hilo aparte: **ADR-020 queda sin objeto** por ahora.

### Interfaz

La etapa 4 deja de estar deshabilitada. Una sola acción principal —*Calcular*— y tres respuestas:
los totales contables, el semáforo de vida útil (cada tarjeta lleva a su listado) y **qué quedó fuera
y por qué**. Si algo cambió después de la última corrida, se avisa antes de que alguien emita el
informe con cifras viejas.

**Estado:** 343 tests unitarios/integración + 5 de rendimiento + 11 E2E, todo en verde. Sin
violaciones de frontera (200 módulos): el motor sigue siendo dominio puro. Trazabilidad: **72
requisitos implementados** (eran 50).

**Siguiente:** etapa 5 (**bajas**): `T-F-01`/`T-F-02`, la propuesta de baja que nace del candidato y
su recorrido por el Comité. Después la 6 (**informe**), `T-G-03`.

---

## 2026-09-02 · Claude · Etapa 3 de ADR-026: el inventario y sus datos económicos ya entran (T-C-07, T-C-08)

**Tareas:** `T-C-07` ✅ · `T-C-08` ✅ · `T-C-09` 🟡 (parte económica hecha)

### Una sola orquestación de importación

Antes, la maquinaria de importar —elegir archivo, previsualizar con token, confirmar en transacción,
conservar el original, escribir en bitácora— vivía dentro del módulo del paso 01, junto a las reglas
de `PL-01`. Añadir `PL-03` por ahí habría significado duplicarla, y con ella el canal
`importacion:confirmar`, que solo puede existir una vez.

Se extrajo a `infraestructura/documental/excel/orquestadorImportacion`. Cada módulo de dominio
**registra** un `ImportadorPlantilla` con lo único que le es propio: cómo se lee, qué reglas la
gobiernan y dónde se escribe. La orquestación no sabe qué es una sede ni un bien; comprueba el ámbito
con SQL directo porque es infraestructura y no debe depender de los repositorios de un módulo.

Consecuencia visible: `importacion:previsualizar` acepta ahora `ejercicioId`, porque `PL-03` y `PL-05`
escriben **dentro de un ejercicio** y `PL-01`/`PL-02`/`PL-02b` no. El orquestador rechaza de entrada
—antes de abrir el diálogo— la importación sin ejercicio o sobre uno cerrado, para no hacer al
usuario recorrer un informe entero y encontrarse el rechazo al final.

### `PL-03` — la única puerta del inventario (ADR-015)

Las tres columnas de catálogo llegan como **texto** (nombre de clase, código de sede, nombre de
servicio: lo que la plantilla ofrece en su desplegable) y se resuelven contra el catálogo de la
entidad, aceptando también el código por si el hospital teclea ese. Todo el catálogo se carga **una
vez por importación** en mapas: resolver fila a fila serían tres consultas por bien, y un inventario
trae miles.

Reglas aplicadas: `RN-02-01` (código y placa únicos, comprobado contra el archivo **y** contra lo ya
registrado), `RN-02-05` (serie repetida advierte, nunca bloquea), `VAL-02-03` (clase, sede y servicio
deben existir, y el mensaje dice **cuál plantilla** los trae: "impórtela con PL-02 antes").

### `PL-05` — lo que el motor necesita

`fecha_adquisicion` y `costo_adquisicion` son **opcionales en el archivo a propósito**: `RN-03-01`
dice que su ausencia deja el bien INCOMPLETO, no que la fila sea inválida. Exigirlas impediría
importar precisamente los bienes cuyo soporte falta, que son los que hay que ver para gestionarlos.

- `RN-03-02` — un costo en cero se convierte en nulo con advertencia. Solo la donación puede valer
  cero, y entonces se avisa de que sin acta `VAL-03-03` no pasará.
- `RN-03-04` — la hoja `SIN_SOPORTE` **es** el avalúo técnico de reconocimiento inicial. Se escribe
  un `soporte_documental` de tipo `AVALUO_RECONOCIMIENTO_INICIAL` cuya evidencia es **el libro que se
  acaba de importar**, con su huella SHA-256. Por eso el archivo se conserva *antes* de escribir: la
  evidencia tiene que existir para que las filas que la citan puedan apuntar a ella. Comprobado: tras
  importarla, `VAL-03-03` deja de señalar el bien.
- `RN-03-06` — sobrescribir la vida útil técnica sin justificación se rechaza.
- Reimportar `PL-05` corregido **actualiza** la hoja de vida (`ON CONFLICT(bien_id)`), que es lo que
  hace un hospital cuando aparece la factura que faltaba; y los mantenimientos no se duplican, porque
  se comparan por (bien, fecha, tipo).

### Un defecto que encontró la base de datos

El importador escribía los bienes directamente como `INCOMPLETO` y el trigger lo rechazó: *"Bien:
todo registro nace en BORRADOR (ANEXO_B §6.2)"*. Tenía razón el trigger, no el código. Ahora se
insertan en `BORRADOR` y una transición aparte los pasa a `INCOMPLETO` —que es un movimiento válido
de la máquina de estados—, en vez de saltarse el estado inicial. Es exactamente lo que ADR-017
pretendía: que la integridad no dependa de que el programador se acuerde.

### Interfaz

El paso 02 abre ahora por **Importar**, no por el listado: con la base vacía, una tabla vacía no le
dice a nadie qué hacer. La pantalla muestra los dos pasos en orden, cuántos bienes hay y **cuántos
están incompletos**, que es la pregunta que se hace quien va a calcular.

**Rendimiento:** 10.000 altas en **0,66 s** (≈15.000 filas/s), medido en `test:rendimiento`.

**Estado:** 290 tests unitarios/integración + 4 de rendimiento + 10 E2E, en verde. Sin violaciones de
frontera (189 módulos). Trazabilidad: 50 requisitos implementados.

**Siguiente:** la **etapa 4**, la razón de ser del producto. `T-D-01` primero —los casos de prueba de
`ANEXO_C`, que deben **fallar** antes de existir el motor (`RG-01`)—, luego `T-D-03` (obsolescencia) y
`T-D-05` (depreciación y deterioro).

---

## 2026-09-02 · Claude · ADR-026: reenfoque a producto para hospitales; las plantillas ya viven en la app

**Tareas:** ADR-026 (decisión de producto) · `T-G-01` ✅ · `T-G-02` ✅ · reorganización del backlog

### La decisión

El propietario fija un destinatario nuevo —**ceder la aplicación a los hospitales**— y un objetivo
concreto: *solicitar la información de los activos, calcular la depreciación, decir cuáles se dan de
baja y generar el informe*, con el **cálculo** como lo importante. Y señala un defecto: **los Excel
que hay que diligenciar no se podían obtener desde la aplicación**; vivían en una carpeta del
repositorio, así que un hospital que recibiera solo el instalador no tenía forma de conseguirlos.

Se registra como **[ADR-026](../plan/DECISIONES/adr_producto.md)**. Lo esencial:

- **`/especificacion/teoria` no se toca.** Sigue siendo la especificación completa y los 380 requisitos siguen
  trazados. Lo que cambia es el **orden**, no el contenido. Se descartó recortar `/especificacion/teoria` porque
  convertiría la aplicación en una calculadora sin respaldo normativo.
- El trabajo se parte en un **núcleo** (configurar → obtener formatos → importar → **calcular** →
  bajas → informe; pasos 01, 02, 03, 05, 06 y la decisión técnica del 09) y unas **extensiones**
  (conciliación 04, valuación 07, inmuebles 08, Comité y actos 09-10, entrega contractual 11).
- **La simplicidad es de la interfaz, no de las reglas.** Se conserva sin excepción todo lo que
  protege la evidencia contable: bitácora, justificación en campos sensibles, inmutabilidad del
  ejercicio cerrado, `INT-01`…`INT-10`.
- **Consecuencia negativa admitida y anotada:** el paso 04 (conciliación) y su cuadre en tres niveles
  se aplazan. Una entidad que necesite saneamiento contable formal no lo cierra con esta versión.

Los identificadores `T-*` **no se renumeran** (regla del proyecto): el backlog conserva sus 64 tareas
y su criterio de verificación; el orden vigente está en el roadmap, y el backlog maestro lo advierte
en cabecera para que nadie siga el grafo de hitos por inercia.

### T-G-01 y T-G-02 — las plantillas dentro de la aplicación

- **Las 28 plantillas viajan en el instalador** (`extraResources` → `resources/plantillas`) y se
  descargan desde una pantalla nueva, *Formatos*, alcanzable **sin haber configurado nada**: es lo
  primero que necesita quien acaba de instalar.
- **Se parte de los libros reales**, no se regeneran: `PL-08`, `PL-09`, `PL-10` y `PL-11` llevan el
  motor de cálculo embebido en fórmulas (verificadas con 0 errores) y reescribirlas sería rehacer un
  trabajo ya hecho y probado. Sobre esa copia se inyectan los catálogos.
- **ANEXO_A §6.1 cumplido:** al descargar, la plantilla sale con las **clases, sedes y servicios
  reales** del hospital como listas desplegables y con el membrete sustituido. Excel limita la lista
  literal a 255 caracteres, así que por encima de eso los valores van a una hoja auxiliar oculta —un
  hospital puede tener cientos de servicios.
- **La fila de ejemplo se conserva a propósito.** El LEEME pedía borrarla a mano; el importador ya la
  reconoce por su color y la omite, así que el usuario no tiene que acordarse de nada.
- Botón para descargar **de una vez los cinco formatos indispensables** (`PL-01`, `PL-02`, `PL-02b`,
  `PL-03`, `PL-05`), y tras guardar se abre el explorador en el archivo: sin eso, "¿dónde quedó?" es
  la siguiente pregunta.
- **Prueba de ida y vuelta**, que es la que vale: descargar `PL-02b` → diligenciarla → volver a
  importarla → la sede nueva aparece en la base.

### Interfaz: de 11 pasos a 6 etapas

La barra lateral deja de listar los 11 pasos del contrato y muestra el **camino del cálculo** con su
resumen en una línea. Las etapas aún no construidas siguen visibles pero deshabilitadas **con su
razón** ("El motor de cálculo es lo siguiente que se construye"), nunca ocultas. Las extensiones se
listan aparte, para que se sepa que existen sin que estorben.

### Defecto encontrado en las pruebas

Tres E2E fallaban sobre el paquete con `ECONNRESET`. Causa: **procesos colgados** de ejecuciones
anteriores y el bloqueo de instancia única (`T-B-06`) matando los lanzamientos nuevos que compartían
`userData`. Ahora `lanzarApp` da a cada prueba su propia instalación temporal; ya no pueden
colisionar entre sí ni con una app abierta.

**Estado:** 277 tests unitarios/integración + 3 de rendimiento + 10 E2E, en verde también sobre el
paquete. Las 28 plantillas verificadas dentro del instalador.

**Siguiente:** etapa 3 del núcleo (`T-C-07` importar `PL-03`, y `PL-05` para los datos económicos) y
enseguida la etapa 4, que es la razón de ser del producto: `T-D-01`, `T-D-03`, `T-D-05`.

---

## 2026-09-02 · Claude · Corrección del fallo de interfaz reportado y hito C 2/8 (T-C-01, T-C-02)

**Tareas:** T-C-01 ✅ · T-C-02 ✅ · corrección de defectos reportados por el propietario

### Fallo reportado: "le di en guardar y no mostró más nada"

Escribí un E2E que recorre el hospital de demostración pulsando **todos** los botones de guardar del
paso 01 y falla si el renderer lanza cualquier excepción. Encontró tres causas de ese síntoma:

1. **`window.alert` bloqueante** en "Avanzar al paso 02": en Electron congela la ventana hasta
   descartarlo, y con el foco perdido parece que la aplicación se quedó muerta. Sustituido por un
   aviso en la propia página; ahora además **navega de verdad** al paso 02.
2. **El aviso de éxito desaparecía al instante** en Parámetros de cálculo: el formulario se remontaba
   (`key` derivada de los datos) al refrescarse la consulta, y con él se perdía el mensaje "Parámetros
   guardados". La mutación subió al componente padre y el formulario se sincroniza con `values`.
3. **CSP:** `frame-ancestors` no aplica en una etiqueta `<meta>` y Chromium lo reportaba como error
   en cada carga. Retirada de la CSP de producción (el enmarcado ya lo impiden `will-attach-webview`
   y el bloqueo de navegación); el test de seguridad ahora lo exige explícitamente.

**Y una red de seguridad para que no vuelva a pasar en silencio:** `<LimiteError>` alrededor de toda
la aplicación más captura de `error` y `unhandledrejection`. Una excepción de render ya no deja la
ventana en blanco: muestra qué falló, ofrece volver al inicio y **envía el detalle al registro
técnico del main** por un canal nuevo (`app:registrarErrorRenderer`), de modo que quede en
`userData/logs/` para diagnosticarlo aunque el usuario solo diga "no salió nada".

### T-C-01 — motor de validaciones declarativo

- Catálogo en `compartido/reglas/validaciones.ts` con las **27 validaciones** de los pasos 01, 02 y
  03, con su texto literal de `/especificacion/teoria`. Añadir una es una entrada de datos más su predicado.
- Motor en `modules/validaciones` con un **canal único** `validaciones:evaluar` (antes había uno por
  paso). Un código declarado sin predicado se reporta como "no implementada" en vez de pasar en
  silencio; un test exige que esa lista esté vacía.
- Predicados en cada módulo de dominio: `configuracion/val-01`, `inventario/val-02`,
  `hojas-vida/val-03`. **Ciclo de importación detectado y roto**: el índice del motor no puede
  importar los módulos de dominio (dominio → motor → dominio dejaba `falla` sin definir al cargar);
  ahora la infraestructura reúne los predicados y se los pasa al motor.
- Decisiones de interpretación registradas: la cobertura de `VAL-02-05` cuenta un servicio como
  recorrido si tiene bienes **o** acta de custodia; `VAL-03-03` y `VAL-03-04` aceptan como
  "justificación registrada" un soporte documental del tipo correspondiente (RN-03-04: nunca un dato
  inventado sin acta); las validaciones económicas solo aplican a bienes `PROPIO` (RN-02-04).
- **CT-19 registrada:** `VAL-03-07` compara contra la fecha de creación de la entidad, que `ANEXO_B`
  no modela. La validación queda inactiva con la razón anotada en vez de comparar contra `creado_en`
  (la marca de alta en la aplicación), que daría una advertencia falsa en casi todos los bienes.

### T-C-02 — `<TablaDatos>` y el listado del paso 02

- Listado con filtro, orden y paginación **en el main** (`bien:listar`), búsqueda por FTS5 con
  prefijos, `bien:idsDelFiltro` para "seleccionar todo lo que cumple el filtro" y `bien:cobertura`
  (RF-02-08). Traducir el texto del usuario a FTS **entrecomillando cada término** fue necesario:
  `DEMO-0007` se leía como sintaxis de columna y rompía la consulta.
- `<TablaDatos>` virtualizado con TanStack Virtual: anchos de columna persistidos, selección sobre el
  filtro completo, y estados **vacío / cargando / error diferenciados** — "no hay bienes" y "no hay
  bienes con estos filtros" son mensajes distintos y ambos ocurren a diario.
- Pantallas del paso 02: listado con barra de filtros y tablero de cobertura, bajo el panel de
  validaciones `VAL-02-*`. El paso 02 ya es navegable desde la barra lateral cuando hay ejercicio.
- **Piso R-05:** `Array.prototype.at()` está permitida por el plan (Chrome 92/Safari 15.4) pero
  `lib: ES2021` no la incluye. Se añadieron **solo** `ES2022.Array` y `ES2022.Object` (las dos partes
  que 3.2 §2 verificó); sonda comprobada: `toSorted` (ES2023) y `Object.groupBy` (ES2024) siguen
  fallando la compilación.

### Rendimiento (RNF-01, RNF-02)

- `scripts/sembrar.ts` genera inventarios sintéticos deterministas (`npm run db:sembrar:carga`).
- **La primera medición incumplía el presupuesto (86 ms).** Al perfilar, cada consulta individual
  costaba entre 2 y 24 ms: el exceso venía de **recompilar el SQL en cada llamada** y de medir a
  través del arnés de test. Se añadió **caché de sentencias preparadas por conexión** (mejora real:
  el listado se pide en cada tecleo) y se dejó de unir con `hoja_vida` en el conteo cuando el filtro
  no la necesita.
- Las mediciones se separaron a `*.perf.test.ts` con configuración propia y **sin paralelismo**
  (`npm run test:rendimiento`, y paso propio en CI): una medición que compite por CPU con el resto de
  la suite no mide lo que dice medir. Miden el repositorio —donde el plan fija el presupuesto— con la
  mediana de 5 ejecuciones. Con 20.050 bienes: listado < 50 ms en los cinco casos, cobertura < 50 ms,
  selección completa < 500 ms.

**Estado:** 269 tests unitarios/integración + 3 de rendimiento + 9 E2E, todos en verde.

**Siguiente:** `T-C-07` (importador de `PL-03`, la tarea crítica del hito: única vía de entrada del
inventario) y `T-C-03` (ficha editable del bien y generación del código institucional).

---

## 2026-09-02 · Claude · Hito B cerrado: paso 01 completo (T-B-10) y hospital de demostración (T-B-11)

**Tareas:** T-B-10 ✅ · T-B-11 ✅ · **Hito B 11/11**

- **Backend del paso 01:** 32 canales nuevos (`entidad`, `sede`, `servicio`, `clase`, `parametros`,
  `convencion`, `abreviatura`, `ejercicio`, `validaciones`, `importacion`, `demo`); semillas
  copiadas al crear la entidad (RF-01-03); RN-01-01 (congelado al abrir el ejercicio), RN-01-02
  (composición de código, `HSV01AGM01` reproducido), RN-01-04/05 (umbrales coherentes), RN-01-06
  (fecha de corte como campo sensible con justificación), RF-01-09 (clonación). 45 tests.
- **Decisión CT-02 en código:** `VAL-01-07` solo se cumple con `metodo_conteo_meses_confirmado = true`
  (confirmación explícita por acta); cambiar el método la invalida. Al cambiar parámetros, los
  ejercicios aún `ABIERTO` reciben la copia refrescada.
- **Importador TR-02** construido en el hito B (el plan lo situaba en `T-C-07`): lector con detección
  de encabezados por nombres (CT-07) y de la fila de ejemplo por su relleno azul claro; normalizador
  ANEXO_C §9 (fechas ISO/DD-MM/serial Excel, moneda con separadores, SI/NO, listas con mayúsculas
  unificadas, nulos especiales); informe fila por fila; "todo o nada" salvo confirmación explícita;
  copia del archivo original en `<datos>/almacen/importaciones/`. Probado contra las **plantillas
  reales** rellenadas programáticamente. `PL-03` en el hito C solo tendrá que declarar sus columnas.
- **CT-18 registrada:** `PL-01` real con `dirección`/`teléfono` con tilde, sin 4 parámetros de
  ANEXO_B §2.5 y con `fecha_corte_ejercicio`. Tolerada; conviene regenerar la plantilla.
- **Sistema de diseño (skill `apple-design`):** Tailwind 3.4.19 con tokens semánticos claro/oscuro y
  contraste verificado ≥ 4,5:1; texto base 13 px (mínimo 11); controles 32 px (28 en densidad
  compacta); icono + texto en todo semáforo; foco visible; `prefers-reduced-motion`. CSS plano sin
  `@apply` ni anidamiento por el piso R-05 (Stylelint lo vigila).
- **Renderer:** Zustand (preferencias), TanStack Query sobre IPC con claves por canal e invalidación
  declarada (`EFECTOS_PASO_01`), router en memoria, layout con los 11 pasos (los futuros
  deshabilitados con su razón, nunca ocultos), RHF + los mismos esquemas Zod del contrato.
- **Las 5 pantallas del paso 01:** asistente de nueva entidad, catálogo de clases (tabla + diálogo +
  importación PL-02 + precarga), árbol de sedes y servicios (importación PL-02b; el arrastrar y
  soltar se pospone), parámetros con explicación y convención con vista previa, panel del ejercicio
  con `<PanelValidaciones>`, creación congelada, cambio de corte con justificación y responsables.
- **Bugs evitados por los E2E:** el formulario de parámetros se remontaba con `key` al refrescar y
  perdía el aviso de éxito (mutación subida al padre, `values` de RHF); el preload no puede cargar
  Zod (ya resuelto antes). Los nombres accesibles excluyen el asterisco de obligatorio: los E2E usan
  roles.
- **T-B-11:** `hospital_demo.json` (2 sedes, 8 servicios, 6 clases, 7 responsables, 50 bienes con
  hoja de vida por la ruta válida BORRADOR→VALIDADO→ACTIVO, inmueble con avalúo, ejercicio con
  método confirmado); banda visible permanente; borrado de un clic verificado "sin residuos"
  comparando el conteo de todas las tablas antes y después (unit + E2E). INT-03 lo permite solo
  para `es_demostracion = 1`.
- **Stack (versión exacta):** tailwindcss 3.4.19, postcss 8.5.26, autoprefixer 10.5.4,
  @tanstack/react-query 5.102.8, @tanstack/react-table 8.21.3 (la 9.x se pospone), @tanstack/react-virtual
  3.14.10, zustand 5.0.15, react-hook-form 7.87.0, @hookform/resolvers 5.9.1, react-router 7.18.3
  (la 8.x exige React ≥ 19.2.7 y cambia API; se sigue el plan), lucide-react 1.39.0, Radix
  (dialog 1.1.23, tabs 1.1.21, select 2.3.7, tooltip 1.2.16, checkbox 1.3.11, switch 1.3.7, label
  2.1.15, radio-group 1.4.7, dropdown-menu 2.1.24, popover 1.1.23, toast 1.2.23, scroll-area 1.2.18,
  separator 1.1.15), clsx 2.1.1, tailwind-merge 3.6.0, class-variance-authority 0.7.1, exceljs 4.4.0.
- **Medición:** renderer 579 kB (< 2,5 MB); instalador regenerado con la interfaz nueva.
- **Fallo grave detectado al cierre, solo visible sobre el paquete:** la app instalada salía con
  código 1 antes de escribir el registro. Causa: `uuid` 14 (solo ESM) no se resolvía desde el
  `app.asar` en el main empaquetado. El E2E con `PROBAR_PAQUETE=1` no se había vuelto a ejecutar
  desde el hito A, así que el paquete llevaba roto desde `T-B-03` sin que los tests sobre `out/` lo
  vieran. **Corrección:** UUID v7 propio sobre `node:crypto` (RFC 9562) con tests; `uuid` retirado
  del stack. **Regla nueva:** el E2E sobre el paquete forma parte del cierre de cada hito, no solo
  de CI. Los 7 E2E pasan sobre el paquete; instalador regenerado.

**Siguiente:** hito C — `T-C-01` (motor de validaciones para los 101 `VAL-*`), `T-C-02`
(`<TablaDatos>`), `T-C-07` (`PL-03`), y `T-G-04` en paralelo. Etiquetar `v0.2.0-hito-B` tras el push.

---

## 2026-09-02 · Claude · Hito A cerrado por el propietario; hito B 9/11 (T-B-01 … T-B-09)

**Tareas:** T-A-03 ✅ (confirmación del propietario) · T-B-01 ✅ · T-B-02 ✅ · T-B-03 ✅ · T-B-04 ✅ ·
T-B-05 ✅ · T-B-06 ✅ · T-B-07 ✅ · T-B-08 ✅ · T-B-09 ✅

- **T-A-03:** el propietario instaló el `.exe`, vio "SQLite conectada" y desinstaló. Hito A cerrado
  salvo el push (T-A-08).
- **T-B-01/02:** tipos nominales, 15 catálogos canónicos (14 de ANEXO_B §5 + `estado_registro`) con
  test de exhaustividad contra la tabla literal del anexo, errores con `DtoError`, `dinero.ts`
  (RED-01…06, clon aislado de decimal.js) y `fechas.ts` (día juliano, sin `Date`). **El caso real de
  ANEXO_C §3.3 se reproduce exacto:** 2.621 días, 86 / 86,1109 meses, 11.342.100,44 / 11.356.724,23.
  Bug encontrado por test: `aCentavos('-0.004')` devolvía `-0`; el constructor lo normaliza.
- **Interpretación registrada (RED-06):** "desempate hacia arriba" = `ROUND_HALF_UP` (alejándose de
  cero), como fija plan 2.6 §7. Solo difiere del redondeo hacia +∞ en negativos exactos a mitad de
  centavo (`diferencia_vs_libros`). Si el contador lo objeta, es un cambio de una línea y de tests.
- **CT-16 y CT-17 detectadas:** `ValuacionMueble.estado_aprobacion` sin valores, y 15 atributos
  "estado/tipo" sin catálogo. Provisionales en código, documentadas en 1.4; `/especificacion/teoria` intacta.
- **T-B-03:** 44 tablas Drizzle (dinero `_cent`, factores `_x10k`, CHECK generados desde los
  catálogos), SQL por drizzle-kit, migrador propio con `user_version` y respaldo verificado antes de
  migrar (probado desde vacío y desde versión anterior), FTS5 por triggers. Migraciones incrustadas
  en el bundle del main con `import.meta.glob ?raw`. `depreciacion_mensual` (decimal(18,4)) se guarda
  como pesos ×10.000, no como centavos, para no perder los 4 decimales del anexo.
- **T-B-04/05:** `scripts/generar-triggers.ts` produce la migración 0002 desde el esquema y las
  máquinas de estado: 119 triggers (INT-02…INT-10, RN-10-07, RNF-07, estado inicial + transiciones
  de las 4 máquinas, e INT-09 sobre 33 tablas incluidas las indirectas vía bien/propuesta/avalúo).
  Un test exige que el archivo coincida con el generador. **Decisión:** INT-03 exceptúa solo a la
  entidad `es_demostracion = 1`, para el borrado de un clic de T-B-11. **Decisión:** la bitácora de un
  ejercicio cerrado admite solo `EXPORTAR` (RN-11-04). 17 tests violan cada regla por SQL directo.
- **T-B-06:** `arrancar()` con dependencias inyectadas; `config.json` validado con Zod 4
  (`prefault` en objetos anidados); precedencia `--datos` → config → userData; UNC determinista +
  `Win32_LogicalDisk.DriveType`/`df -T` para unidades mapeadas; log `app-AAAA-MM-DD.log` rotativo
  14 días; respaldo diario rotativo 10. **E2E real:** `--datos=\\servidor\...` bloquea, registra y no
  crea la base (con `VALUACION_SIN_DIALOGO=1` para no colgar el test en el modal). Se añadió
  `--user-data=<ruta>` para instalaciones aisladas.
- **T-B-07/08/09:** contrato IPC con Zod y `satisfies` contra la lista blanca; middleware
  1-2-5-6-7-8-9 (sin 3-4 por ADR-016); los canales que mutan corren en transacción de better-sqlite3
  con la bitácora dentro (probada la reversión conjunta) y por eso **deben ser síncronos**;
  `GestorTareas` con progreso ≤ 1/250 ms y cancelación; responsables con perito→R.A.A obligatorio y
  desactivación en vez de borrado. **Hallazgo:** el preload con sandbox no puede `require('zod')`
  (externalizado por electron-vite): la lista de canales se separó a `canales.ts` sin dependencias.
  **Bug evitado por test:** el `default(false)` de `esExterno` dentro del parcial de `actualizar`
  habría marcado como interno a cualquier perito al editarlo.
- **Stack:** añadidos con versión exacta drizzle-orm 0.45.2, drizzle-kit 0.31.10, uuid 14.0.2,
  zod 4.5.4, fast-check 4.9.0 (decimal.js 10.6.0 ya estaba).

**Siguiente:** `T-B-10` (paso 01 completo) y `T-B-11` (hospital de demostración). Antes de las
pantallas, instalar el sistema de diseño e invocar la skill `apple-design`.

---

## 2026-09-02 · Claude · Arranque de la implementación: hito A ejecutado (6/8 ✅ + 2 🟡)

**Tareas:** T-A-01 ✅ · T-A-02 ✅ · T-A-03 🟡 · T-A-04 ✅ · T-A-05 ✅ · T-A-06 ✅ · T-A-07 ✅ · T-A-08 🟡

- **`/app` creado** con la estructura de Fase 4.1. `verificar:todo` (tipos + lint + fronteras +
  tests + trazabilidad) y `npm audit` en verde al cierre.
- **Versiones congeladas (T-A-01)** contra el registro real de npm y `electronjs.org/headers`:
  **Electron 44.1.1** (Chromium 152.0.7977.65, Node 24.19.0, ABI 149 — la major con más soporte por
  delante), Vite 7.3.6 + electron-vite 5.0.0 (Vite 8 no es compatible con electron-vite 5),
  React 19.2.8, better-sqlite3 13.0.3. Registro completo en `app/docs/decisiones-runtime.md`;
  `npm run verificar:versiones` vigila el congelado.
- **TypeScript se congela en 5.9.3 y NO en el `latest` 7.0.2**: typescript-eslint 8.69.0 solo
  soporta TS `<6.1.0`. Migrar a TS 6/7 exigirá ADR nuevo cuando el ecosistema lo soporte.
- **Hallazgo que cambia el plan de empaquetado:** better-sqlite3 v13 es **Node-API** con binarios
  incluidos en el paquete npm (`prebuilds/win32-x64.node`), estables entre ABIs. Ya **no** hay que
  recompilarlo para Electron: se eliminó `postinstall: electron-builder install-app-deps` (fallaba
  sin Visual Studio C++, que esta máquina no tiene) y se fijó `npmRebuild: false`. `asarUnpack`
  sigue siendo obligatorio. Verificado con E2E sobre el paquete real.
- **T-A-04 probado como exige el plan:** un `import 'fs'` dentro de `src/compartido/motor/` falla
  por **tres vías** (tsc con `types: []`, ESLint M-1, dependency-cruiser); `Object.groupBy` en el
  renderer falla por `lib: ES2021`. Sondas borradas tras la prueba.
- **Corrección de conteos (RG-15).** La primera ejecución de `scripts/trazabilidad.ts` reveló que
  la tabla de `1.1 §1` estaba subcontada. Extracción verificada código a código contra su documento
  de definición (cero fantasmas): **RF 102 · RN 79 · VAL 108 · EN 70** (+ EN-G 11 + INT 10 = 380
  filas). Los 102 RF incluyen RF-02-01/02, tachados y trazados como `NO_IMPLEMENTADO` (ADR-015).
  Tabla corregida con nota fechada; `/especificacion/teoria` **no** se tocó.
- **Corrección del `.gitignore` raíz:** ignoraba `app/docs/decisiones-runtime.md`, que es el
  registro autoritativo de T-A-01 y debe versionarse. Línea eliminada.
- **Mediciones (T-A-05):** instalador NSIS **98,9 MB** (<120 ✓), instalada **324 MB** (<350 ✓),
  renderer **193 kB** (<2,5 MB ✓), arranque ≈5 s frío / 0,7–1,2 s tibio (medición en hardware
  objetivo i3/HDD queda para Fase 9). Para entrar en presupuesto se recortaron de `electron-builder.yml`
  las fuentes C y prebuilds ajenos de better-sqlite3 (−25 MB) y los locales de Chromium a
  es/es-419/en-US (−47 MB), re-verificando con E2E tras cada recorte.
- **Seguridad (T-A-07):** sandbox + contextIsolation + CSP por entorno (estricta en producción,
  inyectada como `<meta>` en build) + bloqueo de navegación/ventanas/permisos. 11 tests unitarios y
  verificación conductual E2E (el renderer no tiene `require` ni `process`; solo `window.api`).
- **Gotcha de entorno documentado:** los terminales de VS Code exportan `ELECTRON_RUN_AS_NODE=1`,
  que convierte el binario de Electron en un Node pelado y rompía Playwright. Los E2E limpian la
  variable al lanzar.
- **Pendiente para cerrar el hito A** (ambos del propietario): instalar el `.exe` en una máquina
  limpia (T-A-03) y hacer el primer push para ver la CI verde (T-A-08). No se hizo push por regla
  de no publicar sin orden expresa.

**Siguiente:** `T-B-01` (tipos base, 15 enums, jerarquía de errores) — el hito B no depende de los
dos flecos.

---

## 2026-09-01 · Claude · Resolución de las 15 contradicciones y corrección de `/especificacion/teoria` a v2.1

**Tareas:** ninguna de implementación. Decisiones de negocio y corrección documental.

- El propietario tomó las **seis decisiones** que estaban abiertas:
  - **CT-01** — *la fórmula manda*. Los ejemplos numéricos de `ANEXO_C` se recalculan y se corrigen
    en `/especificacion/teoria`.
  - **CT-02** — `dias_exactos` como método de conteo sugerido. **El acta del contador
    (`IN-06-04`) sigue siendo obligatoria** antes de calcular: `VAL-06-01` no se levanta con el valor
    sugerido.
  - **CT-03** — el avalúo se compara contra **`valor_neto_libros`** (con deterioro descontado),
    parametrizable con `base_comparacion_avaluo`.
  - **CT-05** — captura móvil y lectura con cámara **fuera de alcance**. El inventario entra
    **solo por importación de `PL-03`**. `RF-02-01` y `RF-02-02` pasan a NO IMPLEMENTADOS.
  - **CT-08** — **sin inicio de sesión**. Monousuario. Los 10 roles de `ANEXO_B` §7.2 se
    reinterpretan como **catálogo de `Responsable`**: dato de atribución para firmar documentos, no
    control de acceso.
  - **CT-11** — **regla de exclusión mutua** en la consolidación: un bien aporta a
    `ajustes_de_valor` (error de registro) **o** a `valorizaciones/desvalorizaciones` (medición a
    valor razonable), nunca a ambas.
  - Extra: hospital de demostración completo (`T-B-11`) y `.claude/` versionado.

- **Corrección aritmética previa a aplicar CT-01.** Al recalcular con precisión completa detecté que
  la cifra que yo mismo había escrito en el análisis de `CT-01` era incorrecta:
  **11.355.727,15 → 11.356.724,23** (venía de multiplicar valores ya redondeados). Las cifras
  definitivas, verificadas:

  | Caso | Magnitud | Valor correcto |
  |---|---|---|
  | Obsolescencia | edad / índice / restantes | 10,3491 · **0,6899** · 4,6509 |
  | Valuación | avalúo sugerido | **3.101.000** |
  | Depreciación `mes_completo` | 86 meses | **11.342.100,44** |
  | Depreciación `dias_exactos` | 86,1109 meses | **11.356.724,23** |
  | Diferencia entre métodos | | **$14.623,79** (no los $180.000 que afirmaba el anexo) |

- **`/especificacion/teoria` pasa a la versión 2.1.** 12 correcciones aplicadas y registradas en
  `/especificacion/teoria/CORRECCIONES.md`, cada una con nota al pie en el documento afectado. Documentos tocados:
  `ANEXO_B`, `ANEXO_C`, `README`, `01`, `02`, `05`, `06`, `07`, `10`.

- **Plan actualizado:** ADR-015, ADR-016 y ADR-025 reescritos; `1.4_contradicciones_teoria.md`
  convertido en registro de resoluciones; backlog, roadmap, riesgos, stack, seguridad, testing y
  checklist final alineados.

- **Backlog:** se elimina `T-C-04` (captura con escáner) y se añade `T-B-11` (hospital de
  demostración). Total sin cambios: 64 tareas. **Ninguna bloqueada** (antes eran 8).

- **Stack:** se eliminan `@zxing/browser` y `argon2`/`scrypt`. Queda **un solo módulo nativo**
  autorizado, `better-sqlite3`.

- **Riesgos:** `RG-01` pasa a MITIGADO (causa raíz eliminada). `RG-05` **CERRADO** por ADR-015.
  `RG-04` **sube a exposición crítica**: al ser la importación la única vía de entrada de inventario,
  no hay alternativa si el importador falla.

- **`.gitignore` reescrito.** `.claude/` pasa a versionarse (solo se ignora `settings.local.json`),
  de modo que las skills y el protocolo de continuidad viajan con el repositorio.

**Siguiente:** ejecutar el hito A, empezando por `T-A-01` (congelar versiones). No queda ningún
bloqueo.

---

## 2026-09-01 · Claude · Plan de desarrollo y sistema de seguimiento

**Tareas:** ninguna de implementación. Planificación.

- Analizado íntegramente `/especificacion/teoria`: 17 documentos, 4.414 líneas. Inventario: 11 pasos, 94 `RF`,
  68 `RN`, 101 `VAL`, 68 `EN`, ~40 entidades, 15 enums, 10 `INT`, 28 plantillas, 52 pantallas.
- Revisadas las skills de `.claude/skills/`: `electron-skill` (aplicada a las fases 2, 7 y 8) y
  `apple-design-skill` (aplicada a 2.5 y a los criterios de accesibilidad de la fase 9).
- Creado `/proyecto/plan` con 9 fases, 25 ADR y un backlog de 64 tareas con dependencias y
  criterios de verificación.
- Creado `/proyecto/gestion` (roadmap, estado actual, esta bitácora).
- **Verificación aritmética de los ejemplos de `ANEXO_C`.** Se comprobaron numéricamente los casos
  de §2.3 (obsolescencia) y §3.3 (depreciación) y **ninguno es reproducible** con las fórmulas que
  el propio anexo declara:
  - §2.3: 3.780 días / 365,25 = **10,3491** años, no 10,3833. Índice real **0,6899**, no 0,6922.
  - §3.3: entre 2018-04-27 y 2025-06-30 hay **2.621** días → `dias_exactos` = **86,1109** meses, no
    87,3908. Las tres cifras de depreciación de la tabla comparativa son mutuamente incoherentes.
  - Registrado como **CT-01**, la contradicción de mayor severidad, y como riesgo `RG-01`.
- Documentadas **15 contradicciones** (`CT-01` … `CT-15`), 4 de ellas bloqueantes.
- **Hallazgo de compatibilidad:** Tailwind CSS v4 requiere Chrome 111+/Safari 16.4+ (`@property`,
  `color-mix()`), lo que rompe el piso de 4 años exigido (`R-05`). Se fija **Tailwind 3.4.x**.
  Registrado como ADR-009 y riesgo `RG-09`.
- **Decisión estructural:** el dinero se representa como **enteros de centavos** en SQLite y se opera
  con `decimal.js`. Con `number` de coma flotante, el cuadre en tres niveles con tolerancia de $1
  sobre 20.000 registros no es garantizable. ADR-006.
- **Decisión de alcance:** `RF-02-01` (captura móvil offline) es incompatible con un monolito
  Electron de escritorio. Se propone alcance reducido —escáner USB e importación— y se declara
  PARCIAL. ADR-015, pendiente de aceptación del cliente.
- Se observa que el `.gitignore` del repositorio ignora `.claude/` completo, lo que excluiría del
  control de versiones las skills y la configuración de sesión. **Señalado al propietario; no
  modificado.**

**Siguiente:** aprobación del plan y ejecución del hito A (`T-A-01` … `T-A-08`), que no depende de
ninguna decisión del cliente. En paralelo, trasladar al cliente las cuatro preguntas bloqueantes
(CT-01, CT-02, CT-05, CT-08).

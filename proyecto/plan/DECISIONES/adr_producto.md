# Decisiones de producto

---

## ADR-026 — Reenfoque: de herramienta de contrato a producto para hospitales

**Fecha:** 2026-09-02 · **Decidido por:** el propietario del proyecto
**Sustituye en alcance a:** nada de lo anterior. `/especificacion/teoria` sigue vigente y completa; lo que cambia es
**el orden y la prioridad** de lo que se construye.

### Contexto

El plan original (64 tareas, hitos A → H) trataba la aplicación como el instrumento de **un contrato
de consultoría**: los 11 pasos de `/especificacion/teoria` con el mismo peso, ejecutados por la firma contratista de
principio a fin, culminando en resoluciones firmadas y acta de liquidación.

El propietario fija un destinatario distinto: **ceder la aplicación a los hospitales** para que la
usen ellos. Y un objetivo concreto, en sus palabras:

> «solicitar la información de los activos, calcular la depreciación, decir cuáles se dan de baja y
> generar el informe con la entrega […] lo importante aquí es el cálculo de la depreciación de los
> bienes, eso sí, de manera organizada».

Más un defecto de uso observado: **las plantillas Excel que hay que diligenciar no se pueden obtener
desde la aplicación**. Hoy viven en una carpeta del repositorio; un hospital que reciba solo el
instalador no tiene forma de conseguirlas. `ANEXO_A` §6.1 ya lo exigía —"ofrecer la descarga de cada
plantilla en blanco, ya parametrizada con los catálogos de la entidad"— y el plan lo tenía en el hito
G, es decir, tarde.

Eso cambia tres cosas de fondo:

| | Plan original | Reenfoque |
|---|---|---|
| **Quién la usa** | La firma contratista | El personal del hospital |
| **Qué la hace valiosa** | Cubrir los 11 pasos del contrato | Que el cálculo de depreciación sea correcto y esté ordenado |
| **Cuándo aporta valor** | Al final, con el expediente completo | En cuanto el hospital obtiene su listado depreciado y sus candidatos a baja |

Un usuario que no es consultor no tolera una interfaz de 11 pasos con 52 pantallas para obtener lo
que necesita. Y una aplicación que no entrega sus propias plantillas no se puede usar sin
acompañamiento — justo lo contrario de "cederla".

### Alternativas

| Opción | Veredicto |
|---|---|
| **Seguir el plan original** y ordenar la interfaz al final | **Descartado.** Aplaza el valor real (el cálculo) detrás del paso 04, que es el más costoso y el que menos necesita un hospital que solo quiere depreciar. Y deja el defecto de las plantillas sin resolver durante meses |
| **Recortar `/especificacion/teoria`** a los pasos del núcleo y descartar el resto | **Descartado.** `/especificacion/teoria` es la especificación autoritativa y describe un proceso real que las entidades deben cumplir. Borrar la conciliación o los actos administrativos convertiría la aplicación en una calculadora sin respaldo normativo, y cerraría la puerta al uso contractual que ya está construido a medias |
| **Reordenar por valor: un núcleo que se usa solo, y extensiones sobre él** | **Elegido** |

### Decisión

**Se reorganiza el trabajo en un NÚCLEO y unas EXTENSIONES.** `/especificacion/teoria` no se toca: sigue siendo la
especificación completa y los 380 requisitos siguen trazados. Lo que cambia es qué se construye
primero y cómo se presenta.

#### El núcleo — "el camino del cálculo"

Es el recorrido que un hospital puede completar solo, sin consultor, y que le entrega algo utilizable:

```
1. Configurar        la entidad, sus clases de activo y su vida útil, el método de conteo
2. Obtener           las plantillas Excel, DESDE LA APLICACIÓN, con sus catálogos ya puestos
3. Importar          el inventario con sus datos económicos (fecha y costo de adquisición)
4. Calcular          depreciación y obsolescencia, con el método que el contador confirmó
5. Revisar           qué bienes son candidatos a baja, y por qué
6. Entregar          el informe: listado depreciado, bajas propuestas y resumen por subcuenta
```

Cubre los pasos **01, 02, 03, 05, 06** de `/especificacion/teoria` y la parte de decisión técnica del **09**.

#### Las extensiones

Siguen en el plan, con sus tareas intactas, y se construyen **después** del núcleo:

| Extensión | Pasos | Para quién |
|---|---|---|
| Conciliación físico-contable | 04 | Entidades que además deben cuadrar contra sus libros |
| Valuación técnica de muebles | 07 | Cuando hay que reexpresar a valor razonable |
| Inmuebles y avalúos | 08 | Entidades con predios en el ejercicio |
| Comité, resoluciones y consolidación | 09 completo, 10 | Saneamiento contable formal |
| Entrega contractual y cierre | 11 | Contratos de consultoría |

#### Consecuencias sobre la interfaz

1. **La navegación deja de ser "11 pasos"** y pasa a ser el recorrido de 6 etapas del núcleo. Las
   extensiones aparecen agrupadas aparte, no intercaladas en el camino principal.
2. **Las plantillas se descargan desde la aplicación**, parametrizadas con los catálogos del hospital.
   Deja de ser tarea del hito G y pasa a ser lo primero.
3. **Una sola pantalla de importación**, que reconoce qué plantilla se le entrega en vez de obligar a
   elegirla de una lista.
4. Se conserva sin excepción todo lo que protege la evidencia contable: bitácora, justificación en
   campos sensibles, inmutabilidad del ejercicio cerrado, `INT-01`…`INT-10`. **La simplicidad es de
   la interfaz, no de las reglas.**

#### Lo que NO cambia

- `/especificacion/teoria` v2.1 sigue mandando, y `ANEXO_C` sigue prevaleciendo en el motor de cálculo.
- El dinero sigue siendo entero de centavos; el motor sigue siendo dominio puro (ADR-006, D-2).
- Ningún valor esperado de los tests del motor se modifica sin justificarlo en la bitácora (`RG-01`).
- Las 25 ADR anteriores siguen vigentes.

### Consecuencias negativas, admitidas

- **El paso 04 (conciliación) se aplaza**, y con él el cuadre en tres niveles. Una entidad que
  necesite saneamiento contable formal no podrá cerrarlo con esta versión. Es deliberado: sin el
  cálculo correcto, la conciliación no tiene contra qué cuadrar.
- Parte del trabajo del hito C ya hecho (`<TablaDatos>`, validaciones) se aprovecha entero, pero el
  **orden** del backlog cambia y algunas tareas del hito D y G suben al frente. Los identificadores
  `T-*` **no se renumeran** (regla del proyecto): cambia su prioridad, no su nombre.
- La aplicación entregará informes útiles antes de tener el expediente completo. Debe quedar
  explícito en el propio informe qué alcance cubre, para que nadie lo presente como saneamiento
  contable terminado.

### Cuándo reconsiderarla

Si un hospital exige el expediente contractual completo antes de que el núcleo esté cerrado, se
prioriza esa extensión para ese cliente — pero no se altera el orden general sin un ADR nuevo.

---

## ADR-027 · El catálogo de responsables se retira; firman el Gerente y el Contador

**Fecha:** 2026-09-04 · **Estado:** Aceptada · **Sustituye parcialmente a:** ADR-016

### Contexto

El propietario pidió que la aplicación fuera «lo más sencilla posible» y, en concreto, **«no quiero
responsables ni nada por el estilo»**. Antes de aceptar o rechazar la petición se verificó qué exige
realmente la norma colombiana (ver `/especificacion/normatividad`, fichas 03 y 05):

- La **Resolución 193 de 2016 (CGN)**, numeral 3.2.2, menciona el **Comité Técnico de Sostenibilidad
  Contable** como *herramienta de mejora continua*. **No lo exige ni detalla su integración.**
- Ninguna norma consultada exige un **catálogo de personas con perfiles** (especialista biomédico,
  perito, almacenista…). Eso era una conveniencia de gestión heredada de `ANEXO_B` §7.2.
- Lo que la norma **sí** asigna (numeral 1.1) es responsabilidad nominal: el **representante legal**
  responde del control interno contable y el **contador** del proceso contable.

La petición del propietario es, por tanto, compatible con la norma **si y solo si** el informe sigue
saliendo firmado por esas dos personas. Un informe de saneamiento sin firma responsable no es
defendible ante una contraloría; pero para tener esa firma no hacía falta nada de lo que existía.

### Decisión

1. **Se retira el catálogo de responsables** del producto: sus cuatro canales IPC
   (`responsable:listar|crear|actualizar|desactivar`), su módulo, su DTO y su pantalla.
2. **La entidad gana dos campos**: `nombre_contador` y `tarjeta_profesional_contador`. Junto al
   `nombre_gerente` que ya existía, son los **dos firmantes del informe**.
3. **Nada vuelve a pedir elegir a una persona.** Crear un ejercicio y proponer una baja dejan de
   preguntarlo: se atribuyen al representante legal, que ya está en los datos de la entidad.
4. **La tabla `responsable` permanece en la base**, degradada a detalle interno de integridad
   referencial. Un repositorio interno (`firmanteRepo`) mantiene **exactamente dos filas por
   entidad** —GERENTE y CONTADOR—, derivadas de los campos de la entidad y sincronizadas cada vez
   que estos cambian. No hay pantalla, ni canal, ni catálogo.

### Por qué la tabla sobrevive

**Catorce columnas del esquema apuntan a `responsable`**: `ejercicio.creado_por_responsable_id`,
`propuesta_baja.especialista_id`, las actas del Comité, el cierre, la consolidación, los avalúos de
inmuebles. SQLite **no permite eliminar una columna que participa en una clave foránea** —se
comprobó—, así que retirarla obligaría a reconstruir catorce tablas, con sus disparadores, sobre
bases que ya contienen datos de hospitales reales. El precio es alto y lo que se compra es
invisible para el usuario.

Además, las extensiones aún no construidas —Comité, resoluciones, entrega contractual— necesitan
esas claves intactas. Degradar la tabla en vez de destruirla deja el camino abierto sin cobrarle
nada al hospital hoy.

**Se admite que esto es un compromiso**, y por eso queda escrito: existe un concepto en la base que
no existe en el producto. Quien lea el esquema debe saber por qué.

### Consecuencias

- La interfaz pierde una sección entera y dos preguntas obligatorias del recorrido.
- El bloque de firmas del informe pasa de tres columnas (una en blanco) a **dos con nombre propio**.
- `ANEXO_B` §7.2 y `TR-12` quedan **NO IMPLEMENTADOS**, como ya ocurría con `RF-02-01`/`RF-02-02` por
  ADR-015. `/especificacion/teoria` **no se modifica**: sigue describiendo el proceso completo; lo que cambia es el
  alcance del producto.
- Si un hospital necesita atribuir firmas a varios especialistas —el día que exista el Comité—,
  habrá que reintroducir la administración de esas filas. La base ya está preparada; el producto no.

### Cuándo reconsiderarla

Cuando se construya la extensión del Comité y las resoluciones (pasos 09-10), que sí exige actas
firmadas por varias personas distintas del Gerente. Entonces se abre un ADR nuevo.

---

## ADR-028 · El proceso se desacopla: inventario vivo, cálculo por cortes y sin trámites externos

**Fecha:** 2026-09-24 · **Estado:** Aceptada · **Decidido por:** el propietario del proyecto
**Sustituye a:** el ejercicio de valuación como unidad de trabajo (ADR-026 §núcleo, ADR-017 en su
objeto, ADR-027 en el bloque de firmas). **Retira:** las extensiones de ADR-026.

### Contexto

El propietario fija el uso real de la aplicación, en sus palabras:

> «darle esta app a la persona del hospital que maneje esto, y que pueda hacer el proceso cuando
> desee […] hay cosas externas que no quiero que el software esten determinadas, yo solo quiero
> que la persona haga el barrido de las cosas que hay, y el software calcule lo que tenga que
> calcular».

Y decide tres cosas concretas: **ningún hospital tiene todavía la aplicación**, **las extensiones
se borran** y **el informe se genera al final, sin firmas**.

El modelo vigente no encajaba con eso. Todo colgaba de un **ejercicio**: un expediente con siete
estados (ABIERTO → … → CERRADO), un paso actual de 1 a 11, número de contrato y un responsable que
«firmaba el acta de parametrización». Los bienes pertenecían al ejercicio, así que **valorar otra vez
obligaba a abrir uno nuevo y reimportar el inventario desde cero**. Y varias cosas externas
bloqueaban el trabajo: el cálculo se negaba a correr sin un acta del contador (`VAL-01-07`), una baja
no podía ejecutarse sin el acta del Comité (`INT-07`), y 58 validaciones decidían si se podía pasar
de un paso al siguiente.

### Alternativas

| Opción | Veredicto |
|---|---|
| **Conservar el ejercicio y solo quitarle los bloqueos** | **Descartado.** Deja el defecto de fondo: el inventario sigue atado a un expediente y cada valuación empieza de cero |
| **Ejercicios independientes y desechables** | **Descartado.** Resuelve los bloqueos pero no la continuidad: el hospital vuelve a importar todo cada vez |
| **Inventario vivo de la entidad + cortes de cálculo** | **Elegido** |

### Decisión

1. **El inventario es de la entidad, no de un ejercicio.** `bien.entidad_id` sustituye a
   `bien.ejercicio_id`; código y placa son únicos dentro de la entidad.
2. **Cada importación de `PL-03` es un barrido** (tabla `barrido`, inmutable). Un barrido agrega
   los bienes nuevos, **actualiza** los que ya existían (mismo código institucional) y marca como
   `NO_ENCONTRADO` los que estaban registrados en un servicio que el archivo **sí** recorre pero no
   aparecen en él. Los servicios que el archivo no menciona no se tocan: un barrido parcial es
   legítimo.
3. **El estado del bien se reduce a tres**, en un catálogo propio de la aplicación (`ESTADO_BIEN`):
   `ACTIVO`, `NO_ENCONTRADO`, `DADO_DE_BAJA`. `ESTADO_REGISTRO` de `ANEXO_B` §6.2 se conserva
   declarado como reflejo literal de la teoría, sin uso.
4. **El cálculo se hace por cortes** (tabla `corte`). El hospital elige una fecha y calcula; cada
   corrida guarda una copia de los parámetros vigentes (RN-01-01), sus resultados y **sus
   exclusiones con motivo** (tabla `calculo_exclusion`, regla 11). Ningún corte pisa a otro y
   ninguno se modifica —un disparador lo impide—; el que sobra se elimina entero.
5. **Las bajas se registran, no se tramitan** (tabla `baja`). El cálculo señala candidatos con su
   motivo, que queda guardado con el corte. El hospital registra la baja que decidió por su propio
   trámite, con causal, fecha, justificación individual (RN-09-06) y, si quiere, el número del
   documento que la aprobó. Una baja equivocada **se anula** con motivo; no se borra.
6. **El informe es de un corte y no lleva firmas.** Dice lo que ese corte calculó, así que
   regenerarlo meses después da el mismo documento.
7. **Se retiran** los estados del ejercicio, el paso actual, el contrato, la confirmación por acta
   del método de conteo (`metodo_conteo_meses_confirmado`), la tabla `responsable` y los campos del
   contador, las propuestas de baja con su máquina de estados, el reconocimiento de deterioro y las
   extensiones completas: conciliación (paso 04), valuación de muebles (07), inmuebles (08), Comité
   y actos administrativos (10) y entrega y cierre (11). Del esquema salen 26 de sus 44 tablas.
8. **La revisión de validaciones queda en la configuración**: las cinco bloqueantes y dos
   advertencias de `VAL-01-*` que no dependen de un ejercicio ni de un documento externo. La calidad
   del inventario la vigilan el importador, fila por fila, y el cálculo, que dice qué dejó fuera.
9. **La aplicación entrega solo las cinco plantillas** que se diligencian e importan (`PL-01`,
   `PL-02`, `PL-02b`, `PL-03`, `PL-05`). Las otras 23 siguen en `especificacion/plantillas` como
   referencia.
10. **Las migraciones se regeneran desde cero** (`0000`–`0002`): ningún hospital tiene datos, y
    reconstruir 26 tablas por migración sería código que nadie va a ejecutar.

### Relación con `/especificacion/teoria`

**No se modifica.** Sigue siendo la descripción completa del proceso de saneamiento y la fuente de
las fórmulas: `ANEXO_C` manda en todo lo que el motor calcula, y **el motor no cambió ni un
carácter**; los casos de verificación pasan con los mismos valores esperados (regla 8). Lo que cambia
es el **alcance del producto**: la aplicación implementa el cálculo y lo que lo alimenta, y deja
fuera los trámites que el hospital hace por su cuenta. Los requisitos retirados se marcan
`FUERA_DE_ALCANCE (ADR-028)` en `app/docs/trazabilidad.csv`, igual que ADR-015 hizo con la captura
en campo.

### Consecuencias negativas, admitidas

- **El informe sin firmas no es, por sí solo, un soporte de saneamiento.** ADR-027 lo decía: ante
  una contraloría hace falta la firma del representante legal y del contador (Res. 193/2016 §1.1).
  Esa firma ahora va **en el acto del hospital que adopta el informe**, no en el informe. Quien
  use la aplicación tiene que saberlo; el informe lo dice en su propio texto.
- **El deterioro no se calcula.** Exige indicios y un avalúo que la aplicación no hace (Guía 003
  de la CGN). El informe lo declara en vez de mostrar un cero sin explicación.
- **Una base creada antes de ADR-028 no abre.** Su versión de esquema es 4 y la de la aplicación
  es 3; el migrador la rechaza. Como ningún hospital tiene datos, basta con borrar la carpeta de
  datos de desarrollo. Si algún día existiera una base real de ese tiempo, haría falta un
  migrador de rescate.
- **La trazabilidad deja de cubrir** la conciliación, los avalúos, el Comité y el cierre. Es el
  precio de un producto que un hospital usa solo.

### Cuándo reconsiderarla

Si un hospital necesita que la aplicación lleve el expediente completo del saneamiento —con actas,
resoluciones y firmas dentro—, o si un cliente contractual vuelve a pedir los 11 pasos. Entonces se
abre un ADR nuevo; `/especificacion/teoria` ya tiene todo lo necesario.

---

## ADR-029 · El proceso de valuación es la unidad principal, y cada uno es independiente

**Fecha:** 2026-09-24 · **Estado:** Aceptada · **Decidido por:** el propietario del proyecto
**Sustituye a:** en ADR-028, el inventario vivo **de la entidad** (§1) y los cortes a la fecha que se
quiera (§4). Se mantiene todo lo demás de ADR-028: barridos, bajas que solo se registran, informe sin
firmas, alcance del producto.

### Contexto

El mismo día de ADR-028, al ver la aplicación, el propietario pide:

> «quita el tema de la entidad y quiero que lo principal sea un proceso, es decir lo primero que yo
> debería ver es continuar con un proceso o seguir con uno que ya esté activo; los procesos deben
> ser independientes».

Y resuelve las cuatro dudas que eso abre: **los datos del hospital viven dentro de cada proceso**;
un proceso **termina con un botón «Finalizar»** y queda de solo lectura; **una fecha de corte por
proceso** (recalcular reemplaza el cálculo anterior), y **cada proceso nuevo importa su inventario de
cero**.

Con ADR-028 la pantalla inicial era una lista de entidades; de la entidad colgaban un inventario que
se iba actualizando y cualquier cantidad de cortes a cualquier fecha. Para quien usa la aplicación,
eso no respondía a la pregunta que se hace al abrirla: *¿en qué valuación voy?*

### Decisión

1. **La tabla `entidad` se sustituye por `proceso`.** Un proceso tiene nombre, **fecha de corte**,
   estado (`EN_CURSO` → `FINALIZADO`, `MAQUINA_PROCESO`) y fecha de finalización, además de los
   datos del hospital (IN-01-01). Todo lo que antes colgaba de la entidad —sedes, servicios,
   clases, parámetros, convención, barridos, bienes— cuelga ahora del proceso (`proceso_id`). El
   NIT deja de ser único: dos procesos del mismo hospital son dos valuaciones.
2. **Los procesos son independientes.** Nada se comparte ni se copia entre ellos: un proceso nuevo
   se configura e importa su inventario de cero (desaparece la clonación de parametrización,
   RF-01-09). La interfaz no recuerda un «proceso activo»: el proceso con el que se trabaja es
   siempre el de la ruta (`/proceso/:procesoId/...`).
3. **La pantalla inicial es la lista de procesos**: iniciar uno nuevo, continuar uno en curso o
   consultar uno finalizado. Dentro de un proceso, su **Resumen** dice en qué va (configurar,
   inventario, cálculo, bajas, informe) y ofrece **Finalizar**.
4. **Un cálculo por proceso, a su fecha de corte.** `calculo:ejecutar` ya no recibe fecha: calcula
   a la del proceso. Recalcular **reemplaza** el cálculo anterior (índice único
   `ux_corte_proceso`); cambiar la fecha de corte del proceso **descarta** el cálculo hecho, porque
   ya no es el suyo. Los cálculos siguen siendo inmutables mientras existen (ADR-028 §4); lo que
   cambia es que se reemplazan en vez de acumularse. La bitácora conserva cada corrida.
5. **Finalizar exige un cálculo** y deja el proceso **de solo lectura, garantizado por la base**:
   el generador de disparadores exige que toda tabla del esquema declare cómo llega a su proceso
   (`proceso_id` o una ruta indirecta) y emite, para cada una, disparadores que rechazan INSERT,
   UPDATE y DELETE cuando el proceso está `FINALIZADO` (ADR-017 sobre la nueva unidad). Una tabla
   nueva sin esa declaración rompe la construcción. El proceso de demostración se puede borrar
   aunque esté finalizado (T-B-11).
6. **Eliminar un proceso** solo se permite **en curso y sin inventario**. Un bien nunca se elimina
   físicamente (`RN-09-09`, `ANEXO_B` §4 e `INT-03`, que se conserva): en cuanto entra el primer
   barrido, el proceso ya no se borra. Uno finalizado tampoco: es evidencia de lo que se calculó.
7. **`PL-01` puede iniciar el proceso**, y para eso `fecha_corte_ejercicio` pasa a ser obligatoria
   (no futura). Sobre un proceso existente, la fecha de la plantilla no cambia la del proceso:
   si difiere, se advierte.
8. **Las migraciones se regeneran desde cero** otra vez (`0000`–`0002`), por la misma razón que en
   ADR-028: ningún hospital tiene datos.

### Relación con `/especificacion/teoria`

**No se modifica.** La teoría describe un ejercicio de valuación con una fecha de corte, que es
exactamente lo que ahora es un proceso: ADR-029 acerca el producto a la teoría en vez de alejarlo.
El motor no cambió; los valores esperados de las pruebas del cálculo siguen iguales (regla 8). Se
conservan `RN-09-09` e `INT-03`.

### Consecuencias negativas, admitidas

- **Valorar otra vez exige volver a cargar todo**, catálogo e inventario. Es lo que el propietario
  eligió («se importa de cero»): a cambio, ningún proceso puede alterar a otro.
- **Un proceso en curso con inventario cargado por error no se puede borrar**; queda en la lista
  hasta que alguien lo corrija o lo finalice. Es el precio de no borrar nunca un bien.
- **Una base creada con ADR-028 no abre** (misma situación que en ADR-028: basta con borrar la
  carpeta de datos de desarrollo).

### Cuándo reconsiderarla

Si los hospitales piden arrancar un proceso a partir del anterior (copiar catálogo o inventario),
se abre un ADR que lo haga **copiando**, nunca compartiendo: la independencia de los procesos es el
punto de esta decisión.

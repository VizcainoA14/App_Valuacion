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

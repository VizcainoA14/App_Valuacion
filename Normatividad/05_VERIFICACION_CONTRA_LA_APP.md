# 05 · Verificación: ¿lo que hace la aplicación es correcto?

Contraste entre lo verificado en las fichas 01-04 y lo que la aplicación y `/Teoria` implementan hoy.

**Veredicto corto: sí, el proceso está bien planteado.** No encontré ninguna contradicción entre lo
que hace el motor de cálculo y lo que exige la norma. Lo que aparecen son **cuatro puntos a
precisar**, ninguno de ellos un error de cálculo.

---

## 1. Lo que coincide

| Lo que exige la norma | Lo que hace la aplicación | |
|---|---|:-:|
| Marco contable de una E.S.E = Resolución 414 de 2014 | `ANEXO_D` §2.1 la registra como «Base contable de las E.S.E» | ✅ |
| Saneamiento = Ley 1739/2014 → 1753/2015 → **1819/2016 art. 355** → Res. 107/2017 | `ANEXO_D` §2.2 tiene la cadena completa y en orden | ✅ |
| Inventarios físicos periódicos (Res. 193/2016, num. 9) | Es el eje del proceso: paso 02 y formato `PL-03` | ✅ |
| Depuración contable **permanente**, no de una sola vez | Diseño por ejercicios repetibles | ✅ |
| Depreciación en línea recta sobre costo − valor residual | `RN-06-01`, `ANEXO_C` | ✅ |
| La depreciación acumulada no supera la base depreciable | `Teoria/06` §169, y el motor la topa | ✅ |
| Valor residual no se deprecia | Configurable, 0 % por defecto | ✅ |
| El método debe ser una decisión documentada de la entidad | Acta obligatoria antes de calcular (`Teoria/06` §46, `VAL-01-07`) | ✅ |
| Deterioro **solo con indicios**, nunca automático | El motor devuelve `NO_CALCULABLE` en vez de inventar un valor | ✅ |
| Vida útil revisable con concepto técnico | `vida_util_tecnica_override` con justificación obligatoria | ✅ |
| Trazabilidad de qué cambió y cuándo | Bitácora inmutable, `ANEXO_B` §7 | ✅ |
| La entidad decide la baja; el sistema no | La aplicación propone candidatos y no ejecuta bajas | ✅ |

**El punto que más me tranquiliza** es el de deterioro. Devolver `NO_CALCULABLE` con su motivo en
vez de un cero no era solo una decisión de ingeniería prudente: coincide con que el deterioro
**solo se reconoce cuando hay indicios y valor recuperable estimado**. Un cero habría sido afirmar
que no hay deterioro, que es una afirmación contable con consecuencias.

---

## 2. Lo que hay que precisar

### 2.1 ⚠️ El marco contable no es automático — hay que confirmarlo por hospital

Una E.S.E puede estar clasificada como **empresa** (Res. 414) o como **entidad de gobierno**
(Res. 533), y lo decide el Comité Interinstitucional de la Comisión de Estadísticas de Finanzas
Públicas. Cambia el Catálogo General de Cuentas, y con él las subcuentas de `PL-02`.

**Recomendación:** que la pantalla de la entidad pida cuál marco aplica, con un enlace a la lista de
la CGN, y que el informe lo declare. Es un campo, no un módulo.

Ver [01_MARCO_CONTABLE_APLICABLE.md](01_MARCO_CONTABLE_APLICABLE.md).

### 2.2 ⚠️ Las vidas útiles precargadas son sugerencias, y deben verse como tales

La norma dice que **la entidad define** la vida útil. Las semillas (180 meses para equipo
médico-científico, 60 para cómputo…) son un punto de partida, no una tabla oficial.

El archivo de semillas ya lo advierte. **La interfaz no.** Un hospital que acepte los valores por
defecto sin contrastarlos con su Manual de Políticas Contables está firmando cifras que no decidió.

**Recomendación:** que la pantalla de clases diga, visible, que esos valores deben validarse contra
el Manual de Políticas Contables.

### 2.3 ❓ El fundamento jurídico del acto administrativo

El art. 355 de la Ley 1819 de 2016 está redactado para **entidades territoriales**. Una E.S.E es una
entidad descentralizada, no un municipio.

**Recomendación:** que el fundamento normativo del informe y de las resoluciones sea un **campo
configurable por ejercicio** —como `ANEXO_D` §1 ya pide— y no texto fijo en el código. La elección
del fundamento es del abogado o del contador del hospital, no del programa.

### 2.4 ❓ Subcuentas contables sin verificar

No contrasté los códigos que usa la aplicación (1605, 1640, 1655, 1660, 1665, 1670, 1675, 1680)
contra el Catálogo General de Cuentas vigente. Van como sugerencia editable, que es lo correcto,
pero **nadie los ha verificado todavía**.

---

## 3. Sobre eliminar los «responsables»

**La norma no exige un catálogo de responsables con perfiles.** El Comité Técnico de Sostenibilidad
Contable aparece en la Resolución 193 de 2016 como *herramienta* sugerida, no como obligación.

Lo que sí asigna la norma (num. 1.1) es responsabilidad nominal:

- **Representante legal** (Gerente) → responsable del control interno contable.
- **Contador** → responsable del proceso contable.

**Conclusión: se puede eliminar el catálogo de responsables y perfiles.** Lo que no debería
desaparecer es que el informe salga **firmado por el Gerente y el Contador**, con nombre y cargo.
Eso se resuelve con **dos campos de texto en los datos de la entidad**, no con un módulo.

Un informe de saneamiento sin firma responsable no es un documento defendible ante una contraloría.
Pero para tener esa firma no hace falta nada de lo que hoy existe.

Ver [03_CONTROL_INTERNO_Y_DEPURACION.md](03_CONTROL_INTERNO_Y_DEPURACION.md) §4 y §5.

---

## 4. Lo que esta verificación **no** cubre

Para no dar más certeza de la que hay:

- No verifiqué la **vigencia actual** de ninguna de las normas citadas. Varias son de 2014-2017 y el
  marco contable público se modifica con frecuencia.
- No leí el **anexo normativo original** de las resoluciones 414 y 533 (PDF no procesables); lo de
  depreciación y vida útil viene de políticas contables de entidades públicas que lo citan.
- No revisé **conceptos de la CGN posteriores a 2020** ni jurisprudencia.
- No verifiqué el **Catálogo General de Cuentas**.
- No consulté normativa específica del **sector salud** sobre baja de equipos biomédicos
  (INVIMA, Decreto 4725 de 2005), que puede añadir requisitos a la baja de equipo médico.

**Nada de esto es un aval jurídico.** Antes de que un hospital firme una resolución con estas
cifras, un contador público y un abogado deben revisar el fundamento normativo.

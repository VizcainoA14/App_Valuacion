# 04 · Depreciación, vida útil, valor residual y deterioro

> **Lo que hay que retener:** lo que calcula el motor de la aplicación —línea recta, tope en la base
> depreciable, deterioro solo con indicios— coincide con lo que exige la CGN. El punto flojo no está
> en la fórmula sino en **quién fija la vida útil y cada cuánto se revisa**.

---

## 1. Método de depreciación

⚠️ **Indirecto** (tomado de políticas contables de entidades públicas que citan el Marco Normativo;
no pude leer el anexo original de la CGN, que está en PDF ilegible por medios automáticos).

*«El método de depreciación aplicado es el de línea recta, el cual consiste en determinar una
alícuota periódica constante que se obtiene de dividir el costo histórico del activo entre la vida
útil.»*

**Importe depreciable** = costo del activo − valor residual.
**Depreciación** = distribución sistemática del importe depreciable a lo largo de la vida útil.

> **Matiz que conviene no perder.** El marco contable pide que el método **refleje el patrón de
> consumo** de los beneficios económicos o del potencial de servicio del activo. La línea recta es
> el método habitual y el que casi toda entidad pública adopta, pero es una **elección de política
> contable de la entidad**, no una imposición universal.
>
> Por eso el diseño de la aplicación acierta al exigir un **acta que fije expresamente el método**
> (`especificacion/teoria/06` §46) antes de dejar calcular. No es burocracia: es la constancia de que la entidad
> tomó esa decisión.

---

## 2. Vida útil

⚠️ **Indirecto.** *«La vida útil de un activo depreciable o amortizable debe definirse por parte de
la entidad contable pública, considerando los beneficios económicos futuros o el potencial de
servicio del activo. Esta estimación debe ser **revisada anualmente**, de forma que si las
expectativas difieren significativamente de las estimaciones previas, podría fijarse una vida útil
diferente.»*

Y sobre cómo se revisa: *«se solicitará concepto al área técnica para que realice la evaluación del
estado y condiciones relativas a los beneficios económicos o potencial de servicio por el uso de los
bienes»*.

**Dos consecuencias concretas:**

1. **La vida útil la fija la entidad, no una tabla universal.** Las vidas útiles precargadas de la
   aplicación (180 meses para equipo médico-científico, 60 para cómputo…) son **sugerencias** que
   cada hospital debe validar contra su Manual de Políticas Contables. La aplicación ya lo dice así
   en la semilla `clases_sugeridas.json`; conviene que la interfaz lo repita.
2. **La revisión es anual y con concepto técnico.** Esto respalda el campo
   `vida_util_tecnica_override` con justificación obligatoria que la aplicación ya pide.

---

## 3. Valor residual

⚠️ **Indirecto.** *«Es el valor por el cual se calcula que se venderá el activo al final de su vida
útil, ya sea como chatarra o repuestos. **El valor residual no se deprecia.**»*

La aplicación usa **0 %** por defecto (`ANEXO_C` §210) y lo deja configurable. Es coherente: 0 % es
la política más común en el sector público, y al ser configurable la entidad puede fijar otra.

---

## 4. Deterioro del valor

✅ **Verificado** en la Guía de Aplicación N.º 003 de la CGN (documento oficial).

- **El valor recuperable** *«se mide como el mayor entre el valor razonable menos los costos de
  disposición y el valor en uso»*.
- **El deterioro no se reconoce automáticamente:** *«el deterioro se reconoce solo cuando existen
  indicios que sugieren que el activo podría estar deteriorado»*.
- La guía distingue indicios **internos** (daño físico, obsolescencia, cambios en el uso) y
  **externos** (caída de valor de mercado, cambios tecnológicos, legales o económicos).

> **Este es el punto más delicado del proceso, y conviene decirlo sin adornos.** El deterioro exige
> estimar un *valor recuperable*, que es un juicio técnico y económico sobre cada bien. Un programa
> puede señalar **indicios** —edad, estado físico, obsolescencia— y puede aplicar la fórmula una vez
> que alguien le da el valor recuperable. **Lo que no puede es estimar el valor recuperable solo.**
>
> La aplicación se comporta bien aquí: cuando no tiene los datos devuelve `NO_CALCULABLE` con su
> motivo en vez de un cero. Esa decisión de diseño resulta estar alineada con la norma, porque
> reconocer un deterioro sin sustento es tan incorrecto como no reconocerlo.

---

## 5. Baja en cuentas

❓ **No verificado en fuente oficial.** No conseguí el texto del numeral sobre baja en cuentas de
PPE. El principio general del marco es que un activo se da de baja cuando **se dispone de él o
cuando no se espera obtener beneficios económicos futuros ni potencial de servicio** por su uso o
disposición.

Esto respalda el diseño en dos sentidos:

- La aplicación **propone candidatos** a baja a partir de criterios objetivos (estado, obsolescencia,
  depreciación total), pero **no ejecuta la baja**.
- La baja efectiva requiere decisión administrativa y su acto correspondiente.

---

## Fuentes

- [Guía de Aplicación N.º 003 — Deterioro del valor de PPE (CGN)](https://www.contaduria.gov.co/documents/20127/36023/Versi%C3%B3n+1+(15_06_2017)/68554ed4-d107-fe90-531f-9ebc3232fbda)
- [Guía de Aplicación N.º 004 — Depreciación por componentes y sustitución (CGN)](https://www.contaduria.gov.co/documents/20127/36023/Versi%C3%B3n+1+(07-12-2017)/333da342-5484-d90b-ff5b-233945516380)
- [Doctrina Contable Pública Compilada (CGN, 2019)](https://www.contaduria.gov.co/documents/20127/124398/DOCTRINA+CONTABLE+P%C3%9ABLICA+2019.pdf/2fee27ee-9143-0de1-e137-8146564ef044)
- [Política contable de PPE — CRA Autónoma](https://www.crautonoma.gov.co/intranet/documentos/procesos/2295-202411251125936084100.pdf)
- [Políticas contables actualizadas 2024 (Res. 285 CGN) — Cámara de Representantes](https://www.camara.gov.co/wp-content/uploads/2025/03/POLITICAS-CONTABLES-ACTUALIZADAS-2024_CR_-RES-285-DE-LA-CGN.pdf)

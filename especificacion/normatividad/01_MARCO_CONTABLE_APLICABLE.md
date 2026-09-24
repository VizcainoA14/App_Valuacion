# 01 · Qué marco contable rige a una E.S.E

> **Lo que hay que retener:** no se puede dar por sentado. Una E.S.E aplica la **Resolución 414 de
> 2014** o la **Resolución 533 de 2015** según cómo la haya clasificado un comité del Estado, y esa
> clasificación cambia el Catálogo General de Cuentas que debe usar.

---

## 1. Los dos marcos

La Contaduría General de la Nación (CGN) partió el Régimen de Contabilidad Pública en marcos
distintos según el tipo de entidad:

| Marco | Norma | A quién aplica |
|---|---|---|
| **Empresas que no cotizan en el mercado de valores y no captan ni administran ahorro del público** | Resolución 414 de 2014 | Empresas estatales — 47 del orden nacional y 1.675 del territorial en el censo inicial |
| **Entidades de Gobierno** | Resolución 533 de 2015 | Entidades clasificadas como «de gobierno» |

✅ **Verificado.** La Resolución 414 de 2014 dice expresamente que *«las empresas que conforman el
Sistema General de Seguridad Social en Salud (SGSSS) podrán aplicar el Marco normativo anexo a la
presente resolución»*, con un período de transición entre el 1.º de enero y el 31 de diciembre de
2016. Las E.S.E forman parte del SGSSS.

---

## 2. Quién decide cuál aplica — y por qué esto importa

✅ **Verificado en el sitio de la CGN.** La entidad no elige. La CGN publica la lista de entidades
sujetas a cada marco *«atendiendo la clasificación de las entidades emitida por el **Comité
Interinstitucional de la Comisión de Estadísticas de Finanzas Públicas** conforme a los criterios
establecidos en el manual de Estadísticas de las Finanzas Públicas»*.

El criterio de fondo es si la entidad es **productora de mercado** (se financia con la venta de sus
servicios a precios económicamente significativos → *empresa*) o **no de mercado** (se financia
principalmente con recursos públicos → *entidad de gobierno*).

**Por eso una E.S.E puede caer en cualquiera de los dos lados.** Un hospital que vive de la venta de
servicios a las EPS tiende a quedar como empresa (414); uno sostenido con transferencias tiende a
quedar como entidad de gobierno (533).

❓ **Por confirmar por cada hospital.** La lista oficial está publicada en la CGN — hay más de 100
documentos, uno por corte, desde 2015. **El hospital debe localizarse en esa lista antes de
diligenciar nada**, porque de ahí cuelgan las subcuentas contables del formato `PL-02`.

---

## 3. Qué significa esto para el proceso

Lo que cambia entre un marco y otro:

- **El Catálogo General de Cuentas.** Los códigos de subcuenta que el hospital escribe en `PL-02`
  (1605 terrenos, 1640 edificaciones, 1655 maquinaria, 1660 equipo médico-científico, 1665 muebles,
  1670 equipo de comunicación y cómputo, 1675 transporte, 1680 comedor y cocina) deben tomarse del
  catálogo del marco que le corresponda.
- **Algunos criterios de medición posterior.** El grueso —costo, depreciación, deterioro— es
  equivalente en ambos marcos, pero la redacción y las excepciones difieren.

Lo que **no** cambia:

- La obligación de tener el inventario físico conciliado con contabilidad.
- La depreciación sistemática a lo largo de la vida útil.
- La depuración contable permanente.

---

## 4. Qué dice hoy la documentación de la aplicación

`especificacion/teoria/ANEXO_D_MARCO_NORMATIVO.md` §2.1 ya registra:

| Norma | Cómo la clasifica `/especificacion/teoria` |
|---|---|
| Resolución 414 de 2014 | **«Base contable de las E.S.E»** |
| Resolución 533 de 2015 | «Referencia» |

**Es la elección correcta como valor por defecto**, y coincide con lo verificado. Lo que le falta es
la advertencia de que la clasificación es por entidad y la decide el Comité Interinstitucional: un
hospital clasificado como entidad de gobierno tendría que usar el otro catálogo.

Ver la ficha [05_VERIFICACION_CONTRA_LA_APP.md](05_VERIFICACION_CONTRA_LA_APP.md) §1.

---

## Fuentes

- [Resolución 414 de 2014 (CGN) — Gestor Normativo CRA](https://normas.cra.gov.co/gestor/docs/resolucion_contaduria_0414_2014.htm)
- [Entidades sujetas al ámbito de la Resolución 414/2014 — CGN](https://www.contaduria.gov.co/entidades-sujetas-al-ambito-de-la-resolucion-no-414-2014-y-sus-modificaciones)
- [Entidades sujetas al ámbito de la Resolución 533/2015 — CGN](https://www.contaduria.gov.co/entidades-sujetas-al-ambito-de-la-resolucion-no-533-2015-y-sus-modificaciones)
- [Marco Normativo para Empresas que no Cotizan en el Mercado de Valores — CGN](https://www.contaduria.gov.co/marco-normativo-para-empresas-que-no-cotizan-en-el-mercado-de-valores-y-que-no-captan-ni-administran-ahorro-del-publico)
- [1.722 empresas estatales obligadas a aplicar la Resolución 414 de 2014 — INCP](https://incp.org.co/publicaciones/infoincp-publicaciones/informacion-para-empresas/contable/2015/12/1-722-empresas-estatales-estarian-obligadas-a-aplicar-el-marco-normativo-presentado-en-la-resolucion-414-de-2014/)

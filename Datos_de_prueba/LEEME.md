# Datos de prueba — E.S.E. HOSPITAL SANTA ANA DE GUARNE

> **Hospital ficticio.** Ningún dato de esta carpeta corresponde a una entidad real.
> Se genera con `npm run datos:prueba` desde `/app`, a partir de las plantillas
> reales de `Plantillas_Valuacion_Activos/excel`.

| Dato | Valor |
|---|---|
| Razón social | E.S.E. HOSPITAL SANTA ANA DE GUARNE |
| NIT | 890905137-4 |
| Municipio | GUARNE, ANTIOQUIA |
| Nivel de complejidad | II |
| Fecha de corte | 2025-12-31 |
| Bienes | 41 en 2 sedes y 8 servicios |

> **¿Va a entregar los formatos a alguien para que los llene?** Léase primero
> [INSTRUCTIVO_DILIGENCIAMIENTO.md](INSTRUCTIVO_DILIGENCIAMIENTO.md): dice **cuáles
> de las 28 plantillas hay que llenar hoy** (son 5), columna por columna, con los
> valores admitidos y los errores que más se cometen.

---

## Cómo usarlo

### 1. Cree la entidad y el ejercicio (etapa 1)

En la aplicación: **Nueva entidad → Crear desde PL-01**, y elija
`01_caso_limpio/PL-01_parametros_entidad.xlsx`. La entidad nace del formato con
razón social, NIT, gerente y los parámetros de cálculo, sin teclear nada. Verá la
previsualización antes de que se cree.

(También puede teclear los datos a mano en el mismo asistente, y más tarde
importar el PL-01 desde *Entidad* para actualizarlos.)

Después, en el paso 01:

1. **Clases de activo** → importar `PL-02_clases_vida_util.xlsx`.
2. **Sedes y servicios** → importar `PL-02b_sedes_servicios.xlsx`.
3. **Parámetros** → marcar **"método de conteo confirmado por acta"**. Sin eso la
   aplicación se niega a calcular, y hace bien: es `VAL-01-07`. El acta no se
   hereda de un Excel.
4. **Ejercicio** → crearlo con fecha de corte **2025-12-31**.

> Al importar PL-01 verá una advertencia sobre `fecha_corte_ejercicio`: la fecha
> de corte se fija al crear el ejercicio, no desde la plantilla. Es correcto.

### 2. Importe el inventario (etapa 3)

En **3. Inventario → Importar**:

1. `PL-03_toma_inventario_fisico.xlsx` → 41 bienes.
2. `PL-05_hoja_de_vida.xlsx` → datos económicos, mantenimientos y los avalúos
   de reconocimiento inicial.

### 3. Calcule (etapa 4)

**4. Calcular → Calcular.** Debería ver:

- Los cuatro colores del semáforo poblados.
- Varios **candidatos a baja**: los que superaron su vida útil y los que están en
  mal estado pasado el umbral.
- En *"Qué quedó fuera del cálculo"*: el **terreno** (no depreciable) y el
  **ventilador en comodato** (no entra al patrimonio, `RN-02-04`).

### 4. Bajas e informe (etapas 5 y 6)

Cierre el inventario, proponga la baja de algún candidato con una justificación
individual, recorra la decisión del Comité y genere el PDF.

---

## Qué trae el caso limpio, a propósito

| Situación | Dónde | Para qué sirve |
|---|---|---|
| Bienes de 1998 a 2024 | todo el inventario | Que el semáforo muestre los cuatro colores |
| `HSA01CAH0009` inservible de 2008 | Hospitalización | Candidato a baja claro |
| `HSA01AGI0021` y `HSA01ESTE034` | Laboratorio y Mantenimiento | Correctivo **fallido** registrado: candidatos por ese criterio |
| `HSA01MIC0018` y `HSA01UPS0032` | sin fecha ni costo | Entran **INCOMPLETOS**; se resuelven con la hoja `SIN_SOPORTE` (`RN-03-04`) |
| `HSA01VEN0037` en comodato | Urgencias | No se deprecia: no es de la entidad (`RN-02-04`) |
| `HSA01TER0041` terreno | Administración | Clase no depreciable: aparece como **NO APLICA**, no como cero |
| 7 mantenimientos | `PL-05` | Alimentan `VAL-03-05` y el criterio de baja |

---

## Qué trae el caso con problemas

Sirve para ver **cómo informa la aplicación**, fila por fila. Impórtelo sobre una
entidad que ya tenga el catálogo del caso limpio.

### `PL-03` — 10 filas

| # | Defecto | Qué debe pasar |
|:-:|---|---|
| 1 | Ninguno | Entra |
| 2 | Código institucional repetido | **Error** · `RN-02-01` |
| 3 | Placa repetida | **Error** · `RN-02-01` |
| 4 | Clase que no está en el catálogo | **Error** · dice que la importe con PL-02 |
| 5 | Sede inexistente | **Error** · dice que la importe con PL-02b |
| 6 | Servicio que existe, pero en otra sede | **Error** · nombra la sede |
| 7 | Estado físico inventado | **Error** · lista los valores admitidos |
| 8 | Sin descripción funcional | **Error** · campo obligatorio vacío |
| 9 | Serie repetida | **Advertencia** · entra igual (`RN-02-05`) |
| 10 | Contado después del corte | **Advertencia** · entra igual |

Resultado esperado: **3 filas válidas, 7 con error**. La aplicación no importa
nada hasta que usted confirme explícitamente que quiere entrar solo las válidas.

### `PL-05` — 5 filas

| # | Defecto | Qué debe pasar |
|:-:|---|---|
| 1 | Código que no está en el inventario | **Error** · dice que importe PL-03 antes |
| 2 | Adquisición posterior al corte | **Error** · `VAL-03-02` |
| 3 | Costo en cero sin ser donación | **Advertencia** · se trata como dato faltante (`RN-03-02`) |
| 4 | Vida útil sobrescrita sin justificación | **Error** · `RN-03-06` |
| 5 | Estado operativo fuera del catálogo | **Error** · lista los admitidos |

---

## Regenerar

```
cd app
npm run datos:prueba
```

Los datos están en `app/scripts/generar-datos-prueba.ts`; edítelos ahí si quiere
otro hospital, más bienes u otros defectos.

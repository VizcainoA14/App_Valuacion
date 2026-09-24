# Datos de prueba — E.S.E. HOSPITAL SANTA ANA DE GUARNE

> **Hospital ficticio.** Ningún dato de esta carpeta corresponde a una entidad real.
> Se genera con `npm run datos:prueba` desde `/app`, a partir de las plantillas
> reales de `especificacion/plantillas/excel`.

| Dato | Valor |
|---|---|
| Razón social | E.S.E. HOSPITAL SANTA ANA DE GUARNE |
| NIT | 890905137-4 |
| Municipio | GUARNE, ANTIOQUIA |
| Nivel de complejidad | II |
| Fecha de corte (en PL-01) | 2025-12-31 |
| Bienes | 41 en 2 sedes y 8 servicios |

> **¿Va a entregar los formatos a alguien para que los llene?** Léase primero
> [INSTRUCTIVO_DILIGENCIAMIENTO.md](INSTRUCTIVO_DILIGENCIAMIENTO.md): explica las
> 5 plantillas columna por columna, con los valores admitidos y los errores que más
> se cometen.

---

## Cómo usarlo

### 1. Inicie el proceso (Configurar)

Lo primero que muestra la aplicación son los **procesos de valuación**. Pulse
**Iniciar un proceso nuevo → Crear desde PL-01**, y elija
`01_caso_limpio/PL-01_parametros_entidad.xlsx`. El proceso nace del formato con
razón social, NIT, gerente, **fecha de corte** y parámetros de cálculo, sin teclear
nada. Verá la previsualización antes de que se cree.

(También puede teclear los datos a mano en el mismo asistente —nombre del proceso,
fecha de corte y datos del hospital—, y más tarde importar el PL-01 desde
*Configurar → Proceso y hospital* para actualizarlos.)

Después, en **Configurar**:

1. **Clases de activo** → importar `PL-02_clases_vida_util.xlsx`.
2. **Sedes y servicios** → importar `PL-02b_sedes_servicios.xlsx`.

> Cada proceso es independiente: si inicia otro con el mismo PL-01, tendrá que
> cargarle su propio catálogo e inventario.

### 2. Cargue el inventario (Inventario)

En **Inventario → Cargar**:

1. `PL-03_toma_inventario_fisico.xlsx` → el primer barrido: 41 bienes.
2. `PL-05_hoja_de_vida.xlsx` → datos económicos, mantenimientos y los avalúos
   de reconocimiento inicial.

### 3. Calcule (Calcular)

Pulse **Calcular 41 bienes al 31/12/2025**: la fecha es la del proceso. Debería ver:

- Los cuatro colores del semáforo poblados.
- Varios **candidatos a baja**: los que superaron su vida útil y los que están en
  mal estado pasado el umbral.
- En *"Qué quedó fuera del cálculo"*: el **terreno** (no depreciable) y el
  **ventilador en comodato** (no entra al patrimonio, `RN-02-04`).

Si corrige algo, **Recalcular** reemplaza el cálculo: hay uno solo por proceso.

### 4. Bajas, informe y finalizar

En **Bajas**, registre la baja de algún candidato con una justificación individual.
En **Informe**, guárdelo en PDF. Por último, en **Resumen**, pulse **Finalizar
proceso**: queda de solo lectura, y su informe se puede volver a sacar cuando quiera.

---

## Qué trae el caso limpio, a propósito

| Situación | Dónde | Para qué sirve |
|---|---|---|
| Bienes de 1998 a 2024 | todo el inventario | Que el semáforo muestre los cuatro colores |
| `HSA01CAH0009` inservible de 2008 | Hospitalización | Candidato a baja claro |
| `HSA01AGI0021` y `HSA01ESTE034` | Laboratorio y Mantenimiento | Correctivo **fallido** registrado: candidatos por ese criterio |
| `HSA01MIC0018` y `HSA01UPS0032` | sin fecha ni costo | Se resuelven con la hoja `SIN_SOPORTE` (`RN-03-04`) |
| `HSA01VEN0037` en comodato | Urgencias | No se deprecia: no es de la entidad (`RN-02-04`) |
| `HSA01TER0041` terreno | Administración | Clase no depreciable: aparece como **NO APLICA**, no como cero |
| 7 mantenimientos | `PL-05` | Alimentan el criterio de baja por correctivo fallido |

---

## Qué trae el caso con problemas

Sirve para ver **cómo informa la aplicación**, fila por fila. Impórtelo sobre un
proceso que ya tenga el catálogo del caso limpio.

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
| 10 | Toma con fecha futura | **Advertencia** · entra igual |

Resultado esperado: **3 filas válidas, 7 con error**. La aplicación no importa
nada hasta que usted confirme explícitamente que quiere entrar solo las válidas.

### `PL-05` — 5 filas

| # | Defecto | Qué debe pasar |
|:-:|---|---|
| 1 | Código que no está en el inventario | **Error** · dice que importe PL-03 antes |
| 2 | Adquisición con fecha futura | **Error** · `VAL-03-02` |
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

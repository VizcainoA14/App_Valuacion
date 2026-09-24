/**
 * Genera el instructivo de diligenciamiento de las plantillas que la aplicación
 * SÍ sabe leer, **a partir de las definiciones reales del importador**.
 *
 * Se genera y no se escribe a mano por una razón: si mañana cambia una columna o
 * un catálogo, el instructivo cambia con él. Un instructivo desactualizado hace
 * que alguien llene mal 500 filas y lo descubra al importar.
 *
 *   npm run instructivo
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PL_02, PL_02B, CLAVES_PL_01 } from '../src/main/modules/configuracion/importacion/plantillas';
import { PL_03 } from '../src/main/modules/inventario/importacion/plantillaPl03';
import { PL_05 } from '../src/main/modules/hojas-vida/importacion/plantillaPl05';
import { PLANTILLAS as CATALOGO_PLANTILLAS } from '../src/main/infraestructura/documental/excel/catalogoPlantillas';
import type { ColumnaPlantilla, DefinicionPlantilla } from '../src/main/infraestructura/documental/excel/importador';

const salida = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'datos_de_prueba');

const TIPO_LEGIBLE: Readonly<Record<string, string>> = {
  texto: 'Texto',
  entero: 'Número entero',
  numero: 'Número (admite decimales)',
  moneda: 'Importe en pesos',
  fecha: 'Fecha',
  si_no: 'SI / NO',
  lista: 'Lista cerrada',
};

/** Ayudas escritas para quien llena, no para quien programa. */
const AYUDA: Readonly<Record<string, string>> = {
  codigo_institucional: 'El código de la placa que lleva pegada el bien. **Único en todo el inventario.**',
  placa: 'El número de la placa o marquilla. **Único**, y distinto del código institucional.',
  descripcion_funcional: 'Qué es el bien, en palabras del hospital: "MONITOR DE SIGNOS VITALES", no "equipo".',
  clase_activo: 'Elija de la lista desplegable. Son las clases que se cargaron en el proceso con PL-02.',
  sede: 'El **código** de la sede (01, 02…), de la lista desplegable.',
  servicio_ubicacion: 'El servicio donde ESTÁ el bien hoy. Debe existir en esa sede.',
  cantidad: 'Casi siempre 1. Un bien, una fila: no agrupe cinco camas en una línea.',
  estado_actual: 'Estado FÍSICO observado al contarlo.',
  condicion_tenencia: 'PROPIO si es del hospital. Comodato, arrendado o de tercero **no** se deprecian.',
  responsable_custodia: 'Quién responde por el bien: nombre y cargo.',
  fecha_toma: 'El día en que se contó físicamente el bien.',
  funcionario_que_cuenta: 'Quién hizo el conteo. Sirve para resolver dudas después.',
  tiene_foto: 'Informativo. Las fotografías se adjuntan desde la aplicación, no desde el Excel.',
  fecha_adquisicion: '**Sin esta fecha no se puede calcular la depreciación.** Si no aparece el soporte, deje la casilla vacía y use la hoja SIN_SOPORTE.',
  costo_adquisicion: '**Sin este dato no hay cálculo.** Si no lo encuentra, **deje vacío; NO escriba 0**: un cero significa "el bien costó cero", no "no lo sé".',
  adiciones_mejoras: 'Mejoras capitalizadas posteriores. Si no hubo, 0.',
  estado_operativo: '¿Funciona? Es distinto del estado físico.',
  forma_adquisicion: 'Cómo llegó el bien al hospital.',
  registro_invima: 'Obligatorio en equipo biomédico. Si está exento, adjunte después la constancia.',
  vida_util_tecnica_override: 'Solo si el manual del fabricante contradice al catálogo. **Exige justificación.**',
  justificacion_override: 'Por qué se cambia la vida útil. Sin esto la fila se rechaza.',
  fecha_puesta_servicio: 'Solo si el bien empezó a usarse en una fecha distinta a la de compra.',
  codigo_clase: 'Código corto: EMC, MEO, COM… Es el que se usará en todo el proceso.',
  vida_util_contable_meses: 'La del Manual de Políticas Contables. **En meses.**',
  vida_util_tecnica_anios: 'La que dice el fabricante o la técnica. **En años.** Puede diferir de la contable.',
  es_depreciable: 'NO solo para terrenos y bienes que no pierden valor por uso.',
  subcuenta_contable: 'La subcuenta del catálogo contable (166002, 165501…). La da contabilidad.',
  codigo_sede: 'Dos dígitos: 01, 02… Se usa en PL-03 y en el código de los bienes.',
  codigo_servicio: 'Tres letras: URG, HOS, LAB… Único dentro de su sede.',
  fecha_mantenimiento: 'Cuándo se hizo el mantenimiento.',
  resultado: 'Escriba SATISFACTORIO cuando el equipo quedó bien. Otro texto cuenta como fallido y pesa en la baja.',
  valor_estimado_tecnico: 'Valor razonable que estima el especialista, en pesos.',
  fecha_probable_adquisicion: 'La fecha más razonable que se pueda sustentar.',
  gestion_realizada: 'Qué se hizo para buscar el soporte. Es la constancia escrita que exige la norma.',
  especialista: 'Quién firma el avalúo: nombre, profesión y tarjeta profesional.',
};

function filaColumna(c: ColumnaPlantilla): string {
  const tipo = TIPO_LEGIBLE[c.tipo] ?? c.tipo;
  const valores = c.catalogo === undefined ? '' : `<br>Valores: \`${c.catalogo.join('\` · \`')}\``;
  const ayuda = AYUDA[c.nombre] ?? '';
  return `| \`${c.nombre}\` | ${c.obligatoria ? '**Sí**' : 'No'} | ${tipo}${valores} | ${ayuda} |`;
}

function tablaHoja(def: DefinicionPlantilla, hoja: string): string {
  const h = def.hojas.find((x) => x.nombre === hoja);
  if (h === undefined) throw new Error(`Sin hoja ${hoja}`);
  return ['| Columna | ¿Obligatoria? | Qué se escribe | Notas |', '|---|:-:|---|---|', ...h.columnas.map(filaColumna)].join('\n');
}

/** PL-01 es clave/valor, no una tabla de filas. */
function tablaPl01(): string {
  const filas = Object.entries(CLAVES_PL_01)
    .filter(([, d]) => d.destino !== 'ignorar')
    .map(([clave, d]) => {
      const tipo = TIPO_LEGIBLE[d.tipo] ?? d.tipo;
      const valores = d.catalogo === undefined ? '' : `<br>Valores: \`${d.catalogo.join('\` · \`')}\``;
      const destino = d.destino === 'hospital' ? 'Identificación del hospital' : d.destino === 'proceso' ? 'Fecha de corte del proceso' : 'Parámetro de cálculo';
      return `| \`${clave}\` | ${destino} | ${tipo}${valores} |`;
    });
  return ['| Campo | Para qué sirve | Qué se escribe |', '|---|---|---|', ...filas].join('\n');
}

const IMPORTABLES = CATALOGO_PLANTILLAS.filter((p) => p.importable).map((p) => p.codigo);

function generar(): string {
  return `# Instructivo de diligenciamiento

> Generado con \`npm run instructivo\` **desde las definiciones del importador**. Si una
> columna cambia en la aplicación, este documento cambia con ella.

## Lo primero: cuáles hay que llenar

La aplicación trabaja con **${IMPORTABLES.length} plantillas**, y todas se vuelven a cargar en ella:

| Orden | Plantilla | Qué aporta | Quién la llena |
|:-:|---|---|---|
| 1 | \`PL-01\` | Identificación de la E.S.E y parámetros de cálculo | Subgerencia administrativa, con contabilidad |
| 2 | \`PL-02\` | Clases de activo y vidas útiles | Contabilidad (Manual de Políticas Contables) |
| 3 | \`PL-02b\` | Sedes y servicios | Administración |
| 4 | \`PL-03\` | **El barrido: el inventario físico** | Los técnicos que recorren los servicios |
| 5 | \`PL-05\` | Fecha y costo de adquisición, mantenimientos | Contabilidad y biomédica |

**Ese es todo el trabajo que hace falta para calcular.** Con esas cinco, la aplicación
produce la depreciación, la obsolescencia, los candidatos a baja y el informe.

Las tres primeras se llenan al **iniciar el proceso de valuación**. \`PL-03\` y \`PL-05\`
traen el inventario; mientras el proceso siga en curso se pueden volver a importar
corregidos, y un barrido nuevo actualiza lo que ya estaba. Cada proceso nuevo carga su
inventario **de cero**.

### Descárguelas desde la aplicación, no de una carpeta suelta

En **Formatos**, la aplicación entrega las plantillas **con los catálogos del hospital
ya puestos como listas desplegables** (sus clases, sus sedes, sus servicios). Eso evita la
mitad de los errores de digitación. Una plantilla bajada de otro lado no los trae.

> Excepción: \`PL-01\` se descarga antes de que exista el proceso, así que va sin listas.

---

## Tres reglas que evitan casi todos los errores

1. **No cambie los nombres de las columnas ni el orden de las hojas.** La aplicación los
   busca por nombre. Puede añadir columnas suyas al final: se ignoran.
2. **La fila azul de ejemplo se deja quieta.** La aplicación la reconoce por el color y no
   la importa. Empiece a escribir en la fila 8.
3. **Lo que no se sabe se deja VACÍO, nunca en cero.** Un cero es una afirmación: "esto
   costó cero". Un vacío dice "no lo encontré", y la aplicación lo trata como pendiente en
   vez de meterlo en una suma que después alguien firma.

---

## \`PL-01\` · El hospital y los parámetros del proceso

Hoja **PARAMETROS**. Es clave/valor: escriba en la columna \`valor\`, sin tocar la columna
\`campo\`. Con este archivo se puede **iniciar el proceso** desde *Iniciar un proceso nuevo → Crear
desde PL-01*.

Obligatorios para iniciar el proceso: \`razon_social\`, \`nit\`, \`municipio\`, \`departamento\`,
\`nivel_complejidad\`, \`nombre_gerente\`, \`direccion\` y \`fecha_corte_ejercicio\`.

${tablaPl01()}

> \`fecha_corte_ejercicio\` es **la fecha a la que se calcula todo el proceso**. No puede ser
> futura. Si el proceso ya existe, la plantilla no la cambia: se cambia en *Configurar*, y
> eso descarta el cálculo hecho.
>
> \`metodo_conteo_meses\` es **el parámetro más delicado de todo el sistema**: decide cuántos
> meses se deprecia cada bien. Conviene acordarlo con el contador **antes** de calcular. El
> informe declara el que se usó.

---

## \`PL-02\` · Clases de activo y vida útil

Hoja **CLASES**. Una fila por clase. Salen del Manual de Políticas Contables.

${tablaHoja(PL_02, 'CLASES')}

---

## \`PL-02b\` · Sedes y servicios

### Hoja **SEDES**

${tablaHoja(PL_02B, 'SEDES')}

### Hoja **SERVICIOS**

${tablaHoja(PL_02B, 'SERVICIOS')}

> El \`codigo_sede\` de cada servicio debe existir en la hoja SEDES o ya estar en la
> aplicación. Un servicio puede repetir su nombre en dos sedes; se distinguen por la sede.

---

## \`PL-03\` · Toma de inventario físico

Hoja **INVENTARIO**. **Una fila por bien.** Es la plantilla que llena el personal de campo
y la única entrada del inventario. Cada archivo que se importa es un **barrido**:

- un bien que no estaba se **agrega**;
- uno que ya estaba (mismo código institucional) se **actualiza** con lo que se vio: dónde
  está, en qué estado, quién lo contó;
- uno que estaba registrado en un servicio que el archivo **sí** recorre, pero que no aparece
  en él, queda como **no encontrado**. Los servicios que el archivo no menciona no se tocan.

${tablaHoja(PL_03, 'INVENTARIO')}

### Lo que más se equivoca

- **Código y placa repetidos.** Cada uno es único en el hospital. Si dos bienes comparten
  placa, revise cuál está mal marcado antes de importar.
- **Un barrido parcial que se quiere completo.** Si recorrió un servicio, incluya todos sus
  bienes: los que falten se marcarán como no encontrados.
- **Servicio que no pertenece a la sede.** "URGENCIAS" existe en la sede 01; escribirlo en
  un bien de la sede 02 rechaza la fila.
- **La serie sí puede repetirse.** Equipos idénticos comparten serie o no la traen. La
  aplicación avisa pero importa igual.

---

## \`PL-05\` · Hoja de vida y datos económicos

Tres hojas. La primera es la que alimenta el cálculo.

### Hoja **HOJA_VIDA** — una fila por bien

${tablaHoja(PL_05, 'HOJA_VIDA')}

> \`fecha_adquisicion\` y \`costo_adquisicion\` son **lo que el motor necesita**. Un bien sin
> ellos **no entra al cálculo de la depreciación** hasta que se resuelva, y el informe lo
> relaciona con su motivo.

### Hoja **MANTENIMIENTOS** — una fila por mantenimiento

${tablaHoja(PL_05, 'MANTENIMIENTOS')}

> Reimportar el mismo archivo no duplica mantenimientos: se reconocen por bien, fecha y tipo.

### Hoja **SIN_SOPORTE** — para los bienes cuya factura no aparece

Cuando tras buscar no hay soporte, **no se inventa el dato**: un especialista estima el
valor y la fecha, y deja constancia escrita. Esta hoja **es** esa constancia; el libro que
se importa queda archivado como soporte, con su huella digital.

${tablaHoja(PL_05, 'SIN_SOPORTE')}

---

## Orden de trabajo sugerido

1. Descargue \`PL-01\` desde **Formatos** y páselo a la subgerencia administrativa.
2. Inicie el proceso con **Iniciar un proceso nuevo → Crear desde PL-01**.
3. Descargue \`PL-02\` y \`PL-02b\` (ya salen con membrete) e impórtelos.
4. **Vuelva a descargar \`PL-03\` y \`PL-05\`**: ahora sí traen las listas desplegables con
   las clases, sedes y servicios del hospital. Entréguelos al personal de campo.
5. Importe \`PL-03\`, luego \`PL-05\`, y calcule: a la fecha de corte del proceso.
6. Registre las bajas, saque el informe y **finalice el proceso**. La próxima valuación es
   un proceso nuevo, con su propia fecha de corte.

> El punto 4 importa: si entrega \`PL-03\` antes de cargar el catálogo, el personal escribirá
> los nombres a mano y aparecerán errores de digitación al importar.

### Cómo se comparan los nombres de clase, sede y servicio

Al importar, la aplicación **no exige que el nombre esté escrito idéntico**. Ignora mayúsculas,
tildes y puntuación, de modo que \`EQUIPO MEDICO CIENTIFICO\` entra igual que
\`Equipo médico-científico\`. También acepta el **código** de la clase (\`EMC\`) en lugar del nombre.

Lo que **no** puede adivinar es otra palabra: \`cómputo\` y \`computación\` son nombres distintos y
la fila se rechaza. Cuando eso pasa, el informe de importación dice qué clases hay realmente en el
catálogo, para corregir el archivo o el catálogo con \`PL-02\`.
`;
}

mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'INSTRUCTIVO_DILIGENCIAMIENTO.md'), generar(), 'utf8');
console.log(`✓ INSTRUCTIVO_DILIGENCIAMIENTO.md`);
console.log(`  ${IMPORTABLES.length} plantillas importables: ${IMPORTABLES.join(', ')}`);

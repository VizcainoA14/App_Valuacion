/** T-B-08 — protocolo de progreso y cancelación (plan 2.3 §6). */
import { describe, expect, it } from 'vitest';
import { GestorTareas, INTERVALO_PROGRESO_MS, type Emisor } from './tareas';

function emisorDePrueba(): Emisor & { eventos: { evento: string; datos: unknown }[] } {
  const eventos: { evento: string; datos: unknown }[] = [];
  return { eventos, enviar: (evento, datos) => eventos.push({ evento, datos }) };
}

describe('GestorTareas', () => {
  it('emite progreso como máximo cada 250 ms, pero siempre el último', () => {
    let reloj = 1000;
    const gestor = new GestorTareas(() => reloj);
    const emisor = emisorDePrueba();
    const tarea = gestor.crear(emisor);

    tarea.progreso(1, 10, 'obsolescencia'); // 1000 → se emite
    reloj += 100;
    tarea.progreso(2, 10, 'obsolescencia'); // 1100 → suprimido
    reloj += INTERVALO_PROGRESO_MS;
    tarea.progreso(5, 10, 'obsolescencia'); // 1350 → se emite
    reloj += 10;
    tarea.progreso(10, 10, 'obsolescencia'); // final → se emite siempre

    expect(emisor.eventos.map((e) => (e.datos as { hechos: number }).hechos)).toEqual([1, 5, 10]);
    expect(emisor.eventos[0]).toMatchObject({
      evento: 'evento:progreso',
      datos: { tareaId: tarea.id, hechos: 1, total: 10, fase: 'obsolescencia' },
    });
  });

  it('cancelar marca la bandera; el caso de uso decide cuándo parar', () => {
    const gestor = new GestorTareas(() => 0);
    const emisor = emisorDePrueba();
    const tarea = gestor.crear(emisor);

    expect(tarea.estaCancelada()).toBe(false);
    expect(gestor.cancelar(tarea.id)).toBe(true);
    expect(tarea.estaCancelada()).toBe(true);
    expect(gestor.cancelar('inexistente')).toBe(false);
  });

  it('finalizar emite una sola vez y libera la tarea', () => {
    const gestor = new GestorTareas(() => 0);
    const emisor = emisorDePrueba();
    const tarea = gestor.crear(emisor);

    tarea.finalizar('cancelada', { procesados: 500, estado: 'PARCIAL' });
    tarea.finalizar('ok', {});
    tarea.progreso(1, 2, 'x');

    expect(emisor.eventos).toHaveLength(1);
    expect(emisor.eventos[0]).toMatchObject({
      evento: 'evento:tareaFinalizada',
      datos: { tareaId: tarea.id, estado: 'cancelada' },
    });
    expect(gestor.activas()).toBe(0);
    expect(gestor.cancelar(tarea.id)).toBe(false);
  });
});

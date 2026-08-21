import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/domain/appointment-state-machine.js';

describe('máquina de estados de la cita', () => {
  it('permite el camino feliz completo', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'paid')).toBe(true);
    expect(canTransition('paid', 'reminded')).toBe(true);
    expect(canTransition('reminded', 'completed')).toBe(true);
  });

  it('permite no_show solo desde reminded', () => {
    expect(canTransition('reminded', 'no_show')).toBe(true);
    expect(canTransition('paid', 'no_show')).toBe(false);
    expect(canTransition('confirmed', 'no_show')).toBe(false);
  });

  it('permite cancelar desde pending, confirmed, paid y reminded', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('paid', 'cancelled')).toBe(true);
    expect(canTransition('reminded', 'cancelled')).toBe(true);
  });

  it('no permite salir de un estado terminal', () => {
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'pending')).toBe(false);
    expect(canTransition('no_show', 'completed')).toBe(false);
  });

  it('no permite saltarse estados (ej. pending directo a paid)', () => {
    expect(canTransition('pending', 'paid')).toBe(false);
    expect(canTransition('pending', 'reminded')).toBe(false);
  });
});

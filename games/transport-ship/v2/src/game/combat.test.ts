import { describe, expect, it } from 'vitest';
import { applyDamage, type HitZone } from './combat';

describe('combat damage model', () => {
  it('applies headshot multiplier and returns a kill at zero health', () => {
    const result = applyDamage(38, 100, 'head');
    expect(result.damage).toBe(95);
    expect(result.health).toBe(5);
    expect(result.killed).toBe(false);
  });

  it('clamps lethal body damage and marks the target killed', () => {
    const result = applyDamage(65, 40, 'body');
    expect(result.damage).toBe(65);
    expect(result.health).toBe(0);
    expect(result.killed).toBe(true);
  });

  it('uses a lighter multiplier for limb hits', () => {
    const zone: HitZone = 'limb';
    expect(applyDamage(40, 100, zone).damage).toBe(20);
  });
});

export type HitZone = 'head' | 'body' | 'limb';

const multipliers: Record<HitZone, number> = {
  head: 2.5,
  body: 1,
  limb: 0.5,
};

export function applyDamage(baseDamage: number, currentHealth: number, zone: HitZone) {
  const damage = Math.round(baseDamage * multipliers[zone]);
  const health = Math.max(0, currentHealth - damage);
  return { damage, health, killed: health <= 0 };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRaceState, stepRace } from './qq-speed-physics.mjs';

test('accelerator builds speed while releasing it applies drag', () => {
  const initial = createRaceState();
  const moving = stepRace(initial, { accelerate: true }, 0.5);
  assert.ok(moving.speed > initial.speed);
  const coast = stepRace(moving, {}, 0.5);
  assert.ok(coast.speed < moving.speed);
});

test('brake reduces speed and reverse input never creates negative speed', () => {
  const initial = { ...createRaceState(), speed: 42 };
  const braking = stepRace(initial, { brake: true }, 0.4);
  assert.ok(braking.speed < initial.speed);
  assert.ok(braking.speed >= 0);
});

test('drift turns the car, adds lateral slide, and charges drift meter', () => {
  const initial = { ...createRaceState(), speed: 28 };
  const drifting = stepRace(initial, { accelerate: true, left: true, drift: true }, 0.35);
  assert.ok(drifting.drift > 0);
  assert.ok(Math.abs(drifting.lateral) > 0);
  assert.ok(drifting.heading < initial.heading);
});

test('nitro consumes boost and gives a measurable speed impulse', () => {
  const initial = { ...createRaceState(), speed: 34, nitro: 1 };
  const boosted = stepRace(initial, { nitro: true }, 0.25);
  assert.ok(boosted.speed > initial.speed);
  assert.ok(boosted.nitro < initial.nitro);
  assert.equal(boosted.boosting, true);
});

export const CONFIG = {
  maxSpeed: 58,
  acceleration: 26,
  brakePower: 42,
  rollingDrag: 8,
  turnRate: 1.65,
  driftTurnRate: 2.9,
  driftChargeRate: 0.34,
  nitroAcceleration: 28,
  nitroDrain: 0.38,
};

export function createRaceState() {
  return {
    speed: 0,
    heading: 0,
    lateral: 0,
    drift: 0,
    nitro: 1,
    boosting: false,
  };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function stepRace(previous, input = {}, dt = 1 / 60) {
  const state = { ...previous };
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const drifting = Boolean(input.drift && Math.abs(steer) && state.speed > 4);

  if (input.accelerate) state.speed += CONFIG.acceleration * dt;
  else state.speed -= CONFIG.rollingDrag * dt;
  if (input.brake) state.speed -= CONFIG.brakePower * dt;

  state.boosting = Boolean(input.nitro && state.nitro > 0 && state.speed > 8);
  if (state.boosting) {
    state.speed += CONFIG.nitroAcceleration * dt;
    state.nitro = clamp(state.nitro - CONFIG.nitroDrain * dt, 0, 1);
  }

  state.speed = clamp(state.speed, 0, CONFIG.maxSpeed + (state.boosting ? 16 : 0));
  const turnScale = 0.22 + (state.speed / CONFIG.maxSpeed) * 0.78;
  state.heading += steer * (drifting ? CONFIG.driftTurnRate : CONFIG.turnRate) * turnScale * dt;
  if (drifting) {
    state.lateral += steer * (0.9 + state.speed / 34) * dt;
    state.drift = clamp(state.drift + CONFIG.driftChargeRate * dt * (0.5 + state.speed / CONFIG.maxSpeed), 0, 1);
  } else {
    state.lateral *= Math.max(0, 1 - dt * 5.5);
    state.drift = clamp(state.drift - dt * 0.2, 0, 1);
  }
  return state;
}

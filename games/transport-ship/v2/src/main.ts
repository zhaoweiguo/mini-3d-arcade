import * as THREE from 'three';
import { applyDamage, type HitZone } from './game/combat';
import './styles.css';

type WeaponId = 'AR-9' | 'SMG-4' | 'P-02';
type BotState = 'patrol' | 'hunt' | 'cover' | 'reload' | 'dead';

interface Weapon {
  id: WeaponId;
  label: string;
  damage: number;
  fireRate: number;
  magazine: number;
  reserve: number;
  spread: number;
  reload: number;
  color: number;
}

interface Bot {
  root: THREE.Group;
  health: number;
  state: BotState;
  waypoint: THREE.Vector3;
  fireCooldown: number;
  respawnTimer: number;
  hitFlash: number;
  name: string;
  weapon: Weapon;
}

const weapons: Record<WeaponId, Weapon> = {
  'AR-9': { id: 'AR-9', label: 'AR-9 磁轨步枪', damage: 34, fireRate: 0.095, magazine: 30, reserve: 120, spread: 0.012, reload: 1.8, color: 0xaac4cf },
  'SMG-4': { id: 'SMG-4', label: 'SMG-4 近岸冲锋枪', damage: 22, fireRate: 0.065, magazine: 36, reserve: 144, spread: 0.022, reload: 1.55, color: 0xe3bd62 },
  'P-02': { id: 'P-02', label: 'P-02 船员手枪', damage: 42, fireRate: 0.24, magazine: 12, reserve: 60, spread: 0.018, reload: 1.25, color: 0xb1a4a0 },
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="game-shell">
    <canvas id="game-canvas"></canvas>
    <div id="vignette"></div>
    <div id="hud" aria-label="战斗信息">
      <div class="hud-topline"><span class="brand-mark">STEELWAKE // 07</span><span id="match-status">LIVE FIRE EXERCISE</span><span id="timer">08:00</span></div>
      <div class="scorebar"><div><span class="team team-blue"></span>甲板幽灵 <b id="player-score">00</b></div><div class="score-divider">/</div><div><b id="enemy-score">00</b> 赤潮连队 <span class="team team-red"></span></div></div>
      <div class="reticle" id="reticle"><i></i><i></i><i></i><i></i><b></b></div>
      <div class="damage-direction" id="damage-direction"></div>
      <div class="hud-bottom">
        <div class="status-cluster"><div class="health-ring"><span id="health-value">100</span><small>HP</small></div><div class="armor-line"><span>ARMOR</span><b id="armor-value">75</b></div></div>
        <div class="weapon-readout"><div class="weapon-name" id="weapon-name">AR-9 磁轨步枪</div><div class="weapon-meta"><span id="weapon-mode">AUTO // 5.56</span><span class="ammo"><b id="ammo-current">30</b><em>/</em><span id="ammo-reserve">120</span></span></div><div class="ammo-bar"><i id="ammo-bar-fill"></i></div></div>
      </div>
      <div class="kill-feed" id="kill-feed"></div>
      <div class="hint-strip"><span class="key">WASD</span>移动 <span class="key">SHIFT</span>冲刺 <span class="key">LMB</span>射击 <span class="key">R</span>换弹 <span class="key">TAB</span>战术板</div>
    </div>
    <div id="scoreboard" class="scoreboard hidden"><div class="scoreboard-header"><span>STEELWAKE / COMBAT LOG</span><b>按 TAB 关闭</b></div><div class="score-table"><div class="score-row score-head"><span>呼号</span><span>击杀</span><span>阵亡</span><span>状态</span></div><div class="score-row"><span>YOU // DECK GHOST</span><span id="board-kills">0</span><span id="board-deaths">0</span><span class="online">ONLINE</span></div><div id="bot-score-rows"></div></div></div>
    <div id="start-screen"><div class="start-grid"></div><div class="start-content"><div class="eyebrow">ORIGINAL SHIPYARD COMBAT SIMULATION · 2026.09</div><h1>钢潮运输船</h1><div class="title-sub">STEEL<span>WAKE</span> // CQB DECK ARENA</div><p>风暴警报已解除。货舱层甲板开放。<br />进入钢潮，夺取中线，活着离开。</p><button id="start-button">进入战场 <span>→</span></button><div class="start-meta"><span><b>6</b> ENEMY OPERATORS</span><span><b>08:00</b> ROUND TIME</span><span><b>40</b> KILLS TO WIN</span></div></div><div class="start-footer"><span>STEELWAKE // ORIGINAL ARENA</span><span>WASD · MOUSE · R · TAB</span></div></div>
    <div id="pause-screen" class="modal hidden"><div class="modal-card"><span class="eyebrow">SYSTEM PAUSED</span><h2>甲板暂离</h2><p>点击继续，重新夺回视野。</p><button id="resume-button">继续战斗 <span>→</span></button></div></div>
    <div id="round-over" class="modal hidden"><div class="modal-card"><span class="eyebrow">ROUND COMPLETE</span><h2 id="round-title">钢潮已清空</h2><p id="round-copy">战斗数据正在同步。</p><button id="restart-button">重新部署 <span>↻</span></button></div></div>
  </div>`;

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1c22);
scene.fog = new THREE.FogExp2(0x143139, 0.0065);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(-38, 1.75, 0);
camera.rotation.order = 'YXZ';

const world = new THREE.Group();
world.name = 'STEELWAKE_DECK';
scene.add(world);
const shootables: THREE.Object3D[] = [];
const obstacles: THREE.Box3[] = [];
const bots: Bot[] = [];
const tracers: { line: THREE.Line; life: number }[] = [];
const sparks: { mesh: THREE.Mesh; life: number; velocity: THREE.Vector3 }[] = [];
const spawnPoints = [new THREE.Vector3(-38, 0, 0), new THREE.Vector3(31, 0, 0)];
const patrolPoints = [new THREE.Vector3(-18, 0, -9), new THREE.Vector3(-4, 0, 8), new THREE.Vector3(9, 0, -7), new THREE.Vector3(19, 0, 7), new THREE.Vector3(27, 0, -3), new THREE.Vector3(3, 0, 0)];

let active = false;
let roundEnded = false;
let paused = false;
let roundTime = 480;
let playerHealth = 100;
let playerArmor = 75;
let playerScore = 0;
let enemyScore = 0;
let playerDeaths = 0;
let selectedWeapon: Weapon = weapons['AR-9'];
let ammo = selectedWeapon.magazine;
let reserve = selectedWeapon.reserve;
let fireCooldown = 0;
let reloadTimer = 0;
let sprinting = false;
let velocityY = 0;
let lastTime = performance.now();
let damageFlash = 0;
let weaponKick = 0;
let cameraShake = 0;
let recoil = 0;
let audioContext: AudioContext | null = null;

const keys = new Set<string>();
const mouse = { x: 0, y: 0, down: false, right: false };
const yawPitch = { yaw: -Math.PI / 2, pitch: 0 };
const weaponGroup = new THREE.Group();
camera.add(weaponGroup);
scene.add(camera);

const ui = {
  start: document.querySelector<HTMLDivElement>('#start-screen')!,
  startButton: document.querySelector<HTMLButtonElement>('#start-button')!,
  pause: document.querySelector<HTMLDivElement>('#pause-screen')!,
  resume: document.querySelector<HTMLButtonElement>('#resume-button')!,
  round: document.querySelector<HTMLDivElement>('#round-over')!,
  restart: document.querySelector<HTMLButtonElement>('#restart-button')!,
  title: document.querySelector<HTMLHeadingElement>('#round-title')!,
  copy: document.querySelector<HTMLParagraphElement>('#round-copy')!,
  timer: document.querySelector<HTMLSpanElement>('#timer')!,
  playerScore: document.querySelector<HTMLElement>('#player-score')!,
  enemyScore: document.querySelector<HTMLElement>('#enemy-score')!,
  health: document.querySelector<HTMLElement>('#health-value')!,
  armor: document.querySelector<HTMLElement>('#armor-value')!,
  weapon: document.querySelector<HTMLElement>('#weapon-name')!,
  ammo: document.querySelector<HTMLElement>('#ammo-current')!,
  reserve: document.querySelector<HTMLElement>('#ammo-reserve')!,
  ammoFill: document.querySelector<HTMLElement>('#ammo-bar-fill')!,
  killFeed: document.querySelector<HTMLElement>('#kill-feed')!,
  scoreboard: document.querySelector<HTMLDivElement>('#scoreboard')!,
  boardKills: document.querySelector<HTMLElement>('#board-kills')!,
  boardDeaths: document.querySelector<HTMLElement>('#board-deaths')!,
  botRows: document.querySelector<HTMLElement>('#bot-score-rows')!,
  reticle: document.querySelector<HTMLElement>('#reticle')!,
  damageDirection: document.querySelector<HTMLElement>('#damage-direction')!,
};

function mat(color: number, roughness = 0.74, metalness = 0.12) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function canvasLabel(text: string, color = '#c9d9d7', background = '#15242a') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = background; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#829398'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = color; ctx.font = '700 42px Arial'; ctx.letterSpacing = '5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: false });
}

function box(name: string, size: THREE.Vector3, position: THREE.Vector3, material: THREE.Material, collider = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name; mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true;
  world.add(mesh); shootables.push(mesh);
  if (collider) obstacles.push(new THREE.Box3().setFromCenterAndSize(position, size));
  return mesh;
}

function addContainer(position: THREE.Vector3, size = new THREE.Vector3(7, 4, 7), accent = 0x28434a, label = 'SW-04 / CARGO') {
  const body = box('CONTAINER', size, position.clone().setY(size.y / 2 + 0.2), mat(accent, 0.62, 0.45));
  const ribMaterial = mat(0x173037, 0.7, 0.5);
  for (let x = -size.x / 2 + 0.45; x < size.x / 2; x += 0.8) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, size.y - 0.3, 0.08), ribMaterial);
    rib.position.set(position.x + x, size.y / 2 + 0.2, position.z + size.z / 2 + 0.04); rib.castShadow = true; world.add(rib);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(size.x * 0.63, 4.6), 0.8), canvasLabel(label, '#e4c86d', '#1a2e33'));
  sign.position.set(position.x, size.y / 2 + 0.25, position.z + size.z / 2 + 0.06); sign.rotation.x = 0; world.add(sign);
  return body;
}

function createWorld() {
  const deck = new THREE.Mesh(new THREE.BoxGeometry(88, 0.65, 39), mat(0x263338, 0.88, 0.28));
  deck.position.y = -0.42; deck.receiveShadow = true; world.add(deck);
  const deckLines = mat(0x526267, 0.9, 0.2);
  for (let x = -40; x <= 40; x += 4) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 36), deckLines); line.position.set(x, -0.07, 0); world.add(line);
  }
  const hullMat = mat(0x152329, 0.66, 0.66);
  box('HULL_LEFT', new THREE.Vector3(90, 3.6, 1), new THREE.Vector3(0, 1.25, -19.2), hullMat, true);
  box('HULL_RIGHT', new THREE.Vector3(90, 3.6, 1), new THREE.Vector3(0, 1.25, 19.2), hullMat, true);
  for (const z of [-18.2, 18.2]) {
    for (let x = -40; x <= 40; x += 4) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.7, 0.11), mat(0x809196, 0.48, 0.72)); post.position.set(x, 1.8, z); post.castShadow = true; world.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(88, 0.12, 0.12), mat(0x72878c, 0.42, 0.78)); rail.position.set(0, 2.55, z); rail.castShadow = true; world.add(rail);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), new THREE.MeshStandardMaterial({ color: 0x082630, roughness: 0.18, metalness: 0.42, transparent: true, opacity: 0.96 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -2.2; water.receiveShadow = true; scene.add(water);
  addContainer(new THREE.Vector3(-17, 0, -10), new THREE.Vector3(9, 4.6, 7), 0x315761, 'SW-14 / EAST');
  addContainer(new THREE.Vector3(-17, 0, 10), new THREE.Vector3(9, 4.6, 7), 0x63483f, 'SW-15 / EAST');
  addContainer(new THREE.Vector3(4, 0, -10), new THREE.Vector3(8, 4.6, 7), 0x765345, 'SW-22 / MID');
  addContainer(new THREE.Vector3(17, 0, 10), new THREE.Vector3(10, 4.6, 7), 0x304e58, 'SW-31 / WEST');
  addContainer(new THREE.Vector3(29, 0, -9), new THREE.Vector3(6, 4.6, 7), 0x5f4638, 'SW-39 / AFT');
  const crateMat = mat(0x8b6744, 0.82, 0.08);
  for (const p of [new THREE.Vector3(-6, 0, -3.5), new THREE.Vector3(-3.5, 0, -3.5), new THREE.Vector3(-1, 0, 3.5), new THREE.Vector3(11, 0, 3), new THREE.Vector3(13.3, 0, 3)]) {
    box('WOOD_CRATE', new THREE.Vector3(2, 2.2, 2), p.clone().setY(1.1), crateMat);
  }
  const cabin = box('BRIDGE', new THREE.Vector3(7, 8, 12), new THREE.Vector3(-29, 4, 0), mat(0x203238, 0.48, 0.62));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(7.1, 2.1, 12.2), new THREE.MeshPhysicalMaterial({ color: 0x5d9ba4, metalness: 0.2, roughness: 0.12, transmission: 0.24, transparent: true, opacity: 0.46 }));
  glass.position.set(-29, 6.3, 0); glass.castShadow = true; world.add(glass);
  const craneMat = mat(0x6e4d35, 0.72, 0.5);
  for (const x of [-5, 22]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 13, 1.2), craneMat); tower.position.set(x, 6.2, -15.5); tower.castShadow = true; world.add(tower);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(13, 0.65, 0.65), craneMat); arm.position.set(x + 5.5, 12.3, -15.5); arm.castShadow = true; world.add(arm);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 0.2), mat(0x9b8052, 0.56, 0.55)); hook.position.set(x + 10, 9.6, -15.5); world.add(hook);
  }
  const warning = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.15), canvasLabel('DANGER // OPEN DECK', '#f3d06d', '#5d271f'));
  warning.position.set(0, 0.1, -18.65); warning.rotation.x = -Math.PI / 2; world.add(warning);
  const hemi = new THREE.HemisphereLight(0x9ed5dd, 0x162226, 2.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe4b1, 4.8); sun.position.set(-35, 45, 15); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -65; sun.shadow.camera.right = 65; sun.shadow.camera.top = 65; sun.shadow.camera.bottom = -65; scene.add(sun);
  const cyan = new THREE.PointLight(0x36d6d4, 34, 38, 2); cyan.position.set(-3, 5, -11); scene.add(cyan);
  const amber = new THREE.PointLight(0xd98a42, 34, 40, 2); amber.position.set(21, 5, 10); scene.add(amber);
  const bow = new THREE.PointLight(0x73b8ca, 26, 34, 2); bow.position.set(-26, 6, 2); scene.add(bow);
  createAtmosphere();
  void cabin;
}

function createAtmosphere() {
  const starMat = new THREE.PointsMaterial({ color: 0xb4d2d5, size: 0.12, transparent: true, opacity: 0.45 });
  const geometry = new THREE.BufferGeometry(); const points: number[] = [];
  for (let i = 0; i < 230; i++) points.push((Math.random() - 0.5) * 180, 7 + Math.random() * 48, (Math.random() - 0.5) * 130);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); scene.add(new THREE.Points(geometry, starMat));
}

function createWeaponModel() {
  weaponGroup.clear();
  const group = new THREE.Group(); group.position.set(0.32, -0.26, -0.58); group.rotation.set(-0.06, -0.08, -0.02);
  const primary = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.92), mat(selectedWeapon.color, 0.34, 0.82)); primary.position.set(0, 0, 0); primary.castShadow = true;
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.38), mat(0x20292d, 0.42, 0.9)); receiver.position.set(0, 0.03, 0.24); receiver.castShadow = true;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.2), mat(0x20272a, 0.68, 0.2)); grip.position.set(0, -0.22, 0.29); grip.rotation.x = -0.2;
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), mat(0x687c81, 0.32, 0.9)); sight.position.set(0, 0.17, -0.08);
  group.add(primary, receiver, grip, sight);
  weaponGroup.add(group);
}

function createBot(index: number) {
  const root = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x7d3530 : 0x4a5f68, roughness: 0.68, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.9, 5, 10), suit); body.position.y = 1.05; body.castShadow = true; body.userData.hitZone = 'body';
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mat(0xb27d64, 0.9, 0.02)); head.position.y = 1.88; head.castShadow = true; head.userData.hitZone = 'head';
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1), mat(0x111b21, 0.2, 0.7)); visor.position.set(0, 1.91, 0.22); root.add(visor);
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.18, 0.34), suit); shoulder.position.y = 1.38; shoulder.castShadow = true;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.78), mat(0x232b2e, 0.34, 0.8)); gun.position.set(0.36, 1.18, 0.32); gun.rotation.x = -0.08; gun.rotation.y = -0.16; gun.castShadow = true;
  root.add(body, head, shoulder, gun); root.position.copy(spawnPoints[1]); root.position.z = (index - 2.5) * 5.2; root.position.x += Math.random() * 3 - 1.5;
  world.add(root); shootables.push(body, head);
  const bot: Bot = { root, health: 100, state: 'patrol', waypoint: patrolPoints[index % patrolPoints.length].clone(), fireCooldown: 0.7 + index * 0.16, respawnTimer: 0, hitFlash: 0, name: `RED-${String(index + 1).padStart(2, '0')}`, weapon: weapons[index % 2 ? 'SMG-4' : 'AR-9'] };
  root.userData.bot = bot; body.userData.bot = bot; head.userData.bot = bot;
  bots.push(bot);
}

function resetBots() { bots.forEach((bot, i) => { bot.health = 100; bot.state = 'patrol'; bot.respawnTimer = 0; bot.root.visible = true; bot.root.position.copy(spawnPoints[1]); bot.root.position.z = (i - 2.5) * 5.2; }); }

function setupInput() {
  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (event.code === 'Tab') { event.preventDefault(); ui.scoreboard.classList.toggle('hidden'); updateScoreboard(); }
    if (event.code === 'KeyR' && active && !roundEnded) startReload();
    if (event.code === 'Digit1') switchWeapon('AR-9');
    if (event.code === 'Digit2') switchWeapon('SMG-4');
    if (event.code === 'Digit3') switchWeapon('P-02');
    if (event.code === 'Escape' && active && !roundEnded) { paused = !paused; ui.pause.classList.toggle('hidden', !paused); if (paused) document.exitPointerLock(); else canvas.requestPointerLock(); }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  canvas.addEventListener('mousedown', (event) => { if (!active || paused || roundEnded) return; if (event.button === 0) mouse.down = true; if (event.button === 2) mouse.right = true; if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); });
  window.addEventListener('mouseup', (event) => { if (event.button === 0) mouse.down = false; if (event.button === 2) mouse.right = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('mousemove', (event) => { if (document.pointerLockElement !== canvas || paused) return; yawPitch.yaw -= event.movementX * 0.0024; yawPitch.pitch -= event.movementY * 0.0024; yawPitch.pitch = THREE.MathUtils.clamp(yawPitch.pitch, -1.42, 1.42); });
  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
  ui.startButton.addEventListener('click', () => startGame()); ui.resume.addEventListener('click', () => { paused = false; ui.pause.classList.add('hidden'); canvas.requestPointerLock(); }); ui.restart.addEventListener('click', () => { ui.round.classList.add('hidden'); startGame(true); });
}

function startGame(reset = false) {
  if (reset) { playerScore = 0; enemyScore = 0; playerDeaths = 0; roundTime = 480; resetBots(); }
  active = true; paused = false; roundEnded = false; ui.start.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.round.classList.add('hidden'); canvas.requestPointerLock(); audioContext ??= new AudioContext(); updateHUD();
}

function switchWeapon(id: WeaponId) { if (selectedWeapon.id === id || reloadTimer > 0) return; selectedWeapon = weapons[id]; ammo = Math.min(selectedWeapon.magazine, selectedWeapon.magazine); reserve = selectedWeapon.reserve; createWeaponModel(); updateHUD(); playTone(260, 0.045, 'square', 0.035); }
function startReload() { if (reloadTimer > 0 || ammo >= selectedWeapon.magazine || reserve <= 0) return; reloadTimer = selectedWeapon.reload; playTone(130, 0.16, 'triangle', 0.05); addFeed('换弹中 // MAGAZINE SWAP', 'neutral'); }
function completeReload() { const need = selectedWeapon.magazine - ammo; const load = Math.min(need, reserve); ammo += load; reserve -= load; }

function movePlayer(delta: number) {
  const forward = new THREE.Vector3(-Math.sin(yawPitch.yaw), 0, -Math.cos(yawPitch.yaw));
  const right = new THREE.Vector3(Math.cos(yawPitch.yaw), 0, -Math.sin(yawPitch.yaw));
  const direction = new THREE.Vector3();
  if (keys.has('KeyW')) direction.add(forward); if (keys.has('KeyS')) direction.sub(forward); if (keys.has('KeyD')) direction.add(right); if (keys.has('KeyA')) direction.sub(right);
  const isMoving = direction.lengthSq() > 0; sprinting = keys.has('ShiftLeft') && isMoving; if (isMoving) direction.normalize();
  const speed = sprinting ? 9.4 : 5.8; const next = camera.position.clone().addScaledVector(direction, speed * delta);
  next.x = THREE.MathUtils.clamp(next.x, -39.5, 39.5); next.z = THREE.MathUtils.clamp(next.z, -16.8, 16.8);
  if (!collides(next, 0.52)) { camera.position.x = next.x; camera.position.z = next.z; }
  if (keys.has('Space') && camera.position.y <= 1.76) velocityY = 5.6;
  velocityY -= 15.5 * delta; camera.position.y += velocityY * delta; if (camera.position.y < 1.76) { camera.position.y = 1.76; velocityY = 0; }
  camera.rotation.set(yawPitch.pitch + recoil, yawPitch.yaw, 0); weaponGroup.position.y = -0.26 + Math.sin(performance.now() * 0.012) * (isMoving ? 0.006 : 0);
}

function collides(position: THREE.Vector3, radius: number) { for (const obstacle of obstacles) { if (position.x + radius > obstacle.min.x && position.x - radius < obstacle.max.x && position.z + radius > obstacle.min.z && position.z - radius < obstacle.max.z && position.y < obstacle.max.y + 0.3) return true; } return false; }

function shoot() {
  if (fireCooldown > 0 || reloadTimer > 0 || ammo <= 0 || !active || paused || roundEnded) { if (ammo === 0 && fireCooldown <= 0) startReload(); return; }
  ammo--; fireCooldown = selectedWeapon.fireRate; weaponKick = 0.08; recoil = 0.038; cameraShake = 0.025; playTone(selectedWeapon.id === 'P-02' ? 175 : 110, selectedWeapon.id === 'P-02' ? 0.12 : 0.07, 'sawtooth', 0.08);
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); direction.x += (Math.random() - 0.5) * selectedWeapon.spread; direction.y += (Math.random() - 0.5) * selectedWeapon.spread; direction.normalize();
  const origin = camera.position.clone(); const ray = new THREE.Raycaster(origin, direction, 0, 150); const hits = ray.intersectObjects(shootables, true);
  const hit = hits.find((entry) => entry.object.visible);
  const end = hit ? hit.point.clone() : origin.clone().addScaledVector(direction, 80); createTracer(origin, end, 0xffd777);
  if (hit) {
    const bot = hit.object.userData.bot as Bot | undefined;
    if (bot && bot.state !== 'dead') { const zone = (hit.object.userData.hitZone ?? 'body') as HitZone; const result = applyDamage(selectedWeapon.damage, bot.health, zone); bot.health = result.health; bot.hitFlash = 0.12; spawnSparks(hit.point, zone === 'head' ? 0xffe9a1 : 0x9ed3d6); showHitMarker(result.killed, zone); if (result.killed) killBot(bot, zone); }
    else { spawnSparks(hit.point, 0xd0a56e); }
  }
  updateHUD();
}

function botShoot(bot: Bot) {
  bot.fireCooldown = bot.weapon.fireRate + 0.32 + Math.random() * 0.55;
  const origin = bot.root.position.clone().add(new THREE.Vector3(0, 1.35, 0)); const target = camera.position.clone(); const distance = origin.distanceTo(target); if (distance > 40) return;
  const spread = distance > 20 ? 0.22 : 0.1; target.x += (Math.random() - 0.5) * spread * distance; target.y += (Math.random() - 0.5) * spread * distance * 0.28; target.z += (Math.random() - 0.5) * spread * distance;
  createTracer(origin, target, 0xeb6e58); if (Math.random() < (distance < 13 ? 0.3 : 0.13)) takePlayerDamage(bot.weapon.damage * 0.42, bot.root.position);
}

function updateBots(delta: number) {
  bots.forEach((bot, index) => {
    if (bot.state === 'dead') { bot.respawnTimer -= delta; if (bot.respawnTimer <= 0) { bot.state = 'patrol'; bot.health = 100; bot.root.visible = true; bot.root.position.copy(spawnPoints[1]); bot.root.position.z = (index - 2.5) * 5.2; addFeed(`${bot.name} // 重新部署`, 'neutral'); } return; }
    bot.fireCooldown -= delta; bot.hitFlash = Math.max(0, bot.hitFlash - delta);
    const toPlayer = new THREE.Vector3(camera.position.x - bot.root.position.x, 0, camera.position.z - bot.root.position.z); const distance = toPlayer.length();
    const seesPlayer = distance < 29 && Math.abs(camera.position.y - (bot.root.position.y + 1.2)) < 8;
    if (seesPlayer) { bot.state = distance < 11 ? 'cover' : 'hunt'; if (distance > 9) { const step = toPlayer.normalize().multiplyScalar(delta * (1.0 + (index % 2) * 0.25)); const next = bot.root.position.clone().add(step); if (!collides(next, 0.55)) bot.root.position.copy(next); } if (distance < 30 && bot.fireCooldown <= 0) botShoot(bot); }
    else { bot.state = 'patrol'; const toWaypoint = bot.waypoint.clone().sub(bot.root.position); toWaypoint.y = 0; if (toWaypoint.length() < 1.4) bot.waypoint = patrolPoints[(index + Math.floor(performance.now() / 3200)) % patrolPoints.length].clone(); else bot.root.position.add(toWaypoint.normalize().multiplyScalar(delta * 1.15)); }
    const look = Math.atan2(camera.position.x - bot.root.position.x, camera.position.z - bot.root.position.z); bot.root.rotation.y = look;
    const body = bot.root.children[0] as THREE.Mesh; const material = body.material as THREE.MeshStandardMaterial; material.emissive.set(bot.hitFlash > 0 ? 0xffd19c : 0x000000); material.emissiveIntensity = bot.hitFlash > 0 ? 1.8 : 0;
  });
}

function killBot(bot: Bot, zone: HitZone) { bot.state = 'dead'; bot.root.visible = false; bot.respawnTimer = 4.5; playerScore++; addFeed(`YOU // ${zone === 'head' ? '头部命中' : '目标清除'} // ${bot.name}`, zone === 'head' ? 'head' : 'good'); playTone(620, 0.08, 'square', 0.05); if (playerScore >= 40) endRound(true); updateHUD(); }
function takePlayerDamage(damage: number, source: THREE.Vector3) { if (!active || paused || roundEnded) return; const absorbed = Math.min(playerArmor, Math.round(damage * 0.38)); playerArmor -= absorbed; playerHealth = Math.max(0, playerHealth - Math.max(1, Math.round(damage - absorbed))); damageFlash = 0.2; cameraShake = 0.05; ui.damageDirection.style.setProperty('--angle', `${Math.atan2(source.x - camera.position.x, source.z - camera.position.z) * 180 / Math.PI}deg`); if (playerHealth <= 0) { playerDeaths++; enemyScore++; playerHealth = 100; playerArmor = 75; camera.position.copy(spawnPoints[0]).setY(1.76); yawPitch.yaw = -Math.PI / 2; addFeed('YOU // 船体断线 // 4.5 秒后重生', 'bad'); if (enemyScore >= 40) endRound(false); } updateHUD(); }
function endRound(won: boolean) { roundEnded = true; active = false; document.exitPointerLock(); ui.title.textContent = won ? '甲板已夺回' : '钢潮失守'; ui.copy.textContent = won ? `最终比分 ${playerScore} : ${enemyScore} // 船体控制权转移完成。` : `最终比分 ${playerScore} : ${enemyScore} // 赤潮连队占领中线。`; ui.round.classList.remove('hidden'); }

function createTracer(start: THREE.Vector3, end: THREE.Vector3, color: number) { const geometry = new THREE.BufferGeometry().setFromPoints([start, end]); const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.88 })); scene.add(line); tracers.push({ line, life: 0.045 }); }
function spawnSparks(position: THREE.Vector3, color: number) { for (let i = 0; i < 6; i++) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), new THREE.MeshBasicMaterial({ color, transparent: true })); mesh.position.copy(position); scene.add(mesh); sparks.push({ mesh, life: 0.35, velocity: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3) }); } }
function showHitMarker(killed: boolean, zone: HitZone) { ui.reticle.classList.add(killed ? 'kill' : 'hit'); ui.reticle.dataset.zone = zone; window.setTimeout(() => ui.reticle.classList.remove('kill', 'hit'), killed ? 180 : 90); }
function addFeed(text: string, tone: 'good' | 'bad' | 'head' | 'neutral') { const line = document.createElement('div'); line.className = `feed-line ${tone}`; line.innerHTML = `<span>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>${text}`; ui.killFeed.prepend(line); window.setTimeout(() => line.classList.add('fade'), 3600); window.setTimeout(() => line.remove(), 4300); }
function updateHUD() { ui.playerScore.textContent = String(playerScore).padStart(2, '0'); ui.enemyScore.textContent = String(enemyScore).padStart(2, '0'); ui.health.textContent = String(playerHealth).padStart(3, '0'); ui.armor.textContent = String(playerArmor).padStart(2, '0'); ui.weapon.textContent = selectedWeapon.label; ui.ammo.textContent = String(ammo).padStart(2, '0'); ui.reserve.textContent = String(reserve).padStart(3, '0'); ui.ammoFill.style.width = `${(ammo / selectedWeapon.magazine) * 100}%`; ui.boardKills.textContent = String(playerScore); ui.boardDeaths.textContent = String(playerDeaths); }
function updateScoreboard() { ui.botRows.innerHTML = bots.map((bot) => `<div class="score-row"><span>${bot.name}</span><span>${bot.state === 'dead' ? '—' : '0'}</span><span>—</span><span class="${bot.state === 'dead' ? 'offline' : 'hostile'}">${bot.state === 'dead' ? 'REDEPLOY' : 'HOSTILE'}</span></div>`).join(''); }
function playTone(frequency: number, duration: number, type: OscillatorType, volume: number) { if (!audioContext) return; const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); osc.type = type; osc.frequency.value = frequency; gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration); osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + duration); }

function tick(delta: number) {
  if (active && !paused && !roundEnded) {
    roundTime = Math.max(0, roundTime - delta); if (roundTime <= 0) endRound(playerScore > enemyScore);
    fireCooldown = Math.max(0, fireCooldown - delta); if (reloadTimer > 0) { reloadTimer -= delta; if (reloadTimer <= 0) completeReload(); }
    recoil = THREE.MathUtils.lerp(recoil, 0, delta * 14); cameraShake = THREE.MathUtils.lerp(cameraShake, 0, delta * 12); damageFlash = Math.max(0, damageFlash - delta);
    movePlayer(delta); if (mouse.down) shoot(); updateBots(delta); updateHUD();
    const minutes = Math.floor(roundTime / 60); const seconds = Math.floor(roundTime % 60); ui.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    weaponGroup.children[0]?.position.set(0, -0.26 + weaponKick * 0.5, -0.58 + weaponKick); weaponKick = THREE.MathUtils.lerp(weaponKick, 0, delta * 16);
    camera.position.y += (Math.random() - 0.5) * cameraShake; camera.position.x += (Math.random() - 0.5) * cameraShake; camera.position.z += (Math.random() - 0.5) * cameraShake;
    document.body.classList.toggle('damaged', damageFlash > 0);
  }
  tracers.forEach((tracer) => { tracer.life -= delta; (tracer.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, tracer.life * 20); if (tracer.life <= 0) { scene.remove(tracer.line); tracer.line.geometry.dispose(); (tracer.line.material as THREE.Material).dispose(); } });
  for (let i = sparks.length - 1; i >= 0; i--) { const spark = sparks[i]; spark.life -= delta; spark.mesh.position.addScaledVector(spark.velocity, delta); spark.velocity.y -= 7 * delta; (spark.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, spark.life * 3); if (spark.life <= 0) { scene.remove(spark.mesh); spark.mesh.geometry.dispose(); (spark.mesh.material as THREE.Material).dispose(); sparks.splice(i, 1); } }
}

function loop(now: number) { const delta = Math.min((now - lastTime) / 1000, 0.05); lastTime = now; tick(delta); renderer.render(scene, camera); requestAnimationFrame(loop); }

createWorld(); createWeaponModel(); for (let i = 0; i < 6; i++) createBot(i); setupInput(); updateHUD(); requestAnimationFrame(loop);

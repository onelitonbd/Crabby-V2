/* Visual smoke render: runs the real game code against a real canvas
   implementation and writes PNGs of key moments so the art can be eyeballed.
   Requires @napi-rs/canvas (dev-only, not a runtime dependency of the game). */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
/* Resolve an optional dev-only dependency from several locations so the
   harness runs whatever way the repo is checked out. Returns null if missing. */
function optionalRequire(name, extraPaths) {
  const candidates = [name].concat(extraPaths || []);
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try the next candidate */ }
  }
  return null;
}

const napi = optionalRequire('@napi-rs/canvas', ['/tmp/visualtest/node_modules/@napi-rs/canvas', './node_modules/@napi-rs/canvas', __dirname + '/../node_modules/@napi-rs/canvas']);
if (!napi) { console.log('SKIP visual test (npm i -D @napi-rs/canvas to render frames)'); process.exit(0); }

const OUT = process.env.RENDER_DIR || '/tmp/render-crabby';
fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync(path.join(__dirname, '..', 'crabby-catch.html'), 'utf8');
const js = src.match(/<script>([\s\S]*)<\/script>/)[1];

const listeners = {};
const addLis = (m, t, f) => (m[t] = m[t] || []).push(f);
const fire = (m, t, ev) => (m[t] || []).forEach(f => f(Object.assign({
  preventDefault() {}, stopPropagation() {}, type: t, pointerId: 1, pointerType: 'touch',
  button: 0, clientX: 100, clientY: 100, target: null }, ev)));

function makeCanvas(w, h) {
  const c = napi.createCanvas(w || 300, h || 150);
  c.style = {}; c._lis = {};
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: c.width, height: c.height });
  c.addEventListener = (t, f) => addLis(c._lis, t, f);
  c.removeEventListener = () => {};
  c.setPointerCapture = () => {};
  return c;
}
const elements = {};
function makeEl(id) {
  const el = { id, style: {}, _lis: {}, textContent: '', innerHTML: '', classList: {
    _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
    toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } } };
  el.addEventListener = (t, f) => addLis(el._lis, t, f);
  el.removeEventListener = () => {};
  return el;
}
elements.game = makeCanvas(420, 780);
['hud','score','scoreLabel','level','combo','comboText','comboBarWrap','comboBar','lives','btns',
 'btnPause','btnMute','btnFull','overlay','panel','pauseLayer','btnResume','btnQuit','stage']
 .forEach(id => elements[id] = makeEl(id));

const doc = { hidden: false, _lis: {}, getElementById: id => elements[id] || null,
  createElement: tag => (tag === 'canvas' ? makeCanvas(4, 4) : makeEl(tag)),
  querySelectorAll: () => [], addEventListener: (t, f) => addLis(doc._lis, t, f),
  removeEventListener: () => {}, body: makeEl('body') };

const rafQ = [];
const storeData = {};
let tNow = 0;
const win = {
  innerWidth: 420, innerHeight: 780, devicePixelRatio: 2, _lis: {},
  addEventListener: (t, f) => addLis(win._lis, t, f), removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout: () => {}, visualViewport: null,
  requestAnimationFrame: cb => rafQ.push(cb),
  localStorage: { getItem: k => (k in storeData ? storeData[k] : null), setItem: (k, v) => storeData[k] = v },
  scrollTo() {}, navigator: { vibrate() {}, maxTouchPoints: 1 }
};
const sandbox = { window: win, document: doc, navigator: win.navigator, localStorage: win.localStorage,
  requestAnimationFrame: win.requestAnimationFrame, setTimeout: win.setTimeout, clearTimeout: win.clearTimeout,
  devicePixelRatio: 2, innerWidth: 420, innerHeight: 780, matchMedia: win.matchMedia,
  console, Math, Date, Object, JSON, Number, String, Array, Boolean, parseInt, parseFloat, isNaN,
  Infinity, NaN, Set, Map, Symbol, Error, Promise, performance: { now: () => tNow } };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(js, sandbox, { filename: 'crabby-catch.js' });

let frameCb = rafQ.shift();
const step = (ms = 16.667) => { tNow += ms; const q = rafQ.splice(0, rafQ.length); q.forEach(cb => cb(tNow)); if (!q.length && frameCb) frameCb(tNow); };
const CC = win.CrabbyCatch, dbg = CC._debug;
const items = () => dbg.items();

function shot(name) {
  const file = path.join(OUT, name + '.png');
  fs.writeFileSync(file, elements.game.toBuffer('image/png'));
  console.log('wrote', file);
}

/* 1. menu (idle crab behind the overlay) */
for (let i = 0; i < 90; i++) step();
shot('01-menu');

/* 2. early play, crab mid-field with a normal wave */
CC.start();
dbg.crab.tx = 120; for (let i = 0; i < 40; i++) step();
shot('02-play');

/* 3. level 4 (darker theme, hazards + shield + particles on screen) */
CC.start();
dbg.game.level = 4; dbg.game.caught = 50; dbg.game.combo = 12; dbg.game.comboTimer = 2.0;
dbg.game.shield = 6; dbg.game.lives = 3;
for (let i = 0; i < 60; i++) { dbg.crab.tx = 210; step(); }
// guarantee one of every item type is visible for inspection
const types = ['shell','star','fish','pearl','bubble','heart','puffer','junk'];
types.forEach((t, i) => items().push({ type: t, x: 34 + i * 50, y: 150 + (i % 2) * 70, r: 19, vy: 0, vx: 0,
  sway: 0, ph: 0, rot: 0.1 * (i % 4 - 2), spin: 0, good: t !== 'puffer' && t !== 'junk', pulse: i }));
dbg.game.shield = 5;
step(); step();
shot('03-items-and-shield');

/* 4. damage flash + banner */
CC.start();
items().length = 0;
dbg.game.level = 5; dbg.game.lives = 1; dbg.game.combo = 9;
for (let i = 0; i < 30; i++) step();
dbg.hurt(210, 300);
step();
shot('04-hurt-flash');

/* 5. level-up banner: fill the catch quota, then catch one more to trigger it */
CC.start();
for (let i = 0; i < 30; i++) step();
dbg.game.caught = 13;                       // one catch away from level 2
items().length = 0;
items().push({ type: 'shell', x: dbg.crab.x, y: dbg.crab.y - 30, r: 19, vy: 0, vx: 0, sway: 0,
  ph: 0, rot: 0, spin: 0, good: true, pulse: 0 });
step(); step();
console.log('  level after quota catch: ' + dbg.game.level + ', banner: ' + JSON.stringify(dbg.game.banner && dbg.game.banner.text));
if (dbg.game.level < 2) throw new Error('level-up did not trigger');
for (let i = 0; i < 30; i++) step();       // ~0.5s in: banner fully faded in
shot('05-level-banner');
for (let i = 0; i < 60; i++) step();       // ~1.5s: fading out
shot('05b-level-banner-fading');

/* 6. tiny landscape viewport, tiny phone, big tablet */
[[740, 360, '06-landscape'], [320, 480, '07-small-phone'], [820, 1180, '08-tablet']].forEach(([w, h, name]) => {
  win.innerWidth = w; win.innerHeight = h;
  sandbox.innerWidth = w; sandbox.innerHeight = h;
  fire(win._lis, 'resize', {});
  console.log('  viewport ' + w + 'x' + h + ' -> canvas ' + elements.game.width + 'x' + elements.game.height);
  for (let i = 0; i < 8; i++) step();
  CC.start();
  for (let i = 0; i < 50; i++) { dbg.crab.tx = w * 0.6; step(); }
  shot(name);
});

/* 6b. item sheet: every sprite cleanly spaced so the art can be judged */
if (CC.state !== 'playing') CC.start();
items().length = 0;
dbg.game.banner = null;
const sheet = ['shell','star','fish','pearl','bubble','heart','puffer','junk'];
sheet.forEach((t, i) => items().push({ type: t, x: 70 + (i % 4) * 95, y: 150 + Math.floor(i / 4) * 110, r: 19,
  vy: 0, vx: 0, sway: 0, ph: 0, rot: 0, spin: 0, good: t !== 'puffer' && t !== 'junk', pulse: 0 }));
step(); step();
shot('10-item-sheet');

/* 7. far edges: crab hard against both walls */
win.innerWidth = 420; win.innerHeight = 780; fire(win._lis, 'resize', {});
for (let i = 0; i < 6; i++) step();
CC.start();
dbg.crab.tx = -999; for (let i = 0; i < 40; i++) step();
shot('09-left-edge');
console.log('visual frames done');

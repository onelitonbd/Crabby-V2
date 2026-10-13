/* Headless test harness for Crabby Catch.
   Stubs just enough DOM/Canvas to boot the real game code and drive the loop. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'crabby-catch.html'), 'utf8');
const js = src.match(/<script>([\s\S]*)<\/script>/)[1];

const listeners = {};             // element listeners
function addLis(map, type, fn) { (map[type] = map[type] || []).push(fn); }
function fire(map, type, ev) { (map[type] || []).forEach(fn => fn(Object.assign({
  preventDefault() {}, stopPropagation() {}, type, pointerId: 1, pointerType: 'touch', button: 0,
  clientX: 100, clientY: 100, target: null
}, ev))); }

function gradient() { return { addColorStop() {} }; }
function makeCtx() {
  const noop = () => {};
  const ctx = {
    canvas: null, globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: '', lineCap: '',
    font: '', textAlign: '', textBaseline: '', imageSmoothingQuality: '',
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, ellipse: noop, rect: noop,
    fill: noop, stroke: noop, clip: noop, fillRect: noop, clearRect: noop, strokeRect: noop,
    drawImage: noop, strokeText: noop, fillText: noop, setLineDash: noop,
    scale: noop, translate: noop, rotate: noop, setTransform: noop, transform: noop,
    measureText: () => ({ width: 10 }),
    createLinearGradient: gradient, createRadialGradient: gradient, createPattern: () => null,
    getImageData: () => ({ data: [] })
  };
  return ctx;
}
function makeCanvas() {
  const c = { width: 300, height: 150, style: {}, tagName: 'CANVAS', _lis: {},
    getContext: () => makeCtx(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 700 }) };
  c.addEventListener = (t, f) => addLis(c._lis, t, f);
  c.removeEventListener = () => {};
  c.setPointerCapture = () => { c._captured = true; };
  return c;
}

const elements = {};
function makeEl(id) {
  const el = { id, style: {}, _lis: {}, textContent: '', innerHTML: '', classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) { on === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (on ? this._s.add(c) : this._s.delete(c)); },
      contains(c) { return this._s.has(c); }
    } };
  el.addEventListener = (t, f) => addLis(el._lis, t, f);
  el.removeEventListener = () => {};
  el.querySelectorAll = () => [];
  return el;
}
['game','hud','score','scoreLabel','level','combo','comboText','comboBarWrap','comboBar',
 'lives','btns','btnPause','btnMute','btnFull','overlay','panel','pauseLayer','btnResume','btnQuit','stage']
 .forEach(id => elements[id] = id === 'game' ? makeCanvas() : makeEl(id));

const rafQ = [];
const storeData = {};
const doc = {
  hidden: false, fullscreenElement: null, _lis: {},
  getElementById: id => elements[id] || null,
  createElement: tag => (tag === 'canvas' ? makeCanvas() : makeEl(tag)),
  querySelectorAll: () => [],           // menu buttons: we drive start() directly
  addEventListener: (t, f) => addLis(doc._lis, t, f),
  removeEventListener: () => {},
  body: makeEl('body'), documentElement: makeEl('html'),
  exitFullscreen: () => Promise.resolve()
};

const win = {
  innerWidth: 400, innerHeight: 700, devicePixelRatio: 2,
  _lis: {},
  addEventListener: (t, f) => addLis(win._lis, t, f),
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  setTimeout: f => { try { f(); } catch (e) {} return 0; }, clearTimeout: () => {},
  requestAnimationFrame: cb => { rafQ.push(cb); return rafQ.length; },
  visualViewport: null,
  AudioContext: undefined, webkitAudioContext: undefined,
  navigator: { vibrate: () => {}, maxTouchPoints: 1, userAgent: 'node' },
  localStorage: { getItem: k => (k in storeData ? storeData[k] : null), setItem: (k, v) => storeData[k] = String(v) },
  scrollTo: () => {},
  performance: { now: () => tNow }
};
win.window = win;

let tNow = 0;
const sandbox = {
  window: win, document: doc, navigator: win.navigator, localStorage: win.localStorage,
  requestAnimationFrame: win.requestAnimationFrame, setTimeout: win.setTimeout, clearTimeout: win.clearTimeout,
  devicePixelRatio: 2, innerWidth: 400, innerHeight: 700,
  matchMedia: win.matchMedia, console, Math, Date, Object, JSON, Number, String, Array, Boolean,
  parseInt, parseFloat, isNaN, Infinity, NaN, Set, Map, Symbol, Error, Promise, performance: win.performance
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

console.log('--- boot ---');
try {
  vm.runInContext(js, sandbox, { filename: 'crabby-catch.js' });
} catch (e) { console.error('BOOT FAILED:', e); process.exit(1); }
console.log('booted, raf queue:', rafQ.length, '| state:', sandbox.window.CrabbyCatch.state);

/* frame driver: our driver re-queues like a real rAF */
let frameCb = rafQ.shift();
function step(ms) {
  tNow += ms;
  const q = rafQ.splice(0, rafQ.length);
  q.forEach(cb => cb(tNow));
  if (!q.length && frameCb) { frameCb(tNow); }
}
function run(seconds, ms = 16.667) {
  for (let i = 0; i < seconds * 1000 / ms; i++) step(ms);
}

const CC = sandbox.window.CrabbyCatch;
const dbg = CC._debug;
const items = () => dbg.items();
let fails = 0;
function ok(cond, label, extra) {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra !== undefined ? '   [' + extra + ']' : ''));
  if (!cond) fails++;
}

/* ---- menu idles ---- */
run(0.5);
ok(CC.state === 'menu', 'idles in menu state');
ok(items().length === 0, 'no items spawn on the menu');

/* ---- start + natural play (no input: crab sits centre) ---- */
CC.start();
ok(CC.state === 'playing', 'start() enters playing');
run(6);
ok(items().length > 0, 'items are falling', 'count=' + items().length);
ok(dbg.game.score >= 0, 'score initialised', dbg.game.score);

/* ---- play 40s with lives topped up: the clock and score must keep moving ---- */
const scoreBefore = dbg.game.score;
for (let i = 0; i < 2400; i++) { dbg.game.lives = 3; step(16.667); }   // keep the run alive
ok(dbg.game.elapsed > 39.5, 'clock advances for 40s of play', dbg.game.elapsed.toFixed(1) + 's');
ok(dbg.game.score >= scoreBefore, 'score never decreases', scoreBefore + ' -> ' + dbg.game.score);
ok(dbg.game.level > 1, 'difficulty ramps up over time', 'level=' + dbg.game.level + ' after ' + dbg.game.caught + ' catches');

/* ---- forced catches: good items always score, combos build ---- */
CC.start();
const g = dbg.game;
for (let i = 0; i < 40; i++) {
  dbg.spawnWave();
  run(0.25);
}
ok(g.score > 0, 'wave spawning produces score', 'score=' + g.score);
ok(g.level >= 1 && g.level <= 9, 'level stays in range', 'level=' + g.level);
ok(g.bestCombo >= 1, 'combo counter tracks', 'best=' + g.bestCombo);

/* ---- simulate a real drag: pointer events move the crab ---- */
CC.start();
const cvs = elements.game;
fire(cvs._lis, 'pointerdown', { clientX: 60, clientY: 600 });
run(0.6);
const xLeft = dbg.crab.x;
fire(cvs._lis, 'pointermove', { clientX: 340, clientY: 600 });
run(0.6);
const xRight = dbg.crab.x;
ok(Math.abs(xLeft - 60) < 40, 'crab drags to left touch x', xLeft.toFixed(1));
ok(xRight > xLeft + 100, 'crab follows the finger to the right', xLeft.toFixed(1) + ' -> ' + xRight.toFixed(1));
fire(cvs._lis, 'pointerup', {});
run(0.2);

/* ---- crab is clamped inside the screen ---- */
fire(cvs._lis, 'pointerdown', { clientX: -500, clientY: 600 });
run(0.8);
ok(dbg.crab.x >= 45, 'crab stays fully on screen at the left edge', dbg.crab.x.toFixed(1));
fire(cvs._lis, 'pointermove', { clientX: 5000, clientY: 600 });
run(0.8);
ok(dbg.crab.x <= 355, 'crab stays fully on screen at the right edge', dbg.crab.x.toFixed(1));
fire(cvs._lis, 'pointerup', {});
run(0.2);

/* ---- keyboard steering ---- */
const keyBefore = dbg.crab.x;
fire(win._lis, 'keydown', { key: 'ArrowLeft' });
run(0.7);
fire(win._lis, 'keyup', { key: 'ArrowLeft' });
ok(dbg.crab.x < keyBefore, 'arrow keys steer', keyBefore.toFixed(1) + ' -> ' + dbg.crab.x.toFixed(1));

/* ---- pause / resume ---- */
CC.pause();
ok(CC.state === 'paused', 'pause works');
const pausedItems = items().length, pausedElapsed = g.elapsed;
run(3);
ok(items().length === pausedItems && g.elapsed === pausedElapsed, 'world is frozen while paused');
CC.resume();
run(1);
ok(CC.state === 'playing', 'resume works');
ok(g.elapsed > pausedElapsed, 'clock restarts after resume');

/* ---- damage: shield blocks, hazards hurt, 0 lives ends the run ---- */
CC.start();
const gg = dbg.game;
gg.level = 4;                       // hazards are common by now
gg.lives = 3;
let guard = 0;
while (gg.lives > 0 && guard < 6000) { run(0.2); guard++; }
ok(gg.lives === 0, 'hazards can drain all lives', 'lives=' + gg.lives);
ok(CC.state === 'over', 'game over state reached');
ok(dbg.game.best >= dbg.game.score, 'best score recorded', 'best=' + dbg.game.best);

/* ---- restart after game over ---- */
CC.start();
ok(CC.state === 'playing' && dbg.game.lives === 3 && dbg.game.score === 0, 'restart resets the run',
   'lives=' + dbg.game.lives + ' score=' + dbg.game.score);

/* ---- shield power-up absorbs one hazard ---- */
CC.start();
const s2 = dbg.game;
s2.level = 3;
s2.shield = 6;
const livesBeforeShield = s2.lives;
s2.combo = 6; s2.comboTimer = 2.5;   // a live combo to trim
items().push({ type: 'puffer', x: dbg.crab.x, y: dbg.crab.y - 60, r: 20, vy: 300, vx: 0, sway: 0, ph: 0, rot: 0, spin: 0, good: false, pulse: 0 });
run(0.6);
ok(s2.lives === livesBeforeShield && s2.shield === 0, 'shield absorbs a hazard without costing a life',
   'lives=' + s2.lives + ' shield=' + s2.shield);
ok(s2.combo === 3, 'blocked hit only trims the combo instead of ending it', s2.combo);
// and with no shield the same hit does cost a life
const livesBeforeHit = s2.lives;
items().push({ type: 'junk', x: dbg.crab.x, y: dbg.crab.y - 60, r: 20, vy: 300, vx: 0, sway: 0, ph: 0, rot: 0, spin: 0, good: false, pulse: 0 });
run(0.6);
ok(s2.lives === livesBeforeHit - 1, 'unshielded hazard costs exactly one life',
   livesBeforeHit + ' -> ' + s2.lives);

/* ---- reflow: landscape phone, tiny phone, tablet ---- */
function checkViewport(w, h) {
  if (CC.state !== 'playing') CC.start();
  win.innerWidth = w; win.innerHeight = h;
  fire(win._lis, 'resize', {});
  run(1);
  const S = Math.max(0.58, Math.min(w / 400, h / 690));   // game's own scale rule
  const half = (96 * S) / 2 + 5 * S;                       // crab half-width + margin
  return { w, h, half, x: dbg.crab.x, ok: dbg.crab.x >= half - 0.5 && dbg.crab.x <= w - half + 0.5,
           onScreen: dbg.crab.x - half >= -0.5 && dbg.crab.x + half <= w + 0.5 };
}
const land = checkViewport(740, 360);
ok(land.onScreen, 'landscape phone: crab fully on screen', 'x=' + land.x.toFixed(1) + ' half=' + land.half.toFixed(1));
const tiny = checkViewport(320, 480);
ok(tiny.onScreen, '320px phone: crab fully on screen', 'x=' + tiny.x.toFixed(1));
const tab = checkViewport(820, 1180);
ok(tab.onScreen, 'tablet: crab fully on screen', 'x=' + tab.x.toFixed(1));
// drag to each wall at a new size: the sprite must stay fully visible
function dragTo(w, h, clientX) {
  if (CC.state !== 'playing') CC.start();
  win.innerWidth = w; win.innerHeight = h;
  fire(win._lis, 'resize', {});
  fire(elements.game._lis, 'pointerdown', { clientX: clientX, clientY: h * 0.7 });
  run(1.2);
  fire(elements.game._lis, 'pointerup', {});
  return { w, x: dbg.crab.x, S: Math.max(0.58, Math.min(w / 400, h / 690)) };
}
const wl = dragTo(320, 480, -800);
const wr = dragTo(320, 480, 900);
const halfTiny = (96 * wl.S) / 2 + 5 * wl.S;
ok(wl.x - halfTiny >= -0.5, '320px: crab cannot be dragged off the left wall', wl.x.toFixed(1));
ok(wr.x + halfTiny <= 320.5, '320px: crab cannot be dragged off the right wall', wr.x.toFixed(1));
fire(elements.game._lis, 'pointerup', {});
win.innerWidth = 400; win.innerHeight = 700;
fire(win._lis, 'resize', {});
run(0.5);
ok(items().every(it => it.x > -60 && it.x < 460), 'items stay near the visible bounds after reflow');

/* ---- long soak: no crashes, no runaway object growth ---- */
CC.start();
let maxItems = 0, maxParts = 0;
for (let i = 0; i < 150; i++) {
  dbg.crab.tx = 100 + (i % 3) * 100;   // sweep around like a real player
  run(0.3);
  maxItems = Math.max(maxItems, items().length);
  if (dbg.game.lives <= 0) CC.start();
}
ok(maxItems < 60, 'item count stays bounded', 'max=' + maxItems);
ok(true, '150-wave soak completed without throwing');

console.log('\n' + (fails ? 'FAILURES: ' + fails : 'ALL CHECKS PASSED'));
process.exit(fails ? 1 : 0);

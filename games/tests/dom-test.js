/* End-to-end DOM integration test: loads the real crabby-catch.html in jsdom
   (canvas is stubbed, everything else is genuine DOM/CSS), drives the actual
   buttons and overlays, and asserts the UI wiring a player touches.
   Dev-only. Requires jsdom. Run: node tests/dom-test.js */
const fs = require('fs');
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

const JSDOMmod = optionalRequire('jsdom', ['/tmp/domtest/node_modules/jsdom', './node_modules/jsdom', __dirname + '/../node_modules/jsdom']);
const JSDOM = JSDOMmod && JSDOMmod.JSDOM;
if (!JSDOM) { console.log('SKIP dom test (jsdom not installed: npm i -D jsdom)'); process.exit(0); }

const html = fs.readFileSync(path.join(__dirname, '..', 'crabby-catch.html'), 'utf8');

/* --- canvas stub: jsdom has no 2D context --- */
function gradientStub() { return { addColorStop() {} }; }
function ctxStub() {
  const noop = () => {};
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return gradientStub;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return () => ({ data: [] });
      if (k === 'canvas') return t._c;
      if (typeof k === 'string' && !(k in t)) return noop;
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let fails = 0, passes = 0;
function ok(cond, label, extra) {
  if (cond) { passes++; console.log('PASS  ' + label); }
  else { fails++; console.log('FAIL  ' + label + (extra !== undefined ? '   [' + extra + ']' : '')); }
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.test/games/crabby-catch.html',
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function () {
      const c = ctxStub(); c._c = this; return c;
    };
    // deterministic rAF driven by the test
    const q = [];
    window.__raf = q;
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    // jsdom lacks PointerEvent
    window.PointerEvent = window.MouseEvent;
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, addListener() {} }));
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    window.navigator.vibrate = () => {};
    const errs = [];
    window.__errors = errs;
    window.addEventListener('error', e => errs.push(String(e.message || e.error)));
    window.onerror = (m) => errs.push(String(m));
  }
});
const win = dom.window, doc = win.document;

let tNow = 0;
function step(ms = 16.667) {
  tNow += ms;
  const q = win.__raf.splice(0, win.__raf.length);
  q.forEach(cb => cb(tNow));
}
function run(sec) { for (let i = 0; i < sec * 60; i++) step(); }
function click(el, type = 'click') {
  el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
}

const $ = id => doc.getElementById(id);
const CC = win.CrabbyCatch;

/* ---------------- boot / menu ---------------- */
step(); step();
ok(!!CC, 'game exposes its debug handle');
ok(CC.state === 'menu', 'boots to the menu screen');
ok($('overlay').classList.contains('on'), 'menu overlay is visible on boot');
const menuText = $('panel').textContent;
ok(/CRABBY/.test(menuText) && /CATCH/.test(menuText), 'menu shows the title');
ok(/Shell · 10/.test(menuText) && /Pearl · 100/.test(menuText), 'menu shows the catch values');
ok(/Avoid/.test(menuText), 'menu warns about hazards');
ok(/PLAY/.test(menuText), 'menu has a Play button');
ok($('pauseLayer').classList.contains('on') === false, 'pause layer hidden on boot');
ok($('hud').classList.contains('on') === false, 'HUD hidden on the menu');

/* ---------------- play button (real click) ---------------- */
const playBtn = $('panel').querySelector('button[data-menu]');
ok(!!playBtn, 'play button is wired in the DOM');
click(playBtn);
ok(CC.state === 'playing', 'clicking PLAY starts the game');
ok(!$('overlay').classList.contains('on'), 'overlay hides when playing');
ok($('hud').classList.contains('on') && $('btns').classList.contains('on'), 'HUD + buttons appear');

/* ---------------- HUD reacts to play ---------------- */
run(3);
ok(CC._debug.items().length > 0, 'treasure spawns after starting', CC._debug.items().length);
ok(Number($('score').textContent) === CC._debug.game.score, 'score text matches state',
   $('score').textContent + ' vs ' + CC._debug.game.score);
ok($('lives').textContent.length === 5, 'lives row renders five hearts', $('lives').innerHTML);
ok($('level').textContent === 'LEVEL ' + CC._debug.game.level, 'level label matches', $('level').textContent);

/* force a catch and confirm the HUD + combo UI update */
const cc = win.CrabbyCatch;
const dbg = cc._debug;
dbg.game.combo = 4; dbg.game.comboTimer = 2;
dbg.items().push({ type: 'fish', x: dbg.crab.x, y: dbg.crab.y - 20, r: 20, vy: 0, vx: 0, sway: 0, ph: 0, rot: 0, spin: 0, good: true, pulse: 0 });
const scoreBefore = dbg.game.score;
step(); step();
ok(dbg.game.score > scoreBefore, 'catching a fish scores', scoreBefore + ' -> ' + dbg.game.score);
ok($('score').textContent === String(dbg.game.score), 'score label updates on catch', $('score').textContent);
ok(/\u00d7/.test($('comboText').textContent), 'combo chip shows a multiplier', JSON.stringify($('comboText').textContent));
ok($('comboBarWrap').classList.contains('on'), 'combo timer bar is shown');
ok(parseFloat($('comboBar').style.width) > 0, 'combo bar has a width', $('comboBar').style.width);

/* ---------------- touch / drag control on the real canvas ---------------- */
const cvs = $('game');
function pointer(type, x, y) {
  const ev = new win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  Object.defineProperty(ev, 'pointerType', { value: 'touch' });
  Object.defineProperty(ev, 'button', { value: 0 });
  cvs.dispatchEvent(ev);
}
Object.defineProperty(cvs, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 390, height: 700, right: 390, bottom: 700 }) });
pointer('pointerdown', 70, 500);
run(0.7);
const leftX = dbg.crab.x;
pointer('pointermove', 320, 500);
run(0.7);
const rightX = dbg.crab.x;
pointer('pointerup', 320, 500);
ok(Math.abs(leftX - 70) < 45, 'touch drag moves the crab left', leftX.toFixed(1));
ok(rightX > leftX + 120, 'touch drag crosses the screen', leftX.toFixed(1) + ' -> ' + rightX.toFixed(1));
ok(dbg.crab.x - 55 >= -1 && dbg.crab.x + 55 <= 391, 'crab never leaves the play area', dbg.crab.x.toFixed(1));

/* ---------------- pause button / resume ---------------- */
click($('btnPause'));
ok(CC.state === 'paused', 'pause button pauses');
ok($('pauseLayer').classList.contains('on'), 'pause panel shows');
const frozen = [dbg.game.elapsed, dbg.items().length];
run(2);
ok(dbg.game.elapsed === frozen[0] && dbg.items().length === frozen[1], 'world freezes while paused');
click($('btnResume'));
ok(CC.state === 'playing' && !$('pauseLayer').classList.contains('on'), 'resume button restarts play');

/* ---------------- quit to menu ---------------- */
click($('btnPause'));
click($('btnQuit'));
ok(CC.state === 'menu', 'quit returns to the menu');
ok($('overlay').classList.contains('on'), 'menu overlay returns');
ok(/CRABBY/.test($('panel').textContent), 'menu is re-rendered');
ok(dbg.game.score === 0 && dbg.game.lives === 3, 'quit resets the run', dbg.game.score + '/' + dbg.game.lives);
ok(!$('hud').classList.contains('on'), 'HUD hides on the menu');

/* ---------------- mute toggle persists ---------------- */
const muteBefore = $('btnMute').textContent;
click($('btnMute'));
ok($('btnMute').textContent !== muteBefore, 'mute button flips its icon', muteBefore + ' -> ' + $('btnMute').textContent);
ok(win.localStorage.getItem('crabby.muted') === '1' || win.localStorage.getItem('crabby.muted') === '0',
   'mute preference is saved', win.localStorage.getItem('crabby.muted'));

/* ---------------- keyboard ---------------- */
click($('panel').querySelector('button[data-menu]'));
run(1);
win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
ok(CC.state === 'paused', 'Escape pauses');
win.dispatchEvent(new win.KeyboardEvent('keydown', { key: ' ' }));
ok(CC.state === 'playing', 'Space resumes');

/* ---------------- auto-pause when the app is backgrounded ---------------- */
Object.defineProperty(doc, 'hidden', { value: true, configurable: true });
doc.dispatchEvent(new win.Event('visibilitychange'));
ok(CC.state === 'paused', 'switch away from the tab auto-pauses');
Object.defineProperty(doc, 'hidden', { value: false, configurable: true });
doc.dispatchEvent(new win.Event('visibilitychange'));
ok(CC.state === 'paused', 'returning keeps it paused until the player resumes (no cheap death)');
click($('btnResume'));
ok(CC.state === 'playing', 'resume after returning to the tab works');

/* ---------------- game over flow ---------------- */
click($('btnPause')); click($('btnQuit'));
click($('panel').querySelector('button[data-menu]'));
run(1);
dbg.game.score = 137;             // a real run has points on the board
dbg.game.lives = 1;
dbg.game.combo = 0;
dbg.hurt(dbg.crab.x, dbg.crab.y - 40);
ok(CC.state === 'over', 'losing the last life ends the run');
ok($('overlay').classList.contains('on'), 'game-over overlay shows');
const overText = $('panel').textContent;
ok(/Game over/i.test(overText), 'game-over screen has a heading');
ok(/BEST/.test(overText), 'game-over screen shows the best score');
ok(/PLAY AGAIN/.test(overText), 'game-over screen offers a replay');
ok(win.localStorage.getItem('crabby.best') !== null, 'best score persisted to localStorage',
   win.localStorage.getItem('crabby.best'));
click($('panel').querySelector('button[data-menu]'));
ok(CC.state === 'playing' && dbg.game.lives === 3, 'replay from game over works');

/* ---------------- HUD stays hidden from the menu crab ---------------- */
ok(/Shell · 10/.test($('panel').textContent) === false, 'in-game screen has no legend clutter');

/* ---------------- safe-area / viewport meta present ---------------- */
const meta = doc.querySelector('meta[name=viewport]').getAttribute('content');
ok(/viewport-fit=cover/.test(meta), 'viewport meta opts into safe areas');
ok(/user-scalable=no/.test(meta), 'viewport meta blocks accidental pinch zoom');
ok(/width=device-width/.test(meta), 'viewport meta is responsive');

/* ---------------- no runtime errors anywhere ---------------- */
ok(win.__errors.length === 0, 'no window errors during the whole session', win.__errors.join(' | '));

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);

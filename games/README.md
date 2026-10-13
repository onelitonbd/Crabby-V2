# 🦀 Crabby Catch

A one-thumb arcade game in a **single HTML file** — no build step, no dependencies, no network calls.
Open `crabby-catch.html` in any modern browser, or serve it and open it on your phone.

```
# play it locally
open games/crabby-catch.html            # macOS
xdg-open games/crabby-catch.html        # Linux

# play it on your phone (same Wi-Fi)
python3 -m http.server 8000 --bind 0.0.0.0 --directory games
# then visit http://<your-computer-ip>:8000/crabby-catch.html
```

## How to play

The tide drops treasure past your crab — catch the good, dodge the sharp.

| Catch | Points | | Avoid | Effect |
|---|---|---|---|---|
| 🐚 Shell | 10 | | 🐡 Puffer | −1 life |
| ⭐ Starfish | 15 | | 🧴 Plastic junk | −1 life |
| 🐟 Fish | 25 | | | |
| 💎 Pearl | 100 | | 🫧 Bubble | grants a shield (absorbs one hit) |
| | | | ❤️ Heart | +1 life (max 5) |

- **Catching in a row** builds a combo. At 5 catches the multiplier goes to ×2 and climbs to ×8;
  it decays ~2.5s after your last catch, and a missed catch resets it.
- **Every 14 catches** you go one level deeper: items fall faster, spawn sooner, and hazards
  get more common — the water also darkens as you descend (6 themes, capped at level 9).
- **A run ends** when you lose all 3 lives. Best score and best combo are saved locally.

## Controls

| Platform | Move | Pause | Mute | Fullscreen |
|---|---|---|---|---|
| Phone / tablet | drag anywhere | ❚❚ button | 🔊 button | ⛶ button |
| Desktop | drag, or ← → / A D | `P` / `Esc` / `Space` | `M` | ⛶ button |

Tapping the dim area around the menu card also starts a run.

## Mobile support

- **Pointer Events** (touch, mouse, pen) with pointer capture — no `touchstart`/mouse split code,
  and no 300ms tap delay.
- **Viewport safe** — `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, so the HUD clears
  notches, Dynamic Island and the home indicator.
- **No browser gestures hijacking play** — pinch-zoom, double-tap-zoom, long-press callouts and
  rubber-band scrolling are all suppressed on the play surface; the menu still scrolls when short.
- **Retina-aware** — the main canvas and every pre-rendered sprite are drawn at
  `min(devicePixelRatio, 2)`; `visualViewport` drives resizes so the layout survives the mobile URL
  bar collapsing/expanding.
- **Scales to every screen** — sizes derive from a design unit, so a 320px phone and an 820px tablet
  both get a sane crab, fall speed, and spacing (clamped scale 0.58–1.9).
- **Auto-pause** when the app is backgrounded (`visibilitychange` / `blur` / `pagehide`), and it
  stays paused until you tap resume — no cheap death while you answer a text.
- **Sound unlocked on first tap** (iOS requirement) with a small WebAudio synth: no audio files.
  Mute state persists; vibration feedback where supported.
- **Respects `prefers-reduced-motion`** (reduced shook/particles) and never requires a keyboard.
- Big 52px+ touch targets for pause/mute/fullscreen; `localStorage` access is guarded so private
  mode can't throw.

## Tests (dev only)

The game itself has zero dependencies; the harnesses that verify it are optional.

```bash
node games/tests/headless-test.js    # logic + physics + difficulty, pure node
node games/tests/dom-test.js         # real DOM wiring via jsdom (npm i -D jsdom)
node games/tests/visual-test.js      # renders PNG frames (@napi-rs/canvas)
```

- `headless-test.js` — boots the actual game code against a stubbed canvas and checks ~40 behaviours:
  spawning, catch/hazard resolution, combo math, level ramp, pause semantics, boundary clamping,
  reflow at 320/740/820px, and a 150-wave soak for leaks or runaway object growth.
- `dom-test.js` — loads the real HTML in jsdom, clicks the real buttons, and asserts the overworld:
  menu ⇄ play ⇄ pause ⇄ game-over flow, HUD text, localStorage persistence, and zero runtime errors.
- `visual-test.js` — renders frames (menu, mid-play, item sheet, level-up banner, damage flash,
  landscape/small-phone/tablet) to `$RENDER_DIR` (default `/tmp/render-crabby`) for eyeballing.

Both DOM harnesses skip cleanly if their optional dependency isn't installed.

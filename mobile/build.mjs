// Builds mobile/index.html, the phone version of the game, from ../index.html (which stays the laptop
// version and is never edited by this script). Run after any change to the game:
//   node mobile/build.mjs
// The phone version is the same game and the same gems, with the zoomed camera always on and every
// drag replaced by a tap: a tapped branch shakes itself, the can pours where you tap, the rake sweeps
// where you tap, and a tap on the balloon with the twig pops it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let s = readFileSync(join(here, '..', 'index.html'), 'utf8');

function swap(from, to) {
  if (!s.includes(from)) throw new Error('mobile build: the game changed, update this anchor:\n' + from);
  s = s.replace(from, to);
}

// page
swap('<title>Casa de Gemas · a little garden of hidden gems</title>', '<title>Casa de Gemas · phone</title>');
swap('@media (pointer:coarse){#touchTip{display:flex}}', '#touchTip{display:flex}');
swap('>drag to look around · pinch to zoom<', '>tap to play · drag to look around · pinch to zoom<');

// the zoomed camera is always on, even when a laptop browser opens this page
swap("const cam = { on: matchMedia('(pointer: coarse)').matches,", 'const cam = { on: true,');

// Oli speaks in taps
swap("tip: 'Grab a branch and give it a good shake!'", "tip: 'Tap a branch to give it a good shake!'");
swap("tip: 'The kite is tangled in the branches. Give the tree a good shake!'", "tip: 'The kite is tangled in the branches. Tap the tree to shake it!'");
swap('Pick up the can and water it!', 'Tap the can, then tap the seed to water it!');
swap("tip: 'Grab the rake and sweep up the leaves. Watch them pile up at her feet!'", "tip: 'Tap the rake, then tap the leaves to sweep them. Watch them pile up at her feet!'");
swap("say('Pick up the watering can and give the tree bed a drink!', 5)", "say('Tap the watering can, then tap the tree bed to give it a drink!', 5)");
swap('Water them, or let your butterfly rest on one...', 'Water them, or tap one and wait...');
swap('Pick up the twig and tap the pots to knock it off...', 'Tap the twig, then tap the pots to knock it off...');

// tap actions: a short scripted motion that runs after the finger has already lifted
swap('function release() {', `let tapAct = null;
function startTapAct(kind, dur, x = mouse.x, y = mouse.y) { tapAct = { kind, x, y, t0: time, dur }; }
function endTapAct() {
  const a = tapAct; tapAct = null;
  if (a.kind === 'shake' && grab) Music.sparkle(false);
  grab = null; can.pouring = false;
}
function updateTapAct(dt) {
  if (!tapAct) return;
  const a = tapAct, t = time - a.t0;
  if (t >= a.dur) { endTapAct(); return; }
  const px = mouse.x, py = mouse.y;
  if (a.kind === 'shake') {
    const env = Math.min(1, t * 5) * (1 - t / a.dur);
    mouse.x = a.x + Math.sin(t * 26) * 34 * env; mouse.y = a.y + Math.sin(t * 19) * 12 * env;
    grabTravel += Math.hypot(mouse.x - px, mouse.y - py); if (grabTravel > 350) found('shake');
  } else if (a.kind === 'rake') {
    // the rake chases the leaves around the tapped spot one by one, then scratches back and forth
    let near = null, nd = 120;
    for (const l of litter) {
      if (l.swept || l.a < .5) continue;
      const d = Math.hypot(l.x - a.x, l.y - a.y);
      if (d < nd) { nd = d; near = l; }
    }
    // the tines sit a little left of and below the point the rake follows
    if (near) { const f = Math.min(1, dt * 10); mouse.x += (near.x + 2 - mouse.x) * f; mouse.y += (near.y - 6 - mouse.y) * f; }
    else { mouse.x = a.x + Math.sin(t * 7) * 30; mouse.y = a.y + Math.sin(t * 3.5) * 8; }
  } else { mouse.x = a.x; mouse.y = a.y; can.pouring = true; }
  mouse.vx = (mouse.x - px) / Math.max(dt, .001); mouse.vy = (mouse.y - py) / Math.max(dt, .001);
}
function release() {
  if (tapAct) return;`);
swap('  updateCam(dt);\n', '  updateCam(dt);\n  updateTapAct(dt);\n');
// a new tap ends the one still playing; moves during a tap action don't steer it
swap("cv.addEventListener('pointerdown', e => {\n", "cv.addEventListener('pointerdown', e => {\n  if (tapAct) endTapAct();\n");
swap("  if (pinch) { if (touches.size >= 2) movePinch(); return; }\n", "  if (pinch) { if (touches.size >= 2) movePinch(); return; }\n  if (tapAct) return;\n");
swap('  if (rake.held) { if (rakeAt(fx, fy)) rake.held = false; relift(); return; }',
  // a tap on the stones sweeps there (leaves gather by the rake's home, so only a tap right on the rake
  // with no leaf under it puts it down); a tap anywhere above the stones puts the rake down and goes on
  '  if (rake.held && fy < FLOOR.y0 - 40) { rake.held = false; relift(); }\n' +
  '  if (rake.held) {\n' +
  '    const leafy = litter.some(l => !l.swept && Math.hypot(l.x - fx, l.y - fy) < 24);\n' +
  '    if (rakeAt(fx, fy) && !leafy) rake.held = false; else startTapAct(\'rake\', 1.8, fx + 2, fy - 6);\n' +
  '    relift(); return;\n' +
  '  }');
// the birthday message fills the top of a tall phone screen, so the title steps aside for it
swap('  msgShown = ready;\n', "  msgShown = ready;\n  hint.style.opacity = msgA > .05 ? '0' : '';\n");
// and Oli's bubble, pinned to the top corner when the owl is off screen, waits just below the message
swap('  bx = clamp(bx, vl, vr - w); by = clamp(by, top, bot - h);\n',
  '  if (msgA > .05) by = Math.max(by, CHIMNEY.y - 10);\n  bx = clamp(bx, vl, vr - w); by = clamp(by, top, bot - h);\n');
swap('    if (twigAt(fx, fy) || canAt(fx, fy)) twig.held = false;\n',
  '    if (twigAt(fx, fy) || canAt(fx, fy)) twig.held = false;\n' +
  '    else if (season === 1 && !balloon.popped && balloon.grow >= 1 && Math.hypot(fx - balloon.x, fy - balloon.y) < Math.max(34, 26 * dpr / B)) popBalloon();\n');
swap('    can.pouring = true; cv.setPointerCapture(e.pointerId); return;', "    can.pouring = true; startTapAct('pour', 2.6); return;");
swap('  const h = pick(); if (h) { grab = h; grabTravel = 0; cv.setPointerCapture(e.pointerId); }',
  "  const h = pick(); if (h) { grab = h; grabTravel = 0; startTapAct('shake', 1.6); }");

// the doctype has to stay first, or browsers drop into quirks mode
swap('<!doctype html>\n', '<!doctype html>\n<!-- Generated from ../index.html by mobile/build.mjs. Edit the game there, then run: node mobile/build.mjs -->\n');
writeFileSync(join(here, 'index.html'), s);
console.log('wrote mobile/index.html');

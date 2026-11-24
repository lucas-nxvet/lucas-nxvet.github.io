/* Extero homepage behaviour for sections/nx-extero-home.liquid (no loader since 2026-11-11, Lucas): the hero entrance, the LED ring states of the two device pictures, the callouts of
   "Your device at a glance" (reveal on scroll, leader lines, hover focus), the zoom from the hero into "Your device at a glance" (desktop, scroll-scrubbed),
   (the homepage pricing section and its toggles were removed on 2026-11-11). Only opacity and transform move and the page is never locked. The hidden hero (nxx-pre) is in the markup from the first
   paint and revealed at boot; a CSS safety net reveals it if a script never runs. Shared pieces (reveal on scroll, Book a demo, sticky mobile bar,
   analytics events) come from nx-home.js. */
(() => {
'use strict';
const root = document.querySelector('.nxx');
if (!root) return;
const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const track = (event, params = {}) => dispatchEvent(new CustomEvent('nxvet:analytics', { detail: { event, ...params } }));
const EASE = 'cubic-bezier(.4,0,.2,1)';

const hero = $('.nxx-hero');
const stage = $('.nxx-glance-stage'), glanceDevice = stage && $('.nxx-device', stage), lines = stage && $('.nxx-lines', stage);
const hs = stage ? $$('.nxx-hs', stage) : [];
const card = $('.nxx-hscard'), cardItems = card ? $$('[data-for]', card) : [];
const DEFAULT_HS = Math.max(0, hs.findIndex(b => b.dataset.hs === 'main'));

/* ---------- LED ring states, one timer per device picture ---------- */
const CYCLE = ['green', 'cyan', 'blue', 'red'];
const cycles = new Map();
function setLed(dev, state) {
  if (!dev) return;
  clearInterval(cycles.get(dev));
  if (state === 'cycle') {
    let k = 0; dev.dataset.led = CYCLE[0];
    cycles.set(dev, setInterval(() => { k = (k + 1) % CYCLE.length; dev.dataset.led = CYCLE[k]; }, 950));
    return;
  }
  dev.dataset.led = state || 'blue';
}
// The masked LED overlays use the picture the browser chose for each device
$$('.nxx-device').forEach(dev => {
  const img = $('img', dev); if (!img) return;
  const use = () => { const src = img.currentSrc || img.src; if (src) dev.style.setProperty('--nxx-device', 'url("' + src + '")'); };
  if (img.complete) use(); else img.addEventListener('load', use, { once: true });
});

/* ---------- Hero entrance (at boot): the copy and the photo rise; the glance device breathes cyan until its
   callouts take over (review with Gerard, 2026-11-03: cyan, not blue, for consistency; no boot spin first) ---------- */
function start() {
  if (!hero || hero.classList.contains('is-in')) return;
  hero.classList.add('is-in');
  if (!revealed) setLed(glanceDevice, 'cyan');
}

/* ---------- Callouts: a pin on the device (--x, --y), a label beside it (--lx, --ly), a leader line drawn between them ---------- */
const lineOf = new Map();
let revealed = false, hovered = null, activeIdx = -1, leaveTimer = 0, rafLines = 0;
const num = (b, name) => parseFloat(b.style.getPropertyValue(name)) || 0;
function drawLines() {
  if (!stage || !glanceDevice || !lines || getComputedStyle(lines).display === 'none') return;
  const w = glanceDevice.clientWidth, h = glanceDevice.clientHeight;
  if (!w || !h) return;
  lines.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  hs.forEach(b => {
    let ln = lineOf.get(b);
    if (!ln) { ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); lines.append(ln); lineOf.set(b, ln); }
    const span = $('span', b);
    const x1 = num(b, '--x') / 100 * w, y1 = num(b, '--y') / 100 * h;
    // offsetLeft/Top ignore the label's transforms, so this is where the label settles (its vertical centre sits on --ly)
    const x2 = b.dataset.side === 'left' ? span.offsetLeft + span.offsetWidth : span.offsetLeft, y2 = span.offsetTop;
    const len = Math.hypot(x2 - x1, y2 - y1).toFixed(1);
    ln.setAttribute('x1', x1.toFixed(1)); ln.setAttribute('y1', y1.toFixed(1)); ln.setAttribute('x2', x2.toFixed(1)); ln.setAttribute('y2', y2.toFixed(1));
    ln.style.strokeDasharray = len;
    ln.style.strokeDashoffset = revealed ? '0' : len;
    ln.style.transitionDelay = revealed ? '0s' : (num(b, '--i') * .1 + .2).toFixed(2) + 's';
  });
}
function reveal() {
  if (revealed || !stage) return;
  drawLines();
  revealed = true;
  stage.classList.add('is-c');
  requestAnimationFrame(() => requestAnimationFrame(() => lineOf.forEach(ln => { ln.style.strokeDashoffset = '0'; })));
  setTimeout(() => {
    lineOf.forEach(ln => { ln.style.transitionDelay = '0s'; });
    if (!hovered && activeIdx < 0 && !(duoOn && !root.classList.contains('is-landed'))) activate(DEFAULT_HS);   // not if the visitor already scrolled back up
  }, hs.length * 100 + 800);
}
function activate(i) {
  activeIdx = i;
  hs.forEach((b, k) => b.classList.toggle('is-on', k === i));
  const d = hs[i] && hs[i].dataset; if (!d) return;
  if (card) { cardItems.forEach(c => c.classList.toggle('is-on', c.dataset.for === d.hs)); card.classList.add('is-on'); }
  setLed(glanceDevice, d.led);
}
function focusOn(b) {
  clearTimeout(leaveTimer); hovered = b;
  stage.classList.add('is-focus');
  hs.forEach(x => x.classList.toggle('is-hover', x === b));
  lineOf.forEach((ln, x) => ln.classList.toggle('is-hover', x === b));
}
function focusOff() {
  // A short grace period, so crossing the gap between a pin and its label does not blink
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => { hovered = null; stage.classList.remove('is-focus'); }, 140);
}
hs.forEach((b, i) => {
  b.addEventListener('mouseenter', () => { focusOn(b); activate(i); });
  b.addEventListener('mouseleave', focusOff);
  b.addEventListener('focus', () => { focusOn(b); activate(i); });
  b.addEventListener('blur', focusOff);
  b.addEventListener('click', () => { activate(i); track('extero_hotspot', { id: b.dataset.hs }); });
});

/* ---------- Hero to the glance (desktop): the hero and "Your device at a glance" share a sticky stage; scrolling through .nxx-duo
   scrubs a zoom into the device on the vet's scrubs (review with Gerard, 2026-11-03: show it worn first, so its size is clear; Lucas,
   same evening: land straight in the glance section, the photo fades out and blurs). The photo grows around its device, blurs (the
   pre-blurred copy fades in) and fades; the glance device appears on that spot at the same size, then grows and moves to its place.
   The hero copy fades up, the glance heading rises in, the callouts come in once it has landed. A light easing follows the scroll so
   wheel steps glide. ---------- */
const duo = $('.nxx-duo'), pin = duo && $('.nxx-duo-pin', duo), glance = $('.nxx-glance');
const fly = stage && $('.nxx-fly', stage), heroInner = hero && $('.nxx-hero-inner', hero), heroBg = hero && $('.nxx-bg', hero);
const glanceHead = glance && $('.nxx-glance-head', glance), scene = hero && $('.nxx-scene', hero);
const photo = scene && $('.nxx-photo', scene);
// The LED ring in the cut-out picture (nx-extero-led-mask.png): centre at 36.4% / 52.5% of the box, 55.1% of its width across.
// The ring in nx-extero-hero-clinic-*.jpg (the desktop picture, zoomed out so her head clears the navbar, 2026-11-06; measured from
// its blue LED pixels in the 3200 x 1800 source): centre at 71.08% / 43.31% of the picture, 1.06% of its width across. Shown with object-position 40% 36% (nx-extero-home.css; a lower x keeps the vet clear of the copy on narrow screens). The stage only runs on
// desktop, where the <picture> serves this file. Old portrait nx-extero-walk-*.jpg: 46.35% / 33.57%, 3.2%, object-position 50% 34%.
const CUT_RING = { x: .364, y: .525, d: .551 }, PHOTO_RING = { x: .7108, y: .4331, d: .0106 }, PHOTO_POS_X = .4, PHOTO_POS_Y = .36;
const wideMq = matchMedia('(min-width: 761px)');
const RUN_END = .9;   // the zoom ends at 90% of the run; the last 10% holds the glance section before the page scrolls on
const duoMq = matchMedia('(min-width: 761px) and (min-height: 560px)');
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const outC = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
let duoOn = false, geo = null, pShown = 0, rafDuo = 0, lastT = 0;
function offsetIn(node, anc) {
  // Layout position inside the stage, ignoring transforms (the entrance animations and the scrub itself)
  let x = 0, y = 0;
  while (node && node !== anc) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
  return { x, y };
}
function measure() {
  const f = offsetIn(fly, pin), fw = fly.offsetWidth, fh = fly.offsetHeight;
  const s = offsetIn(scene, pin), W = scene.offsetWidth, H = scene.offsetHeight;
  const nw = photo.naturalWidth || 1000, nh = photo.naturalHeight || 1500, k = Math.max(W / nw, H / nh), iw = nw * k, ih = nh * k;
  const rx = (W - iw) * PHOTO_POS_X + PHOTO_RING.x * iw, ry = (H - ih) * PHOTO_POS_Y + PHOTO_RING.y * ih;
  scene.style.transformOrigin = rx.toFixed(1) + 'px ' + ry.toFixed(1) + 'px';   // the photo grows around its device, so that point stays put unless moved
  // fx/fy: the device box; cx/cy: its ring inside the box; d0: the ring's width at full size. px/py: the ring in the photo; pd: its width at scale 1
  geo = { fx: f.x, fy: f.y, cx: CUT_RING.x * fw, cy: CUT_RING.y * fh, d0: CUT_RING.d * fw, px: s.x + rx, py: s.y + ry, pd: PHOTO_RING.d * iw,
          top: duo.getBoundingClientRect().top + scrollY, run: Math.max(1, duo.offsetHeight - pin.offsetHeight) };
}
const progress = () => geo ? clamp01((scrollY - geo.top) / (geo.run * RUN_END)) : 0;
function render(p) {
  const g = geo; if (!g) return;
  // The ring's width on screen grows geometrically from the photo's ring to the device's. Lucas, 2026-11-04: the in-between state
  // (small device on a blurred photo) lasted too long, so the growth starts fast (ease out) and the photo is gone by a third of the run
  const at = q => {
    const dia = g.pd * Math.pow(g.d0 / g.pd, outC(seg(q, 0, .7)));
    const u = inOut(seg(q, .04, .7));                   // the ring's trip from the photo to the device's place
    return { dia, cx: lerp(g.px, g.fx + g.cx, u), cy: lerp(g.py, g.fy + g.cy, u) };
  };
  const { dia, cx, cy } = at(p), f = dia / g.d0;
  // The photo stops growing once it has faded out (Lucas, 2026-11-06: on the way back up it took a moment to show and settle; the
  // full-screen picture was being rendered about 8 times its size while invisible, then redrawn tile by tile)
  const s = at(Math.min(p, .13)), ps = s.dia / g.pd;
  scene.style.transform = 'translate3d(' + (s.cx - g.px).toFixed(2) + 'px,' + (s.cy - g.py).toFixed(2) + 'px,0) scale(' + ps.toFixed(4) + ')';
  // Lucas, 2026-11-04 (light page): no blur and no wash any more, they turned the big photo into a grey smear with a hard edge.
  // The sharp photo fades straight into the backdrop while it is still about twice its size, and the device takes over on its spot
  scene.style.opacity = (1 - outC(seg(p, .01, .12))).toFixed(3);
  fly.style.transform = 'translate3d(' + (cx - g.fx - f * g.cx).toFixed(2) + 'px,' + (cy - g.fy - f * g.cy).toFixed(2) + 'px,0) scale(' + f.toFixed(4) + ')';
  fly.style.opacity = seg(p, .01, .07).toFixed(3);
  const out = inOut(seg(p, 0, .14));
  heroInner.style.opacity = (1 - out).toFixed(3);
  heroInner.style.transform = 'translate3d(0,' + (-56 * out).toFixed(1) + 'px,0)';
  stage.style.setProperty('--nxx-glow', seg(p, .45, .8).toFixed(3));
  heroBg.style.opacity = (1 - seg(p, .05, .4)).toFixed(3);
  const inn = 1 - Math.pow(1 - seg(p, .3, .62), 3);   // the heading comes in once the photo has gone
  glanceHead.style.opacity = inn.toFixed(3);
  glanceHead.style.transform = 'translate3d(0,' + (40 * (1 - inn)).toFixed(1) + 'px,0)';
  root.classList.toggle('is-moved', p > .01);
  root.classList.toggle('is-swap', p > .3);
  const landed = p > .72;   // the device is in place: the callouts come in (and hide again on the way back up, the ring back to cyan)
  if (landed !== root.classList.contains('is-landed')) {
    root.classList.toggle('is-landed', landed);
    if (landed) { if (revealed) activate(activeIdx >= 0 ? activeIdx : DEFAULT_HS); else reveal(); }
    else setLed(glanceDevice, 'cyan');
  }
}
function tickDuo(now) {
  rafDuo = 0;
  const dt = lastT ? Math.min(64, now - lastT) : 0; lastT = now;
  const t = progress();
  pShown += (t - pShown) * (1 - Math.exp(-dt / 85));
  if (Math.abs(t - pShown) < .0005) pShown = t;
  render(pShown);
  if (pShown !== t) { root.classList.add('is-scrub'); rafDuo = requestAnimationFrame(tickDuo); }
  else { lastT = 0; root.classList.remove('is-scrub'); }
}
const kickDuo = () => { if (duoOn && !rafDuo) rafDuo = requestAnimationFrame(tickDuo); };
/* Snap (Gerard, 2026-11-06): a light scroll must never leave the stage halfway (photo gone, device still small). The first downward
   wheel step on the hero plays the whole zoom to the glance section in one glide; the first upward one from the glance plays it
   back. Wheel steps during the glide are absorbed; after it, only the trackpad's fading inertia is (each step no bigger than the one
   before, for 1 s at most), so a fresh swipe scrolls on at once (Lucas, 2026-11-06: the first version kept the page locked while he
   kept swiping). Keys, the scrollbar and touch are caught when the scroll comes to rest inside the run. */
const SNAP_MS = 750;
let snapRaf = 0, snapping = false, lockUntil = 0, lockHard = 0, lastAbs = 0, idleT = 0, lastY = scrollY, lastDir = 1, touching = false;
const snapEnd = () => geo.top + geo.run * RUN_END + 2;
const jump = y => { try { scrollTo({ top: y, behavior: 'instant' }); } catch (_) { scrollTo(0, y); } };
function snapTo(y) {
  cancelAnimationFrame(snapRaf);
  const y0 = scrollY, d = y - y0, t0 = performance.now();
  if (Math.abs(d) < 2) return;
  snapping = true;
  const step = now => {
    const k = Math.min(1, (now - t0) / SNAP_MS);
    jump(y0 + d * inOut(k));
    if (k < 1) snapRaf = requestAnimationFrame(step);
    else { snapRaf = 0; snapping = false; const t = performance.now(); lockUntil = t + 150; lockHard = t + 1000; }
  };
  snapRaf = requestAnimationFrame(step);
}
function onWheel(e) {
  if (!duoOn || !geo || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
  const now = performance.now();
  const a = Math.abs(e.deltaY);
  if (snapping) { e.preventDefault(); lastAbs = a; return; }
  if (now < lockUntil && now < lockHard && a <= lastAbs + 1) { e.preventDefault(); lastAbs = a; lockUntil = now + 150; return; }
  lockUntil = 0; lastAbs = a;
  const y = scrollY, end = snapEnd();
  if (e.deltaY > 0 && y < end - 2 && y > geo.top - innerHeight) { e.preventDefault(); snapTo(end); }
  else if (e.deltaY < 0 && y > geo.top + 2 && y <= end + 2) { e.preventDefault(); snapTo(geo.top); }
}
function settle() {
  if (!duoOn || !geo || snapping || touching) return;
  const y = scrollY, end = snapEnd();
  if (y > geo.top + 2 && y < end - 2) snapTo(lastDir > 0 ? end : geo.top);
}
function onScrollSnap() {
  if (snapping) return;
  const y = scrollY; if (y !== lastY) lastDir = y > lastY ? 1 : -1; lastY = y;
  clearTimeout(idleT); idleT = setTimeout(settle, 120);
}
const toGlance = () => snapTo(snapEnd());
// The ripple on the device in the photo: on desktop the wide picture is cropped by the viewport, so place it in pixels; phones keep
// the CSS default for the portrait card
function aimPulse() {
  if (!scene || !photo) return;
  if (!wideMq.matches) { scene.style.removeProperty('--px'); scene.style.removeProperty('--py'); return; }
  const W = scene.offsetWidth, H = scene.offsetHeight, nw = photo.naturalWidth || 1672, nh = photo.naturalHeight || 941;
  const k = Math.max(W / nw, H / nh), iw = nw * k, ih = nh * k;
  scene.style.setProperty('--px', ((W - iw) * PHOTO_POS_X + PHOTO_RING.x * iw).toFixed(1) + 'px');
  scene.style.setProperty('--py', ((H - ih) * PHOTO_POS_Y + PHOTO_RING.y * ih).toFixed(1) + 'px');
}
function setDuo() {
  aimPulse();
  const on = !!(fly && scene && glanceHead && stage && pin && photo) && !root.classList.contains('nxx-static') && duoMq.matches;
  if (on !== duoOn) {
    duoOn = on;
    root.classList.toggle('nxx-duo-on', on);
    if (!on) {
      cancelAnimationFrame(rafDuo); rafDuo = 0; lastT = 0; geo = null;
      [fly, heroInner, heroBg, scene, glanceHead].forEach(e => e && e.removeAttribute('style'));
      stage.style.removeProperty('--nxx-glow');
      root.classList.remove('is-moved', 'is-swap', 'is-scrub', 'is-landed');
      aimPulse();
      return;
    }
  }
  if (!on) return;
  measure(); pShown = progress(); render(pShown);
}
if (duo && hero) {
  addEventListener('scroll', kickDuo, { passive: true });
  addEventListener('scroll', onScrollSnap, { passive: true });
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('touchstart', () => { touching = true; }, { passive: true });
  addEventListener('touchend', () => { touching = false; clearTimeout(idleT); idleT = setTimeout(settle, 120); }, { passive: true });
  if (duoMq.addEventListener) duoMq.addEventListener('change', setDuo);
  if (photo && !photo.complete) photo.addEventListener('load', setDuo, { once: true });
  // The Scroll cue, a #glance link and keyboard focus land on the finished zoom (or back on the hero)
  root.addEventListener('click', e => { const a = e.target.closest('a[href="#glance"]'); if (a && duoOn) { e.preventDefault(); toGlance(); } });
  if (glance) glance.addEventListener('focusin', () => { if (duoOn && pShown < .5) toGlance(); });
  if (heroInner) heroInner.addEventListener('focusin', () => { if (duoOn && pShown > .5) snapTo(geo.top); });
}

/* ---------- Boot ---------- */
if (hero) {
  if (reduce || (navigator.connection && navigator.connection.saveData) || !('IntersectionObserver' in window)) {
    root.classList.add('nxx-static');
    hero.classList.add('is-in');
    if (stage) { revealed = true; stage.classList.add('is-c'); drawLines(); activate(DEFAULT_HS); }
  } else {
    start();
    if (stage) {
      // On the desktop stage the glance is on screen from the start (under the hero): there the zoom's landing reveals it instead
      new IntersectionObserver((entries, io) => { if (duoOn || !entries.some(e => e.isIntersecting)) return; reveal(); io.disconnect(); }, { threshold: .3 }).observe(stage);
      // The cycling ring (LED ring callout) only ticks while the stage is on screen
      new IntersectionObserver(([e]) => {
        const d = hs[activeIdx] && hs[activeIdx].dataset;
        if (!d || d.led !== 'cycle') return;
        if (e.isIntersecting) setLed(glanceDevice, 'cycle'); else clearInterval(cycles.get(glanceDevice));
      }).observe(stage);
    }
  }
  addEventListener('resize', () => { cancelAnimationFrame(rafLines); rafLines = requestAnimationFrame(() => { drawLines(); setDuo(); }); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawLines(); setDuo(); });
  setDuo();
  if (duoOn && location.hash === '#glance') requestAnimationFrame(() => scrollTo(0, geo.top + geo.run * RUN_END + 2));
}

})();

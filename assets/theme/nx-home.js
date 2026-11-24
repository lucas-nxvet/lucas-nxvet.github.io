/* NxVET homepage behaviour for sections/nx-home.liquid. */
(() => {
'use strict';
// The booking link comes from the section setting "Book a demo link". While empty, "Book a demo" opens the email request form.
const ROOT = document.querySelector('.nxh-root');
if (!ROOT) return;
const DEMO_URL = ROOT.dataset.demoUrl || '';
// Height of the theme header/announcement above the hero, used to centre the hero copy on first load.
const setTop = () => { const h = ROOT.querySelector('.nxh-hero'); if (h) ROOT.style.setProperty('--nxh-top', Math.round(Math.min(320, Math.max(0, h.getBoundingClientRect().top + scrollY))) + 'px'); };
setTop(); addEventListener('resize', setTop, { passive: true });

ROOT.classList.add('nxh-js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - t, 3);

// Local analytics hook. Connect to the site's consent-aware analytics when porting.
function track(event, params = {}) { window.dispatchEvent(new CustomEvent('nxvet:analytics', { detail: { event, ...params } })); }

/* Reveal on scroll + start step animations only when visible */
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('nxh-in-view'); io.unobserve(en.target); } }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.nxh-reveal').forEach(el => io.observe(el));
} else {
  $$('.nxh-reveal').forEach(el => el.classList.add('nxh-in-view'));
}

/* Sticky mobile CTA: shows once the hero buttons are gone, hides at the closing section */
const sticky = $('.nxh-sticky-cta'), closing = $('.nxh-closing'), hero = $('.nxh-hero');
let heroP = 0;
let closingVisible = false;
function updateSticky() {
  if (!sticky) return;
  if (!hero) { const show = scrollY > innerHeight * .6 && !closingVisible; sticky.classList.toggle('nxh-show', show); sticky.setAttribute('aria-hidden', String(!show)); $$('a', sticky).forEach(el => el.tabIndex = show ? 0 : -1); return; }
  const heroGone = hero.classList.contains('nxh-static') ? hero.getBoundingClientRect().bottom < 0 : heroP > .1 || hero.getBoundingClientRect().bottom < 0;
  const show = heroGone && !closingVisible;
  if (sticky.classList.contains('nxh-show') === show) return;
  sticky.classList.toggle('nxh-show', show); sticky.setAttribute('aria-hidden', String(!show));
  $$('a', sticky).forEach(el => el.tabIndex = show ? 0 : -1);
}
if ('IntersectionObserver' in window && closing) new IntersectionObserver(([en]) => { closingVisible = en.isIntersecting; updateSticky(); }).observe(closing);
addEventListener('scroll', () => { if (!hero || hero.getBoundingClientRect().bottom < 0) updateSticky(); }, { passive: true });

/* Hero: a live close-up of the 3D clinic demo, face-on to the Exam room 2 NxHUB (real proportions, the product
   photo's face, blue ring lit while it records). Scrolling pulls the camera back to the whole clinic; "Explore the
   3D demo" then opens the walkthrough in place.
   Speed: the clinic (about 5 MB) runs in a sandboxed frame, a separate process in Chrome, Edge and Firefox, so building it
   never freezes this page. It preloads once the page has loaded and gone idle. Until it is ready, a still of the same
   3D close-up (the poster) stands in. */
// The 3D hero is .nxh-hero-3d: the top of the NxHUB homepage, or a band lower down the Extero homepage (2026-11-11), where
// .nxh-hero is the Extero hero. On the NxHUB homepage both are the same element, so nothing changes there.
const hero3d = $('.nxh-hero-3d');
const heroSticky = $('.nxh-hero-sticky'), copy = $('.nxh-hero-copy'), live = $('.nxh-hero-live'), poster = $('.nxh-hero-poster'), shade = $('.nxh-hero-shade');
const texts = hero3d ? $$('.nxh-jt', hero3d) : [], bar = $('.nxh-journey-progress'), cue = $('.nxh-scroll-cue');
let heroFrame = null, heroReady = false, heroExploring = false;
const frameUrl = () => { const el = $('[data-clinic-open][data-frame-url]'); return live?.dataset.frameUrl || (el && el.dataset.frameUrl) || ''; };
// The hub's centre sits at (.5 + fx, .5 + fy) of the screen and is drawn at a set share of the screen height.
// The poster (2000x1125, hub at 68% / 52%, hub 48.3% of its height, captured at camera zoom 30, plain wall around it)
// is sized and placed to match; the live 3D zoom is derived from the same size, so the swap is seamless.
const POSTER = { w: 2000, h: 1125, hx: .68, hy: .52, hub: .483, zoom: 30, half: 10.5 };
function heroGeo() {
  // The hero's own width (without the scrollbar): the 3D frame is that wide, so both must use it or the hub shifts.
  const W = heroSticky ? heroSticky.clientWidth : innerWidth, H = heroSticky ? heroSticky.clientHeight : innerHeight, m = innerWidth < 641;
  const fx = m ? 0 : .18, fy = m ? .27 : .02, tx = (.5 + fx) * W, ty = (.5 + fy) * H;
  const rh = (m ? .24 : .4) * H / POSTER.hub, rw = rh * POSTER.w / POSTER.h;
  const half = Math.max(10.5, 15.2 / (W / H));   // same view height rule as the clinic camera
  return { fx, fy, zoom: POSTER.zoom * (rh / H) * (half / POSTER.half), poster: { left: tx - POSTER.hx * rw, top: ty - POSTER.hy * rh, w: rw, h: rh } };
}
const framing = () => { const g = heroGeo(); return { fx: g.fx, fy: g.fy, zoom: g.zoom }; };
const px = n => n.toFixed(1) + 'px';
function placeHero() {
  const g = heroGeo();
  if (poster) Object.assign(poster.style, { left: px(g.poster.left), top: px(g.poster.top), width: px(g.poster.w), height: px(g.poster.h) });
}
if (hero3d && heroSticky) { placeHero(); addEventListener('resize', placeHero, { passive: true }); }
// Sandboxed frame: its origin is opaque ("null"), so messages go out with "*" and come back checked by source.
const heroSend = msg => heroFrame?.contentWindow?.postMessage(msg, '*');
let scrollP = 0;
const sendScroll = () => { if (heroReady && !heroExploring) heroSend({ type: 'nx-clinic-scroll', p: scrollP, ...framing() }); };

function loadHeroFrame() {
  const url = frameUrl();
  if (!live || !url || heroFrame) return;
  import(new URL(url, location.href).href).then(({ createFrameDocument }) => {
    heroFrame = document.createElement('iframe');
    heroFrame.title = 'Interactive NxVET clinic walkthrough';
    heroFrame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    heroFrame.setAttribute('tabindex', '-1');
    heroFrame.srcdoc = createFrameDocument(new URL('.', new URL(url, location.href)).href, location.origin);
    live.append(heroFrame);
  }).catch(() => {});
}
if (hero3d && live) addEventListener('message', e => {
  if (!heroFrame || e.source !== heroFrame.contentWindow) return;
  const type = e.data?.type;
  if (type === 'nx-clinic-ready') {
    heroReady = true; sendScroll(); heroSend({ type: 'nx-clinic-visibility', visible: true });
    dispatchEvent(new Event('scroll'));   // the hero decides when to swap the poster for the live view
  } else if (type === 'nx-clinic-collapsed') closeHeroDemo();
  else if (type === 'nx-clinic-cta') demoCta(e.data.action, () => closeHeroDemo(true));
  else if (type === 'nx-clinic-error') { heroFrame.remove(); heroFrame = null; heroReady = false; live.classList.remove('nxh-ready'); }
});
function openHeroDemo() {
  const pill = document.querySelector('.nxhd-pill');
  hero3d.style.setProperty('--demo-top', (pill ? Math.round(pill.getBoundingClientRect().bottom + 12) : 96) + 'px');
  heroExploring = true; hero3d.classList.add('nxh-exploring'); document.documentElement.style.overflow = 'hidden';
  heroSend({ type: 'nx-clinic-visibility', visible: true }); heroSend({ type: 'nx-clinic-start' });
  track('explore_demo_open', { placement: 'hero' });
}
function closeHeroDemo(fromHost) {
  if (!heroExploring) return;
  heroExploring = false; hero3d.classList.remove('nxh-exploring'); document.documentElement.style.overflow = '';
  if (fromHost) heroSend({ type: 'nx-clinic-close' });
  sendScroll();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape' && heroExploring) closeHeroDemo(true); });
// Using the site navbar while the demo is open closes it first.
document.addEventListener('click', e => { if (heroExploring && e.target.closest('.nxhd a, .nxhd button')) closeHeroDemo(true); }, true);

if (!hero3d || !live) {
  // Not the homepage hero: nothing to animate.
} else if (reduceMotion || navigator.connection?.saveData || !('IntersectionObserver' in window)) {
  hero3d.classList.add('nxh-static');
} else {
  let active = true, ticking = false, step = -2;
  const fade = (el, o) => { if (!el) return; el.style.opacity = o; el.style.visibility = o < .02 ? 'hidden' : ''; };
  function update() {
    ticking = false;
    const r = hero3d.getBoundingClientRect();
    const p = heroP = clamp(-r.top / (r.height - innerHeight));
    // 1. Copy fades away
    const c = clamp(p / .1);
    fade(copy, 1 - c); copy.style.transform = `translateY(${(-40 * c).toFixed(1)}px)`;
    fade(shade, 1 - clamp(p / .14)); fade(cue, 1 - c);
    // 2. The camera steps back from the hub (and turns) to the whole clinic
    scrollP = clamp((p - .04) / .7);
    // The live view replaces the still as soon as it is ready (same hub, same place, so the arcs simply start moving).
    live.classList.toggle('nxh-ready', heroReady);
    // Wall colour around the poster; once the live clinic has taken over it fades so the clinic sits on the page background.
    live.style.backgroundColor = `rgba(210,215,218,${heroReady ? (1 - clamp(scrollP / .35)).toFixed(3) : 1})`;
    sendScroll();
    if (!heroReady && poster) {             // same move on the stand-in picture
      const e = scrollP * scrollP * (3 - 2 * scrollP);
      poster.style.transform = `scale(${Math.pow(1 / framing().zoom, e).toFixed(4)})`;
    }
    const next = p < .12 ? -1 : p < .42 ? 0 : p < .72 ? 1 : 2;
    if (next !== step) { step = next; texts.forEach((el, i) => el.classList.toggle('nxh-show', i === step)); }
    bar.classList.toggle('nxh-show', p > .12 && p < .99);
    bar.style.setProperty('--jp', p.toFixed(3));
    updateSticky();
  }
  const onScroll = () => { if (active && !ticking) { ticking = true; requestAnimationFrame(update); } };
  new IntersectionObserver(([en]) => { active = en.isIntersecting; heroSend({ type: 'nx-clinic-visibility', visible: active || heroExploring }); if (active) onScroll(); else updateSticky(); }).observe(hero3d);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sendScroll(); onScroll(); }, { passive: true });
  // Preload the clinic once the page has finished loading and gone idle (or at the first scroll, whichever comes first).
  const start = () => { ['wheel', 'touchstart', 'keydown', 'scroll'].forEach(t => removeEventListener(t, start)); loadHeroFrame(); };
  if (hero3d === hero) {
    ['wheel', 'touchstart', 'keydown', 'scroll'].forEach(t => addEventListener(t, start, { passive: true }));
    const idle = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 600 }) : setTimeout(start, 200));   // own process: safe to start right away
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  } else {
    // Lower on the page (Extero homepage): nothing of the clinic loads until the band is about one screen away, so the
    // first screen keeps its speed (Lucas, 2026-11-11).
    const near = new IntersectionObserver(([en]) => { if (en.isIntersecting) { near.disconnect(); loadHeroFrame(); } }, { rootMargin: '100% 0px' });
    near.observe(hero3d);
  }
  update();
}

/* Range slider fill */
function paintRange(el) { el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); }
const money = n => '$' + Math.round(n).toLocaleString('en-US');

/* Time savings calculator */
const roiRooms = $('#nxh-roi-rooms'), roiHours = $('#nxh-roi-hours'), roiRate = $('#nxh-roi-rate');
function updateRoi() {
  if (!roiRooms) return;
  const rooms = +roiRooms.value, hours = +roiHours.value, rate = +roiRate.value;
  const monthlyHours = rooms * hours * 52 / 12;
  $('#nxh-roi-rooms-out').textContent = rooms;
  $('#nxh-roi-hours-out').textContent = hours;
  $('#nxh-roi-rate-out').textContent = money(rate);
  $('#nxh-roi-time').textContent = Math.round(monthlyHours) + ' h';
  $('#nxh-roi-value').textContent = money(monthlyHours * rate);
  $('#nxh-roi-cost').textContent = money(rooms * 49);
  [roiRooms, roiHours, roiRate].forEach(paintRange);
}
if (roiRooms) [roiRooms, roiHours, roiRate].forEach(el => el.addEventListener('input', updateRoi));
updateRoi();

/* Pricing room stepper */
const MAX_ROOMS = 19;
let rooms = 1;
const minus = $('#nxh-rooms-minus'), plus = $('#nxh-rooms-plus');
function updatePricing() {
  if (!minus) return;
  $('#nxh-rooms-out').textContent = rooms;
  $('#nxh-annual-month').textContent = money(49 * rooms);
  $('#nxh-annual-price').textContent = money(588 * rooms);
  $('#nxh-annual-save').textContent = rooms === 1 ? 'Free NxHUB device' : `${rooms} free NxHUB devices`;
  $('#nxh-monthly-price').textContent = money(49 * rooms);
  $('#nxh-monthly-hw').textContent = rooms === 1 ? '+ $99 one-time device fee' : `+ ${money(99 * rooms)} one-time device fees`;
  minus.disabled = rooms === 1; plus.disabled = rooms === MAX_ROOMS;
  $$('.nxh-plan-link').forEach(a => { const u = new URL(a.href); u.searchParams.set('rooms', rooms); a.href = u.href; });
}
if (minus) {
  minus.addEventListener('click', () => { rooms = Math.max(1, rooms - 1); updatePricing(); });
  plus.addEventListener('click', () => { rooms = Math.min(MAX_ROOMS, rooms + 1); updatePricing(); });
}

// Carry campaign parameters (UTMs) through to checkout links.
const campaign = new URLSearchParams(location.search);
$$('.nxh-plan-link').forEach(a => {
  const u = new URL(a.href);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { if (campaign.has(k)) u.searchParams.set(k, campaign.get(k)); });
  a.href = u.href;
  a.addEventListener('click', () => track('select_plan', { billing: a.dataset.plan, rooms }));
});
updatePricing();
$$('[data-buy]').forEach(a => a.addEventListener('click', () => track('buy_cta_click', { placement: a.dataset.buy })));
$$('[data-track]').forEach(a => a.addEventListener('click', () => track(a.dataset.track)));

/* Book a demo: real booking link when set, email request form otherwise */
const dialog = $('#nxh-demo-dialog');
let opener = null;
$$('[data-demo]').forEach(el => {
  if (DEMO_URL) { el.href = DEMO_URL; el.target = '_blank'; el.rel = 'noopener'; }
  el.addEventListener('click', e => {
    track('demo_cta_click', { label: el.textContent.trim() });
    if (DEMO_URL || /^https?:/.test(el.getAttribute('href') || '')) return;
    e.preventDefault();
    opener = el;
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal(); else location.href = 'mailto:team@nx.vet?subject=' + encodeURIComponent('NxHUB demo request');
  });
});
if (dialog) {
$('.nxh-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => opener && opener.focus());
$('#nxh-demo-form').addEventListener('submit', e => {
  e.preventDefault();
  const d = new FormData(e.target);
  const body = `Hello NxVET team,\n\nI'd like to book an NxHUB demo.\n\nName: ${d.get('name')}\nClinic: ${d.get('clinic')}\nWork email: ${d.get('email')}\nExam rooms: ${d.get('rooms') || 'To discuss'}\n\nThank you.`;
  track('demo_request_email', {});
  location.href = `mailto:team@nx.vet?subject=${encodeURIComponent('NxHUB demo request')}&body=${encodeURIComponent(body)}`;
  dialog.close();
});
}

/* Explore the 3D demo: open the live interactive clinic under the site navbar, with sales CTAs under its walkthrough card.
   Reuses the theme's clinic module (assets/nx-clinic-frame.nxh-js); falls back to the link if it can't load. */
// Sales buttons inside the walkthrough send nx-clinic-cta messages (the frame is sandboxed and cannot navigate this page).
function demoCta(action, close) {
  close();
  if (action === 'buy') { track('buy_cta_click', { placement: 'demo_modal' }); location.href = '/products/nxhub'; }
  else if (action === 'demo') { const d = $('[data-demo]'); d && d.click(); }
}
const demoModal = $('#nxh-demo-modal');
if (demoModal) {
  const stageEl = $('.nxh-demo-stage', demoModal), loadingEl = $('.nxh-demo-loading', demoModal);
  let frame = null, ready = false, timer = 0, lastOpener = null;
  const send = msg => frame?.contentWindow?.postMessage(msg, '*');
  const placeStage = () => {
    const pill = document.querySelector('.nxhd-pill');
    demoModal.style.setProperty('--demo-top', (pill ? Math.round(pill.getBoundingClientRect().bottom + 12) : 96) + 'px');
  };
  // Show the clinic only once the walkthrough is running, so its overview screen never flashes.
  let revealT = 0;
  const reveal = () => { clearTimeout(revealT); revealT = setTimeout(() => { if (frame) frame.style.opacity = '1'; loadingEl.hidden = true; }, 700); };
  const closeDemo = () => {
    if (demoModal.hidden) return;
    demoModal.hidden = true; document.documentElement.style.overflow = '';
    send({ type: 'nx-clinic-visibility', visible: false });
    lastOpener?.focus({ preventScroll: true });
  };
  const fallback = href => { clearTimeout(timer); frame?.remove(); frame = null; closeDemo(); if (href) location.href = href; };
  addEventListener('message', e => {
    if (!frame || e.source !== frame.contentWindow) return;
    const type = e.data?.type;
    if (type === 'nx-clinic-ready') {
      clearTimeout(timer); ready = true;
      send({ type: 'nx-clinic-visibility', visible: true }); send({ type: 'nx-clinic-start' });
      reveal();
    } else if (type === 'nx-clinic-collapsed') closeDemo();
    else if (type === 'nx-clinic-cta') demoCta(e.data.action, closeDemo);
    else if (type === 'nx-clinic-error') fallback(lastOpener?.href);
  });
  $$('[data-clinic-open]').forEach(el => el.addEventListener('click', async e => {
    const url = el.dataset.frameUrl;
    if (!url) return;                       // no clinic module on this page: follow the link
    if (heroReady) { e.preventDefault(); openHeroDemo(); return; }   // homepage: open the clinic already running in the hero
    e.preventDefault(); lastOpener = el; track('explore_demo_open');
    placeStage(); demoModal.hidden = false; document.documentElement.style.overflow = 'hidden';
    if (frame) { if (ready) { send({ type: 'nx-clinic-visibility', visible: true }); send({ type: 'nx-clinic-start' }); } return; }
    loadingEl.hidden = false;
    timer = setTimeout(() => fallback(el.href), 20000);
    try {
      const abs = new URL(url, location.href);
      const { createFrameDocument } = await import(abs.href);
      frame = document.createElement('iframe');
      frame.title = 'Interactive NxVET clinic walkthrough';
      frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');   // own process: never freezes this page
      frame.style.opacity = '0'; frame.style.transition = 'opacity .35s ease';
      frame.srcdoc = createFrameDocument(new URL('.', abs).href, location.origin);
      stageEl.append(frame);
    } catch { fallback(el.href); }
  }));
  // Using the site navbar while the demo is open closes it first.
  document.addEventListener('click', e => { if (!demoModal.hidden && e.target.closest('.nxhd a, .nxhd button')) closeDemo(); }, true);
  addEventListener('resize', () => { if (!demoModal.hidden) placeStage(); }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !demoModal.hidden && !(dialog && dialog.open)) closeDemo(); });
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1' && !matchMedia('(max-width:640px)').matches) {   // phones: the demo is hidden, so ?demo=1 does nothing there
    const opener = $$('[data-clinic-open]').find(el => el.dataset.frameUrl);
    if (opener) {
      params.delete('demo');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
      opener.click();
    }
  }
}

})();

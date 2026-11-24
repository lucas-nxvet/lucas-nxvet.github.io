/* NxVET polish layer behaviour (branch lucas-shopify-extero, 2026-11-09). Loaded deferred on every page from layout/theme.liquid.
   1. Cursor glow: a soft cyan light that follows the mouse with a little lag; on navy bands the backdrop grid lights up around it.
   2. Scroll into view: blocks below the fold rise in as they arrive, cards in a row one after another.
   Mouse devices only for (1); both are off with prefers-reduced-motion. Styles: nx-polish.css. Nothing here changes content. */
(() => {
  'use strict';
  if (window.__nxPolish) return; window.__nxPolish = true;
  const d = document;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  if (reduce) return;

  /* ---------- 1. Cursor glow ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !saveData) {
    const glow = d.createElement('div');
    glow.className = 'nxp-glow'; glow.setAttribute('aria-hidden', 'true');
    d.body.appendChild(glow);
    const SPOT = '.nxh-page-hero, .nxh-closing, .nxh-dev, .nxh-roi, .nxq-modes';
    const EASE = .13;                       // share of the remaining distance covered per frame: the lag behind the pointer
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false, lit = null, litBox = null;
    const light = el => {
      const band = el && el.closest ? el.closest(SPOT) : null;
      const bg = band ? band.querySelector(':scope > .nxh-hero-bg') : null;
      if (bg === lit) return;
      if (lit) lit.classList.remove('nxp-lit');
      lit = bg; litBox = null;
      if (lit) lit.classList.add('nxp-lit');
    };
    const frame = () => {
      x += (tx - x) * EASE; y += (ty - y) * EASE;
      glow.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      if (lit) {
        if (!litBox) litBox = lit.getBoundingClientRect();
        lit.style.setProperty('--nxp-x', (x - litBox.left).toFixed(0) + 'px');
        lit.style.setProperty('--nxp-y', (y - litBox.top).toFixed(0) + 'px');
      }
      raf = (Math.abs(tx - x) + Math.abs(ty - y) > .4) ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; x = tx; y = ty; glow.classList.add('is-on'); }
      light(e.target);
      kick();
    }, { passive: true });
    // The page moves under a resting pointer while scrolling: re-read the lit band's position
    addEventListener('scroll', () => { if (!on) return; litBox = null; const el = d.elementFromPoint(tx, ty); if (el) light(el); kick(); }, { passive: true });
    addEventListener('resize', () => { litBox = null; }, { passive: true });
    d.documentElement.addEventListener('mouseleave', () => { on = false; glow.classList.remove('is-on'); light(null); });
    addEventListener('blur', () => { on = false; glow.classList.remove('is-on'); light(null); });
    addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') glow.classList.add('is-down'); }, { passive: true });
    addEventListener('pointerup', () => glow.classList.remove('is-down'), { passive: true });
  }

  /* ---------- 2. Scroll into view ---------- */
  if (!('IntersectionObserver' in window) || saveData) return;
  const root = d.querySelector('.nxh-root');
  if (!root) return;
  const vh = innerHeight || 800;
  const SKIP = 'script, style, template, dialog, noscript, svg, .nxh-reveal, .nxp-reveal, .nxh-sticky-cta, .nxh-buybar, .nxh-visually-hidden, .nxh-sr-only, [hidden], .nxx-duo, .nxh-page-hero, .nxh-shop-hero, .nxh-product-hero, .nxh-hero';
  const picked = [];
  const vw = d.documentElement.clientWidth;
  const ATOMIC = /^(TABLE|FIGURE|DETAILS|FORM|P|A|BUTTON|H[1-6]|DL|PRE|BLOCKQUOTE|PICTURE|IMG|VIDEO|IFRAME)$/;
  const cardLike = el => { const s = getComputedStyle(el); return s.borderTopWidth !== '0px' || s.boxShadow !== 'none' || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent'); };
  // A block is opened up (its children reveal one by one) only when it is a layout container: a section, a wrapper, a grid of cards, or something taller than the screen.
  const isContainer = (c, cs, b) => {
    if (ATOMIC.test(c.tagName) || !c.children.length) return false;
    if (/auto|scroll/.test(cs.overflowX) || /auto|scroll/.test(cs.overflowY)) return false;            // swipe strips and scroll boxes move as one piece
    if (c.matches('.nxh-wrap, section, .nxq-main, .nxq-body')) return true;                            // full-width bands never move as a block (their background would show a seam)
    if (cardLike(c) && b.height < vh * 1.2) return false;                                               // a card is one piece
    if (b.height > vh * .85) return true;
    if (c.tagName === 'UL' || c.tagName === 'OL') return /grid|flex/.test(cs.display) && cardLike(c.children[0]);
    return /grid|flex/.test(cs.display) && c.children.length > 1 && b.height > 150 && [...c.children].some(cardLike);
  };
  const pick = (el, depth) => {
    for (const c of el.children) {
      if (c.matches(SKIP) || c.closest('.nxh-reveal, .nxp-reveal')) continue;
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.display === 'contents' || cs.display === 'inline' || cs.position === 'fixed' || cs.position === 'sticky' || cs.position === 'absolute' || cs.visibility === 'hidden') continue;
      const b = c.getBoundingClientRect();
      if (b.width < 8 || b.height < 8 || b.left >= vw || b.right <= 0) continue;
      const open = depth < 4 && (isContainer(c, cs, b) || (!!c.querySelector('.nxh-reveal') && !ATOMIC.test(c.tagName)));
      if (b.top < vh * .96) { if (open && b.bottom > vh) pick(c, depth + 1); continue; }   // already on screen at load: leave it alone, look only at what hangs below the fold
      if (open) { pick(c, depth + 1); continue; }
      picked.push({ el: c, top: Math.round(b.top + scrollY), left: b.left, parent: el });
    }
  };
  root.querySelectorAll(':scope > section, :scope > div, :scope > main').forEach(s => { if (!s.matches(SKIP)) pick(s, 0); });

  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target; io.unobserve(el);
    el.classList.add('nxp-in');
    const wait = 1150 + (parseFloat(el.style.getPropertyValue('--nxp-d')) || 0);
    setTimeout(() => { el.classList.remove('nxp-reveal', 'nxp-in'); el.style.removeProperty('--nxp-d'); }, wait);   // hand the element back to its own hover transitions
  }), { rootMargin: '0px 0px -7% 0px', threshold: 0 });

  // Stagger: neighbours on the same row come in left to right
  const rowDelay = items => {
    const rows = new Map();
    items.forEach(it => { const key = it.parentKey + ':' + Math.round(it.top / 8); (rows.get(key) || rows.set(key, []).get(key)).push(it); });
    rows.forEach(list => { list.sort((a, b) => a.left - b.left); list.forEach((it, i) => { it.delay = Math.min(i, 5) * 80; }); });
  };
  const parents = new Map(); let pid = 0;
  picked.forEach(it => { if (!parents.has(it.parent)) parents.set(it.parent, ++pid); it.parentKey = parents.get(it.parent); });
  rowDelay(picked);
  picked.forEach(it => { if (it.delay) it.el.style.setProperty('--nxp-d', it.delay + 'ms'); it.el.classList.add('nxp-reveal'); io.observe(it.el); });

  // The site's own reveal blocks (.nxh-reveal, driven by nx-home.js) get the same left-to-right stagger
  const own = [...root.querySelectorAll('.nxh-reveal:not(.nxh-in-view)')].map(el => { const b = el.getBoundingClientRect(); return { el, top: Math.round(b.top + scrollY), left: b.left, parent: el.parentElement, h: b.height }; }).filter(it => it.h > 0 && it.top > vh * .9);
  own.forEach(it => { if (!parents.has(it.parent)) parents.set(it.parent, ++pid); it.parentKey = parents.get(it.parent); });
  rowDelay(own);
  const ownIo = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    ownIo.unobserve(en.target);
    setTimeout(() => { en.target.style.transitionDelay = ''; }, 1400);   // or the delay would also slow the card's hover
  }), { threshold: 0 });
  own.forEach(it => { if (it.delay) { it.el.style.transitionDelay = it.delay + 'ms'; ownIo.observe(it.el); } });
})();

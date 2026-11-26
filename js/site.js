/* extero.ai, small behaviours shared by every page (no dependencies). Each block does nothing when its elements are missing.
   1. "Book a demo" buttons take their link from <body data-demo-url> (one place to change it) and open the booking
      page in a popup, as on nx.vet.
   2. Blocks marked .nxh-reveal rise in as they enter the screen (nx.vet's nx-home.js does this there; it is not loaded here).
   3. Hero video: the tag names the industry on screen.
   4. Industry cards: the clip plays under the pointer or on keyboard focus.
   5. Walkie-talkie band: two devices pass a message (green ring: recording; cyan double pulse: a message is waiting;
      cyan: it plays).
   6. Phone menu.
   7. Industries dropdown in the header (as on nx.vet).
   8. Photos, cards and devices lean towards the pointer (mouse only, never with reduced motion).
   9. Testimonials: one tab per person, the next one comes by itself until the visitor picks one.
   The device callouts come from nx.vet's own script (assets/theme/nx-extero-home.js). No cursor light on this site. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var each = function (sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); };
  var intent = function (event, fields) { window.dispatchEvent(new CustomEvent('nxvet:analytics', { detail: Object.assign({ event: event }, fields || {}) })); };
  // Only fixed page content and allowlisted categories enter these events, never enquiry text or contact details.
  each('a[href*="enquiry=software"]', function (a) {
    a.addEventListener('click', function () {
      var industry = new URL(a.href).searchParams.get('industry');
      var approved = ['dentistry','physiotherapy','facilities-maintenance','healthcare','manufacturing','construction','emergency-services'];
      intent('compatibility_enquiry_open', { industry: approved.indexOf(industry) >= 0 ? industry : 'unspecified' });
    });
  });
  each('.nxh-faq-list details', function (details) {
    details.addEventListener('toggle', function () {
      if (details.open) intent('faq_open', { question: details.querySelector('summary').textContent.trim().slice(0, 100) });
    });
  });
  var example = document.getElementById('recording');
  if (example && hasIO) {
    var exampleObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { intent('recording_example_view'); exampleObserver.disconnect(); }
    }, { threshold: 0.3 });
    exampleObserver.observe(example);
  }

  // 1. Demo links
  var demoUrl = document.body.getAttribute('data-demo-url');
  if (demoUrl) each('[data-demo]', function (a) {
    if (a.tagName !== 'A') return;
    a.href = demoUrl; a.target = '_blank'; a.rel = 'noopener';
  });

  // 1b. Book a demo popup, as on nx.vet (its sections/nx-header.liquid): every Book a demo button or calendar link opens
  //     the Google Calendar booking page in a popup instead of a new tab. Google only allows the "?gv=true" address in a frame.
  //     With Cmd, Ctrl or Shift held, or without this script, the link opens the booking page in a new tab.
  var EMBED = document.body.getAttribute('data-demo-embed') || 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ114p66on6RwJYyx1vNKe-pG4K0Lvkt_5qrpnkk7ZnYZGvSZ08khiUEYU5kIWoX8Fkj8BxDu3dC?gv=true';
  if (window.HTMLDialogElement && demoUrl) {
    var dlg = document.createElement('dialog');
    dlg.className = 'xbk'; dlg.id = 'XoBooking'; dlg.setAttribute('aria-labelledby', 'XoBookingTitle');
    dlg.innerHTML = '<div class="xbk-bar"><h2 id="XoBookingTitle">Book a 30-minute demo</h2>' +
      '<a class="xbk-ext" target="_blank" rel="noopener">Open in Google Calendar</a>' +
      '<button type="button" class="xbk-close" aria-label="Close">&times;</button></div>' +
      '<p class="xbk-context">Meet the NxVET team behind Extero. See the device, discuss your workflow and check software compatibility.</p>' +
      '<div class="xbk-body"><p class="xbk-loading">Loading available times&hellip;</p><iframe title="Book a demo with Extero"></iframe></div>';
    dlg.querySelector('.xbk-ext').href = demoUrl;
    document.body.appendChild(dlg);
    var frame = dlg.querySelector('iframe'), bookOpener = null;
    var unlock = function () { document.documentElement.classList.remove('xbk-lock'); };
    var closeBooking = function () { unlock(); if (dlg.open) dlg.close(); };
    frame.addEventListener('load', function () { if (frame.getAttribute('src')) dlg.classList.add('is-loaded'); });
    dlg.addEventListener('cancel', unlock);   // Esc
    dlg.addEventListener('close', function () { unlock(); if (bookOpener && bookOpener.focus) bookOpener.focus({ preventScroll: true }); });
    dlg.querySelector('.xbk-close').addEventListener('click', closeBooking);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeBooking(); });   // click on the backdrop
    // Capture phase, so no other script sends the visitor away first
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-demo], a[href*="calendar.app.google"]');
      if (!el || el.closest('#XoBooking') || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      bookOpener = el.closest('details.hd-menu') ? document.querySelector('.hd-menu > summary') : el;
      // Intent only. Opening a calendar does not establish a completed booking.
      var zone = el.closest('header, footer, section, dialog');
      window.dispatchEvent(new CustomEvent('nxvet:analytics', { detail: { event: 'demo_booking_open', placement: zone ? (zone.id || zone.className.split(' ')[0] || zone.tagName.toLowerCase()) : 'page' } }));
      if (!frame.getAttribute('src')) frame.src = EMBED;
      each('dialog[open], details.hd-menu[open]', function (d) { if (d !== dlg) { if (d.close) d.close(); else d.removeAttribute('open'); } });
      if (!dlg.open) dlg.showModal();
      document.documentElement.classList.add('xbk-lock');
    }, true);
  }

  // 2. Reveal on scroll (only where nx.vet's own script is not doing it already)
  var root = document.querySelector('.nxh-root.xo');
  if (root) {
    if (reduce || !hasIO) {
      each('.nxh-reveal', function (el) { el.classList.add('nxh-in-view'); }, root);
    } else {
      root.classList.add('nxh-js');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('nxh-in-view'); io.unobserve(e.target); } });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      each('.nxh-reveal', function (el) { io.observe(el); }, root);
    }
  }

  // 3. Hero video: the poster shows first; the film is fetched once the page has loaded (a smaller file on phones),
  //    and the tag names the industry on screen. With reduced motion it does not start by itself.
  var reel = document.querySelector('.xo-reel');
  if (reel) {
    var video = reel.querySelector('video'), tag = reel.querySelector('[data-labels]');
    var small = window.matchMedia && matchMedia('(max-width: 760px)').matches;
    if (video) {
      if (small && video.getAttribute('data-poster-small')) video.poster = video.getAttribute('data-poster-small');
      var control = document.createElement('button');
      control.type = 'button'; control.className = 'xo-video-control';
      control.textContent = 'Play video';
      video.controls = false;
      reel.appendChild(control);
      var setControl = function () { control.textContent = video.paused ? 'Play video' : 'Pause video'; };
      var startVideo = function () {
        if (!video.getAttribute('src')) video.src = (small && video.getAttribute('data-src-small')) || video.getAttribute('data-src');
        var p = video.play(); if (p && p.catch) p.catch(setControl);
      };
      control.addEventListener('click', function () { intent(video.paused ? 'video_play' : 'video_pause'); if (video.paused) startVideo(); else video.pause(); });
      video.addEventListener('play', setControl); video.addEventListener('pause', setControl);
      if (!reduce) {
        if (document.readyState === 'complete') startVideo(); else window.addEventListener('load', startVideo);
      }
      if (tag) {
        var labels = tag.getAttribute('data-labels').split('|'), shown = -1;
        video.addEventListener('timeupdate', function () {
          if (!video.duration) return;
          var i = Math.min(labels.length - 1, Math.floor(video.currentTime / (video.duration / labels.length)));
          if (i !== shown) { shown = i; tag.textContent = labels[i]; }
        });
      }
    }
  }

  // 4. Industry cards: pictures only since 2026-11-24 (the zoom under the pointer is in css/home.css)

  // 5. Walkie-talkie band
  var talk = document.querySelector('.xo-talk');
  if (talk) {
    var stage = talk.querySelector('.xo-talk-stage');
    var devs = stage ? stage.querySelectorAll('.xo-talk-dev') : [];
    var caps = stage ? stage.querySelectorAll('.xo-talk-unit p') : [];
    if (devs.length === 2 && caps.length === 2) {
      var PHASES = [
        { name: 'send', a: 'green', b: 'off', capA: ['Push-to-talk', 'Green ring: recording'], capB: ['Idle', 'Dark: idle and connected'], ms: 2600 },
        { name: 'wait', a: 'off', b: 'wait', capA: ['Sent', 'Dark: idle and connected'], capB: ['Cyan double pulse', 'A message is waiting'], ms: 2600 },
        { name: 'play', a: 'off', b: 'cyan', capA: ['Sent', 'Dark: idle and connected'], capB: ['Press to listen', 'Cyan: the message plays'], ms: 2800 }
      ];
      var setCap = function (p, t) { p.innerHTML = ''; var b = document.createElement('b'); b.textContent = t[0]; p.appendChild(b); p.appendChild(document.createTextNode(t[1])); };
      var k = 0, timer = 0, paused = false, onScreen = false;
      var show = function (i) {
        var ph = PHASES[i];
        stage.setAttribute('data-phase', ph.name);
        devs[0].setAttribute('data-led', ph.a); devs[1].setAttribute('data-led', ph.b);
        setCap(caps[0], ph.capA); setCap(caps[1], ph.capB);
      };
      var tick = function () { show(k); timer = setTimeout(function () { k = (k + 1) % PHASES.length; tick(); }, PHASES[k].ms); };
      if (reduce || !hasIO) {
        // One still picture: the sender recording, the receiver playing
        devs[0].setAttribute('data-led', 'green'); devs[1].setAttribute('data-led', 'cyan');
        setCap(caps[0], PHASES[0].capA); setCap(caps[1], PHASES[2].capB);
      } else {
        show(0);
        // No pause button under the walkie-talkie scene (Lucas, 2026-11-25: "remove pause animation button"); it stops
        // by itself off screen, and visitors who ask for reduced motion get the still picture above.
        new IntersectionObserver(function (entries) {
          clearTimeout(timer); timer = 0;
          onScreen = entries[0].isIntersecting;
          if (onScreen && !paused) tick();
        }, { threshold: 0.25 }).observe(stage);
      }
    }
  }

  // 6. Phone menu: close it after a tap on one of its links, on a tap outside and with Escape
  var menu = document.querySelector('.hd-menu');
  if (menu) {
    each('a', function (a) { a.addEventListener('click', function () { menu.removeAttribute('open'); }); }, menu);
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.removeAttribute('open'); });
  }

  // 7. Header dropdown (Industries), as on nx.vet: the stylesheet opens it on hover and on keyboard focus; a click on the
  //    button pins it open (touch screens), a click elsewhere, a click on one of its links or Escape closes it.
  var dds = Array.prototype.slice.call(document.querySelectorAll('.hd-dd'));
  var closeDds = function (except) {
    dds.forEach(function (d) { if (d !== except) { d.classList.remove('is-open'); d.classList.add('is-dismissed'); d.querySelector('button').setAttribute('aria-expanded', 'false'); } });
  };
  dds.forEach(function (d) {
    var b = d.querySelector('button');
    b.addEventListener('click', function () { var open = !d.classList.contains('is-open'); closeDds(d); d.classList.toggle('is-open', open); d.classList.toggle('is-dismissed', !open); b.setAttribute('aria-expanded', String(open)); });
    d.addEventListener('mouseenter', function () { d.classList.remove('is-dismissed'); b.setAttribute('aria-expanded', 'true'); });
    d.addEventListener('focusin', function (e) { if (!d.contains(e.relatedTarget)) { d.classList.remove('is-dismissed'); b.setAttribute('aria-expanded', 'true'); } });
    d.addEventListener('focusout', function (e) { if (!d.contains(e.relatedTarget)) closeDds(); });
    d.addEventListener('mouseleave', function () { if (!d.classList.contains('is-open')) b.setAttribute('aria-expanded', 'false'); });
    each('a', function (a) { a.addEventListener('click', function () { closeDds(); }); }, d);
  });
  if (dds.length) document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.hd-dd')) closeDds(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var focusedDropdown = document.activeElement.closest && document.activeElement.closest('.hd-dd');
    if (focusedDropdown) focusedDropdown.querySelector('button').focus();
    closeDds();
    if (menu && menu.open) { menu.removeAttribute('open'); menu.querySelector(':scope > summary').focus(); }
  });

  // 8. Leaning towards the pointer (after lupapets.com; Lucas, 2026-11-25: "mouse elements moving"). The pointer's place
  //    over "area" (-1 to 1 on each axis) turns "el" a few degrees and shifts it a few pixels, with a little lag. Only the
  //    CSS properties "rotate" and "translate" are written, so the element's own transforms (rise-in, hover) still work.
  //    Depth comes from "perspective" on the parents (css/home.css). One animation frame loop per element, only while it moves.
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduce && window.requestAnimationFrame && 'rotate' in document.documentElement.style) {
    var boxes = [];
    var lean = function (area, el, deg, shift, also) {
      var tx = 0, ty = 0, x = 0, y = 0, raf = 0, box = null;
      var frame = function () {
        x += (tx - x) * 0.12; y += (ty - y) * 0.12;
        var rest = !tx && !ty && Math.abs(x) + Math.abs(y) < 0.004;
        if (rest) x = y = 0;
        var m = Math.sqrt(x * x + y * y);
        el.style.rotate = rest ? '' : (-y).toFixed(3) + ' ' + x.toFixed(3) + ' 0 ' + (m * deg).toFixed(2) + 'deg';
        if (shift) el.style.translate = rest ? '' : (x * shift).toFixed(1) + 'px ' + (y * shift).toFixed(1) + 'px';
        if (also) also(x, y, rest);
        raf = rest || Math.abs(tx - x) + Math.abs(ty - y) < 0.002 ? 0 : requestAnimationFrame(frame);
      };
      area.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (!box) box = area.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, (e.clientX - box.left) / box.width * 2 - 1));
        ty = Math.max(-1, Math.min(1, (e.clientY - box.top) / box.height * 2 - 1));
        if (!raf) raf = requestAnimationFrame(frame);
      }, { passive: true });
      area.addEventListener('pointerleave', function () { tx = ty = 0; box = null; if (!raf) raf = requestAnimationFrame(frame); });
      boxes.push(function () { box = null; });
    };
    var forget = function () { boxes.forEach(function (f) { f(); }); };
    addEventListener('scroll', forget, { passive: true });
    addEventListener('resize', forget, { passive: true });

    var hero = document.querySelector('.xo .nxx-hero'), reel = hero && hero.querySelector('.xo-reel');
    if (reel) {
      var tag = reel.querySelector('.xo-reel-tag');
      lean(hero, reel, 4.5, 6, tag ? function (x, y, rest) { tag.style.translate = rest ? '' : (x * 7).toFixed(1) + 'px ' + (y * 5).toFixed(1) + 'px'; } : null);
    }
    each('.xo .xo-ind', function (card) {
      var img = card.querySelector('img');
      lean(card, card, 5, 0, img ? function (x, y, rest) { img.style.translate = rest ? '' : (-x * 4).toFixed(1) + 'px ' + (-y * 4).toFixed(1) + 'px'; } : null);
    });
    each('.xo .nxx-job', function (card) { lean(card, card, 3.5, 0); });
    each('.xo .nxx-floor-photo', function (fig) { lean(fig, fig, 3, 0); });
    var talkBand = document.querySelector('.xo-talk'), talkStage = talkBand && talkBand.querySelector('.xo-talk-stage');
    if (talkStage) lean(talkBand, talkStage, 4, 8);
    var saysMedia = document.querySelector('.xo-says-media'), saysDev = saysMedia && saysMedia.querySelector('.nxx-device');
    if (saysDev) lean(saysMedia, saysDev, 12, 10);
  }

  // 9. Testimonials (after lupapets.com): tabs. While the block is on screen the next quote comes by itself and the bar
  //    under the name shows the time left; it waits while the pointer or the keyboard focus is on the block and stops for
  //    good once the visitor picks a tab. Arrow keys move between tabs. With reduced motion nothing moves by itself.
  var says = document.querySelector('.xo-says');
  if (says) (function () {
    var tabs = Array.prototype.slice.call(says.querySelectorAll('[role=tab]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    if (tabs.length < 2 || panels.some(function (p) { return !p; })) return;
    var DUR = 9000, cur = 0, timer = 0, left = DUR, since = 0, auto = !reduce, seen = false, held = false;
    says.classList.add('is-js');
    says.style.setProperty('--says-dur', DUR + 'ms');
    var show = function (i, focus) {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) {
        t.setAttribute('aria-selected', String(k === cur)); t.tabIndex = k === cur ? 0 : -1;
        panels[k].hidden = k !== cur;
      });
      if (focus) tabs[cur].focus();
    };
    var stop = function () { clearTimeout(timer); timer = 0; };
    var run = function () {
      stop();
      if (!auto || !seen || held) return;
      since = Date.now();
      timer = setTimeout(function () { left = DUR; show(cur + 1); run(); }, left);
    };
    var hold = function (on) {
      if (!auto || held === on) return;
      if (on && timer) left = Math.max(600, left - (Date.now() - since));
      held = on; says.classList.toggle('is-held', on);
      if (on) stop(); else run();
    };
    var rotation = document.createElement('button');
    rotation.type = 'button'; rotation.className = 'xo-motion-control xo-says-control';
    rotation.textContent = auto ? 'Pause testimonials' : 'Play testimonials';
    says.querySelector('.xo-says-tabs').after(rotation);
    rotation.addEventListener('click', function () {
      auto = !auto; left = DUR; stop();
      rotation.textContent = auto ? 'Pause testimonials' : 'Play testimonials';
      says.classList.toggle('is-auto', auto);
      if (auto) { held = false; run(); } else says.classList.remove('is-held');
    });
    var pick = function (i, focus) { auto = false; stop(); says.classList.remove('is-auto', 'is-held'); rotation.textContent = 'Play testimonials'; show(i, focus); };
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { pick(k); });
      t.addEventListener('keydown', function (e) {
        var to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? k + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (to === null) return;
        e.preventDefault(); pick(to, true);
      });
    });
    show(0);
    if (!hasIO) { seen = true; return; }
    says.classList.toggle('is-auto', auto); says.classList.add('is-held'); held = true;
    says.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hold(true); });
    says.addEventListener('pointerleave', function () { if (seen) hold(false); });
    says.addEventListener('focusin', function () { hold(true); });
    says.addEventListener('focusout', function (e) { if (seen && !says.contains(e.relatedTarget) && !says.matches(':hover')) hold(false); });
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      if (!auto) return;
      if (seen) { if (!says.matches(':hover') && !says.contains(document.activeElement)) hold(false); } else hold(true);
    }, { threshold: 0.35 }).observe(says);
    document.addEventListener('visibilitychange', function () { if (document.hidden) hold(true); else if (seen && !says.matches(':hover')) hold(false); });
  })();

})();

// Keep promotional summaries distinct from standard pricing and expire them together.
(function () {
  'use strict';
  var nodes = document.querySelectorAll('[data-xo-offer]');
  var offer = document.querySelector('[data-bf-end], #NxBfOffer[data-end]');
  var end = offer && Number(offer.getAttribute('data-bf-end') || offer.getAttribute('data-end')) * 1000;
  var update = function () {
    var active = Boolean(end && Date.now() < end);
    nodes.forEach(function (el) {
      el.hidden = !active;
      el.textContent = active ? 'Black Friday: order by November 30 for the first year of Team Intelligence free. See the product page for your selected plan and renewal total.' : '';
    });
  };
  update();
  if (nodes.length) { setInterval(update, 60000); document.addEventListener('visibilitychange', update); }
})();

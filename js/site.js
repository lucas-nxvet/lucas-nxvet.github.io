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
   The device callouts come from nx.vet's own script (assets/theme/nx-extero-home.js). No cursor light on this site. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var each = function (sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); };

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
      bookOpener = el;
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
      var startVideo = function () {
        video.src = (small && video.getAttribute('data-src-small')) || video.getAttribute('data-src');
        if (reduce) { video.controls = true; return; }
        var p = video.play(); if (p && p.catch) p.catch(function () { video.controls = true; });
      };
      if (document.readyState === 'complete') startVideo(); else window.addEventListener('load', startVideo);
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
        { name: 'play', a: 'off', b: 'cyan', capA: ['Sent', 'Dark: idle and connected'], capB: ['Cyan', 'A message is playing'], ms: 2800 }
      ];
      var setCap = function (p, t) { p.innerHTML = ''; var b = document.createElement('b'); b.textContent = t[0]; p.appendChild(b); p.appendChild(document.createTextNode(t[1])); };
      var k = 0, timer = 0;
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
        new IntersectionObserver(function (entries) {
          clearTimeout(timer); timer = 0;
          if (entries[0].isIntersecting) tick();
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
    dds.forEach(function (d) { if (d !== except) { d.classList.remove('is-open'); d.querySelector('button').setAttribute('aria-expanded', 'false'); } });
  };
  dds.forEach(function (d) {
    var b = d.querySelector('button');
    b.addEventListener('click', function () { var open = !d.classList.contains('is-open'); closeDds(d); d.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open)); });
    d.addEventListener('mouseenter', function () { b.setAttribute('aria-expanded', 'true'); });
    d.addEventListener('mouseleave', function () { if (!d.classList.contains('is-open')) b.setAttribute('aria-expanded', 'false'); });
    each('a', function (a) { a.addEventListener('click', function () { closeDds(); a.blur(); }); }, d);
  });
  if (dds.length) document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.hd-dd')) closeDds(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDds(); if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.hd-dd')) document.activeElement.blur();
    if (menu) menu.removeAttribute('open');
  });

})();

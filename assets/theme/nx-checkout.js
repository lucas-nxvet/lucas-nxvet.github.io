// On-page checkout for the NxHUB / Extero / Clip / bundle shipping form (nxhub-shipping-form.liquid).
// Stripe Checkout in custom-UI mode (backend StripeCustomCheckout, nervex_software docs
// billing-starts-at-onboarding.md "The checkout page itself"): the backend creates the session with
// ui_mode=custom and hands back a client secret; this file draws the order summary in our own words
// (no "180 days free" badge — the plan is charged the day the first device comes online) and mounts
// Stripe's Payment Element + Express Checkout (Link / Apple Pay / Google Pay). Card data never
// touches our page. Stripe.js is loaded on demand from the release the backend names in its
// response (`stripeJs`, the one matching its API version): basil/clover expose
// initCheckout({ fetchClientSecret }) with the actions on the checkout object; dahlia/endive expose
// initCheckoutElementsSdk({ clientSecret }) + loadActions(). The session shape is the same.
//
// Rules learned the hard way (Stripe refuses otherwise): the billing address goes through
// updateBillingAddress() OR a mounted Billing Address Element, never both; when name / phone /
// email / address come from our form, the Payment Element is created with fields.billingDetails
// set to 'never' for each of them.
(function () {
  'use strict';

  var STRIPE_JS_DEFAULT_RELEASE = 'basil';
  var CAP_DAYS = 180;

  function stripeJsUrl(release) { return 'https://js.stripe.com/' + (String(release || STRIPE_JS_DEFAULT_RELEASE).replace(/[^a-z0-9]/g, '') || STRIPE_JS_DEFAULT_RELEASE) + '/stripe.js'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function qs(root, sel) { return root.querySelector(sel); }

  function loadStripeJs(release) {
    if (window.Stripe) return Promise.resolve(window.Stripe); // one Stripe.js per page; the first release loaded wins
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = stripeJsUrl(release); s.async = true;
      s.onload = function () { window.Stripe ? resolve(window.Stripe) : reject(new Error('Stripe.js did not define Stripe')); };
      s.onerror = function () { reject(new Error('Could not load Stripe.js')); };
      document.head.appendChild(s);
    });
  }

  function capDate(days) {
    var d = new Date(); d.setDate(d.getDate() + (days || CAP_DAYS));
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function intervalWord(recurring) {
    if (!recurring) return '';
    var n = recurring.intervalCount || 1, i = recurring.interval || 'month';
    return n === 1 ? i : n + ' ' + i + 's';
  }

  // Which device a plan line waits for, from Stripe's product name.
  function deviceOf(name) {
    if (/nxhub/i.test(name)) return 'NxHUB';
    if (/extero/i.test(name)) return 'Extero';
    if (/clinic intelligence/i.test(name)) return 'Extero'; // "Clinic Intelligence, per clinic" is sold with an Extero plan and starts with it
    if (/clip/i.test(name)) return 'Clip';
    return 'device';
  }

  // The sentence under a plan line: when it is charged (backend #2412/#2413: the day the first
  // device of that product comes online, 180-day cap; NxHUB Monthly's free month from that day).
  function planNote(line, opts) {
    var device = deviceOf(line.name);
    var cap = capDate(opts.capDays);
    var price = line.unitAmount.amount + ' per ' + intervalWord(line.recurring) + (line.quantity > 1 ? ' each' : '');
    if (device === 'NxHUB' && opts.freeMonth) {
      return price + '. Your free first month counts from the day your first NxHUB comes online; the first invoice comes 30 days after that. If no device is online by ' + cap + ', the plan starts that day.';
    }
    var which = device === 'device' ? 'device' : device;
    var note = price + ', charged from the day your first ' + which + ' comes online (no later than ' + cap + ').';
    // Clinic Intelligence: the first month is a one-time credit on the first plan invoice (backend), so the line says so.
    if (/clinic intelligence/i.test(line.name)) note += ' The first month is free: a credit on your first plan invoice.';
    return note;
  }

  // When the recurring total starts: the plan lines' own terms, aggregated. NxHUB Monthly with the
  // free month invoices 30 days after its first device; everything else the day its first device
  // comes online; a bundle names both.
  function thenWhen(lines, opts) {
    var devices = [], hubFree = false;
    lines.forEach(function (l) {
      if (!l.recurring) return;
      var d = deviceOf(l.name);
      if (d === 'NxHUB' && opts.freeMonth) hubFree = true;
      else if (devices.indexOf(d) < 0) devices.push(d);
    });
    var cap = 'at the latest ' + capDate(opts.capDays);
    if (hubFree && devices.length === 0) return 'with the first invoice 30 days after your first NxHUB comes online (' + cap + ', if no device is online by then).';
    if (hubFree) return 'NxHUB from 30 days after your first NxHUB comes online, ' + devices.join(' and ') + ' from the day your first ' + devices.join(' or ') + ' comes online (each ' + cap + ').';
    return 'from the day your first ' + (devices.length === 1 && devices[0] !== 'device' ? devices[0] : 'device') + ' comes online (' + cap + ').';
  }

  function renderSummary(root, session, opts) {
    var lines = session.lineItems || [];
    var html = '';
    lines.forEach(function (l) {
      var qty = l.quantity > 1 ? ' × ' + l.quantity : '';
      // name | amount on the first row; the note spans the full width underneath (CSS grid)
      if (l.recurring) {
        html += '<div class="nx-pay__line nx-pay__line--plan"><div class="nx-pay__name"><strong>' + esc(l.name) + '</strong>' + esc(qty) + '</div>'
          + '<span class="nx-pay__amount" data-plan-today>' + esc(l.total.amount) + ' <small>today</small></span>'
          + '<div class="nx-pay__note">' + esc(planNote(l, opts)) + '</div></div>';
      } else {
        html += '<div class="nx-pay__line"><div class="nx-pay__name"><strong>' + esc(l.name) + '</strong>' + esc(qty) + '</div>'
          + '<span class="nx-pay__amount">' + esc(l.total.amount) + '</span>'
          + (l.quantity > 1 ? '<div class="nx-pay__note">' + esc(l.unitAmount.amount) + ' each</div>' : '') + '</div>';
      }
    });
    var t = session.total || {};
    var rows = '';
    if (t.subtotal) rows += '<div class="nx-pay__total-row"><span>Subtotal</span><span>' + esc(t.subtotal.amount) + '</span></div>';
    if (t.discount && t.discount.minorUnitsAmount) rows += '<div class="nx-pay__total-row"><span>Discount</span><span>−' + esc(t.discount.amount) + '</span></div>';
    if (t.taxExclusive) rows += '<div class="nx-pay__total-row"><span>Tax</span><span data-tax>' + esc(t.taxExclusive.amount) + '</span></div>';
    rows += '<div class="nx-pay__total-row nx-pay__total-row--due"><span>Total due today</span><strong data-due-today>' + esc(t.total ? t.total.amount : '') + '</strong></div>';
    var then = '';
    if (session.recurring && session.recurring.dueNext && session.recurring.dueNext.total) {
      then = '<div class="nx-pay__then" data-then>Then ' + esc(session.recurring.dueNext.total.amount) + ' per ' + esc(intervalWord(session.recurring)) + ', ' + esc(thenWhen(lines, opts)) + '</div>';
    }
    qs(root, '[data-nx-pay-lines]').innerHTML = html;
    qs(root, '[data-nx-pay-totals]').innerHTML = rows + then;
    var btn = qs(root, '[data-nx-pay-btn]');
    // Stripe emits 'change' while a confirm is in flight; a re-render then must not hand the button
    // back (label and all), or a second click could confirm the same session twice.
    if (live && live.pending) return;
    var due = t.total ? t.total.amount : '';
    btn.textContent = (t.total && t.total.minorUnitsAmount === 0) ? 'Confirm order' : 'Pay ' + due;
    btn.disabled = !session.canConfirm;
  }

  function showError(root, msg) { var e = qs(root, '[data-nx-pay-error]'); e.textContent = msg || ''; e.style.display = msg ? 'block' : 'none'; }

  // The one live checkout on the page. Reopening (Change shipping details → Continue) tears the
  // previous one down: its Elements are unmounted, its handlers see a stale generation and do
  // nothing, so a click can never confirm an old session.
  var live = null;
  function teardown() {
    if (!live) return;
    live.dead = true;
    (live.elements || []).forEach(function (el) { try { el.unmount(); } catch (e) { /* already gone */ } });
    live = null;
  }

  // Same surface over both Stripe.js generations: { checkout (elements + on), actions (session reads,
  // updates, confirm) }.
  // The backend's uiMode decides which generation drives the session ("elements" = dahlia/endive):
  // every Stripe.js release defines both functions, each refusing the other generation's session.
  function initCheckout(stripe, clientSecret, elementsOptions, useElementsSdk) {
    if (useElementsSdk && typeof stripe.initCheckoutElementsSdk === 'function') {
      return Promise.resolve(stripe.initCheckoutElementsSdk({ clientSecret: clientSecret, elementsOptions: elementsOptions })).then(function (checkout) {
        return checkout.loadActions().then(function (r) {
          var a = r.actions;
          return { checkout: checkout, getSession: function () { return a.getSession(); }, actions: a };
        });
      });
    }
    return stripe.initCheckout({ fetchClientSecret: function () { return Promise.resolve(clientSecret); }, elementsOptions: elementsOptions }).then(function (checkout) {
      return { checkout: checkout, getSession: function () { return checkout.session(); }, actions: checkout };
    });
  }

  // opts: { pk, clientSecret, uiMode ('custom' | 'elements'), stripeJs (release), root (element), contact: { email, phone, name, address|null },
  //         billingSame (default true: the form's address is the billing address; false: Stripe's Billing
  //         Address Element collects a different one), freeMonth, capDays, onBack(), onFallback(error) }
  // Stripe refuses a mounted Billing Address Element together with updateBillingAddress(), so the two
  // choices are two checkouts: toggling the "same as shipping" box re-opens with or without the address.
  function open(opts) {
    var root = opts.root;
    teardown();
    opts.shippingAddress = opts.shippingAddress || (opts.contact && opts.contact.address) || null;
    var sameBilling = opts.billingSame !== false;
    var me = { dead: false, elements: [], pending: false, checkout: null, actions: null, chain: null, opts: opts };
    live = me;
    showError(root, '');
    ['[data-nx-pay-lines]', '[data-nx-pay-totals]', '[data-nx-pay-express]', '[data-nx-pay-element]', '[data-nx-pay-address-el]'].forEach(function (sel) { var el = qs(root, sel); if (el) el.innerHTML = ''; });
    root.hidden = false;
    root.setAttribute('aria-busy', 'true');
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var heading = qs(root, '[data-nx-pay-heading]');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    var busy = qs(root, '[data-nx-pay-loading]');
    if (busy) busy.hidden = false;
    bindOnce(root);

    return loadStripeJs(opts.stripeJs).then(function (Stripe) {
      var stripe = Stripe(opts.pk);
      return initCheckout(stripe, opts.clientSecret, { appearance: { variables: { colorPrimary: '#37c2d6', colorText: '#1f2b3a', borderRadius: '10px', fontFamily: 'inherit' } } }, opts.uiMode === 'elements');
    }).then(function (ck) {
      if (me.dead) return null; // reopened while Stripe.js was loading
      var checkout = ck.checkout, actions = ck.actions;
      me.checkout = checkout; me.actions = actions;
      if (busy) busy.hidden = true;
      root.removeAttribute('aria-busy');
      var contact = Object.assign({}, opts.contact || {}, { address: sameBilling ? opts.shippingAddress : null });
      var sameBox = qs(root, '[data-nx-pay-same]');
      if (sameBox) { sameBox.checked = sameBilling; var wrap = sameBox.closest('[data-nx-pay-same-wrap]') || sameBox.parentNode; wrap.hidden = !opts.shippingAddress; }

      renderSummary(root, ck.getSession(), opts);
      checkout.on('change', function (session) { if (!me.dead) renderSummary(root, session, opts); });

      // Each update either rejects or answers { type: 'error' }; both become a visible error, never a
      // silently broken chain (a broken chain leaves the session without its billing address and Pay
      // disabled for good).
      var session0 = ck.getSession() || {};
      function step(chain, fn) { return chain.then(fn).then(function (r) { if (r && r.type === 'error') throw new Error((r.error && r.error.message) || 'Stripe refused the update.'); }); }
      var chain = Promise.resolve();
      if (contact.phone && contact.phone !== session0.phoneNumber) chain = step(chain, function () { return actions.updatePhoneNumber(contact.phone); });
      // Stripe refuses updateEmail on a session created with customer_email or a customer that has one
      // (every session our backend creates with an email); only fill in a missing email.
      if (contact.email && !session0.email) chain = step(chain, function () { return actions.updateEmail(contact.email); });

      var fields = { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } };
      if (contact.address && contact.address.line1) {
        // Billing = the address on the form (the shipping address, or the clinic's when nothing ships).
        chain = step(chain, function () { return actions.updateBillingAddress({ name: contact.name || undefined, address: contact.address }); });
        qs(root, '[data-nx-pay-address]').hidden = true;
      } else {
        // No address on the form (devices already owned), or a different billing address: Stripe's
        // Billing Address Element collects it (name included) and the session's tax follows it.
        qs(root, '[data-nx-pay-address]').hidden = false;
        var addressEl = checkout.createBillingAddressElement({ display: { name: 'full' } });
        addressEl.mount('[data-nx-pay-address-el]'); me.elements.push(addressEl);
      }
      me.chain = chain;
      chain.catch(function (e) { if (!me.dead) showError(root, (e && e.message) || 'Could not send your details to Stripe.'); });

      var express = checkout.createExpressCheckoutElement();
      express.on('confirm', function (event) {
        if (me.dead || me.pending) return;
        me.pending = true;
        actions.confirm({ expressCheckoutConfirmEvent: event }).then(function (r) { me.pending = false; if (r && r.error) showError(root, r.error.message); });
      });
      express.mount('[data-nx-pay-express]'); me.elements.push(express);
      var payment = checkout.createPaymentElement({ fields: fields });
      payment.mount('[data-nx-pay-element]'); me.elements.push(payment);
      return checkout;
    }).catch(function (err) {
      if (me.dead) return;
      if (busy) busy.hidden = true;
      root.removeAttribute('aria-busy');
      if (opts.onFallback) { opts.onFallback(err); return; }
      showError(root, (err && err.message) || 'Could not load the payment form.');
    });
  }

  // The promo, Pay and back buttons are bound once per page and act on the live checkout only.
  function bindOnce(root) {
    if (root.__nxPayBound) return;
    root.__nxPayBound = true;
    var promoBtn = qs(root, '[data-nx-pay-promo-btn]'), promoIn = qs(root, '[data-nx-pay-promo]');
    if (promoBtn && promoIn) {
      promoIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); promoBtn.click(); } });
      promoBtn.addEventListener('click', function () {
        var me = live; if (!me || !me.actions) return;
        var code = (promoIn.value || '').trim();
        if (!code) return;
        promoBtn.disabled = true;
        me.actions.applyPromotionCode(code).then(function (r) {
          promoBtn.disabled = false;
          if (me.dead) return;
          if (r && r.error) { showError(root, r.error.message || 'That promo code did not apply.'); return; }
          showError(root, ''); promoIn.value = '';
        }, function (e) { promoBtn.disabled = false; if (!me.dead) showError(root, e.message); });
      });
    }
    var btn = qs(root, '[data-nx-pay-btn]');
    btn.addEventListener('click', function () {
      var me = live; if (!me || !me.actions || me.pending) return;
      me.pending = true; btn.disabled = true; showError(root, '');
      var label = btn.textContent; btn.textContent = 'Processing…'; btn.setAttribute('aria-busy', 'true');
      (me.chain || Promise.resolve()).then(function () { return me.actions.confirm(); }).then(function (r) {
        // On success Stripe redirects to the return URL; we only get here on an error.
        me.pending = false; btn.removeAttribute('aria-busy');
        if (me.dead) return;
        if (r && r.error) { showError(root, r.error.message || 'The payment could not be completed.'); btn.textContent = label; btn.disabled = false; }
      }, function (e) { me.pending = false; btn.removeAttribute('aria-busy'); if (me.dead) return; showError(root, e.message || 'The payment could not be completed.'); btn.textContent = label; btn.disabled = false; });
    });
    var back = qs(root, '[data-nx-pay-back]');
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); var me = live; teardown(); if (me && me.opts.onBack) me.opts.onBack(); });
    var same = qs(root, '[data-nx-pay-same]');
    if (same) same.addEventListener('change', function () {
      var me = live; if (!me || me.pending) { if (me) same.checked = me.opts.billingSame !== false; return; }
      open(Object.assign({}, me.opts, { billingSame: same.checked }));
    });
  }

  window.NxCheckout = { open: open, close: teardown, capDate: capDate, planNote: planNote, deviceOf: deviceOf, thenWhen: thenWhen };
})();

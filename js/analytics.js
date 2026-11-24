/* extero.ai: Google Analytics 4, property "Extero (extero.ai)" in the NxVet account, web stream "extero.ai website",
   measurement ID G-CG4WH8P996 (created 2026-11-24 on Lucas's "separate property"). Loaded on every page.

   It runs ONLY on extero.ai and www.extero.ai, so the preview link, a test host and a local preview never reach the
   numbers. To try it anywhere else, add ?ga_test=1 to the address: the hits are then flagged as debug hits (Admin,
   DebugView in Analytics).

   Page views are sent by the tag itself. On top of them it forwards the events the pages already dispatch on
   'nxvet:analytics' (the same event bus as nx.vet, see the theme's snippets/nx-analytics.liquid):
     demo_booking_open -> generate_lead    "Book a demo" popup opened (js/site.js). The booking itself happens inside
                                           Google Calendar's frame, which a page cannot see.
     preorder_signup   -> generate_lead    pre-order list joined (product page, only while pre-orders use the list)
     select_plan       -> begin_checkout   "Continue to checkout" on the product page. The checkout itself is on nx.vet for
                                           now (CHECKOUT_ON_NXVET in build.mjs), so this is the last step this site sees;
                                           the order and the payment are counted in nx.vet's own property.
     anything else     -> same name        bf_popup_view, bf_popup_click, bf_popup_dismiss, bf_snipe_click, volume_prompt...
   In Analytics, mark generate_lead and begin_checkout as key events; Google Ads can then import them.
   No consent banner on this site, as on nx.vet outside a Shopify banner: the tag runs for every visitor. */
(function () {
  'use strict';
  if (window.__xoGa) return; window.__xoGa = 1;
  var ID = 'G-CG4WH8P996';
  var MAP = { demo_booking_open: 'generate_lead', preorder_signup: 'generate_lead', select_plan: 'begin_checkout' };
  var live = /^(www\.)?extero\.ai$/i.test(location.hostname);
  var test = /[?&]ga_test=1(&|$)/.test(location.search);
  if (!live && !test) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ID, test && !live ? { debug_mode: true } : {});
  var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
  window.addEventListener('nxvet:analytics', function (e) {
    var d = e.detail || {}, raw = String(d.event || ''); if (!raw) return;
    var p = { nx_event: raw, page_path: location.pathname };
    Object.keys(d).forEach(function (k) { var v = d[k]; if (k !== 'event' && v != null && v !== '') p[k] = typeof v === 'string' ? v.slice(0, 100) : v; });
    window.gtag('event', MAP[raw] || raw, p);
  });
})();

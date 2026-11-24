/* No lone last word (Lucas, 2026-11-09): a word or punctuation mark must never sit alone on the
   last line of a text block. base.css sets text-wrap: pretty (balance on headings), which
   Chrome mostly honours; this script makes it certain in every browser:
   1. the last two words of each text block are kept on one line (<nx-nw>, white-space: nowrap);
      A custom tag, not a span: theme rules like "label span" or ".callout span" must not style it.
   2. "Wi-Fi" never breaks at its hyphen.
   Runs on load and again when page scripts change text (checkout summary, pickers). */
(function () {
  'use strict';
  var BLOCKS = 'p,li,h1,h2,h3,h4,h5,h6,summary,dd,dt,figcaption,blockquote,td,th,label,small,span,strong,b,em,i,a,button,div';
  var INLINE = /^(A|B|STRONG|EM|I|SPAN|SMALL|SUP|SUB|CODE|BR|SVG|IMG|U|MARK|ABBR|TIME|S|NX-NW)$/;
  var TEXT_SKIP = 'script,style,noscript,textarea,input,select,option,svg,pre,code,[contenteditable]';
  var SKIP = TEXT_SKIP + ',nx-nw';

  function isLeafBlock(el) {
    if (!el.firstChild) return false;
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (!INLINE.test(c.tagName)) return false;
    }
    // Flex and grid boxes turn a split text node into separate items, so leave them alone.
    var d = getComputedStyle(el).display;
    return d === 'block' || d === 'list-item' || d === 'inline-block' || d === 'table-cell' || d === 'flow-root';
  }

  function lastTextNode(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var n, last = null;
    while ((n = walker.nextNode())) {
      if (n.data.trim() && !(n.parentElement && n.parentElement.closest(TEXT_SKIP))) last = n;
    }
    return last;
  }

  function glueTail(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (text.split(' ').length < 2) return;
    if (el.querySelector('[data-nx-tail]')) return; // already done
    var node = lastTextNode(el);
    if (!node || node.parentElement.closest('[data-nx-tail]')) return;
    var data = node.data.replace(/\s+$/, '');
    var span = document.createElement('nx-nw');
    span.setAttribute('data-nx-tail', '');
    span._nxBox = el; // the text block it must fit in (an inline parent has no width)
    var m = /(\S+)(\s+)(\S+)$/.exec(data);
    if (m) {
      var tail = node.splitText(m.index);
      tail.parentNode.insertBefore(span, tail);
      span.appendChild(tail);
      return span;
    }
    // Only one word in the last text node ("list <span>Wi-Fi</span> networks.", "See all <a>integrations</a>"):
    // step out of inline wrappers that hold nothing else, then glue that unit to what comes before it.
    var unit = node;
    while (!unit.previousSibling && unit.parentNode !== el && unit.parentNode.childNodes.length === 1) unit = unit.parentNode;
    var prev = unit.previousSibling;
    if (!prev || (prev.nodeType === 1 && (!INLINE.test(prev.tagName) || prev.tagName === 'BR'))) return;
    var w = prev.nodeType === 3 ? /(\S+\s*)$/.exec(prev.data) : null;
    if (prev.nodeType === 3 && !w) return;
    unit.parentNode.insertBefore(span, unit);
    span.appendChild(w ? prev.splitText(w.index) : prev);
    span.appendChild(unit);
    // Still a single word ("tap <b>Scan</b>."): pull in the word before it as well.
    var before = span.previousSibling;
    if (!/\s/.test(span.textContent.trim()) && before && before.nodeType === 3) {
      var w2 = /(\S+\s+)$/.exec(before.data);
      if (w2) span.insertBefore(before.splitText(w2.index), span.firstChild);
    }
    return span;
  }

  function unwrap(span) {
    var parent = span.parentNode;
    if (!parent) return true;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
    return true;
  }

  // A glued pair wider than its box would overflow (big headings on phones): undo those.
  // Hidden boxes (closed FAQ answers, menus) measure 0 wide: keep them glued, recheck when shown.
  function unglueTooWide(spans) {
    var wide = spans.filter(function (span) {
      var box = span._nxBox;
      if (!box || !box.isConnected || box.clientWidth === 0) return false;
      return span.getBoundingClientRect().width > box.clientWidth - 1;
    });
    wide.forEach(unwrap);
  }

  function noBreakWifi(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var hits = [], n;
    while ((n = walker.nextNode())) {
      if (n.data.indexOf('Wi-Fi') !== -1 && !(n.parentElement && n.parentElement.closest(SKIP))) hits.push(n);
    }
    hits.forEach(function (node) {
      var i;
      while (node && (i = node.data.indexOf('Wi-Fi')) !== -1) {
        var word = node.splitText(i);
        var rest = word.splitText(5);
        var span = document.createElement('nx-nw');
        word.parentNode.insertBefore(span, word);
        span.appendChild(word);
        node = rest;
      }
    });
  }

  var OBS = { childList: true, subtree: true, characterData: true };
  var observer, timer = null, pending = [];
  function process(root) {
    var list = root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll(BLOCKS)) : [];
    if (root.matches && root.matches(BLOCKS)) list.push(root);
    var glued = [];
    list.forEach(function (el) {
      if (el.closest(SKIP) || !isLeafBlock(el)) return;
      var span = glueTail(el);
      if (span) glued.push(span);
    });
    unglueTooWide(glued); // all writes first, then one layout read
    noBreakWifi(root); // after the tails, so "clinic Wi-Fi." is glued as a pair first
  }
  function run(roots) {
    if (observer) observer.disconnect();
    try { roots.forEach(process); } catch (e) { /* cosmetic only: never break the page */ }
    if (observer) observer.observe(document.body, OBS);
  }
  // Page scripts that rewrite text (checkout summary, pickers): redo only the blocks they touched.
  function onMutations(records) {
    records.forEach(function (rec) {
      var t = rec.target.nodeType === 1 ? rec.target : rec.target.parentElement;
      if (!t || !t.isConnected) return;
      var block = t.closest(BLOCKS) || t;
      if (pending.indexOf(block) === -1) pending.push(block);
    });
    if (timer) return;
    timer = setTimeout(function () {
      var roots = pending.filter(function (el) { return el.isConnected; });
      pending = []; timer = null;
      run(roots);
    }, 120);
  }

  function start() {
    run([document.body]);
    if ('MutationObserver' in window) {
      observer = new MutationObserver(onMutations);
      observer.observe(document.body, OBS);
    }
    // Narrower window (rotation) or an FAQ answer opening: a pair may no longer fit.
    var rt = null;
    function recheck(root) {
      if (observer) observer.disconnect();
      try { unglueTooWide(Array.prototype.slice.call((root || document).querySelectorAll('[data-nx-tail]'))); } catch (e) {}
      if (observer) observer.observe(document.body, OBS);
    }
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(recheck, 200);
    });
    document.addEventListener('toggle', function (e) {
      if (e.target && e.target.open) recheck(e.target);
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

/* BBC site enhancements. Every page is complete and readable without this file.
   It adds: a theme button, the tap-a-step Studio track, two small tools that save and send nothing,
   copy buttons, and the launcher for the 3D tour (which loads only after its button is pressed).
   All words come from the JSON data block in the page (#bbc-data), not from this file. */
(function () {
  'use strict';

  var data = {};
  try {
    var node = document.getElementById('bbc-data');
    if (node) data = JSON.parse(node.textContent) || {};
  } catch (e) { data = {}; }
  var ui = data.ui || {};
  var studio = data.studio || null;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (attrs[k] === true) e.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (k) { if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return e;
  }
  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }
  function copyText(text, msgEl) {
    function ok() { if (msgEl) msgEl.textContent = ui.copied || ''; }
    function fallback() {
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.className = 'sr-copy';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { if (msgEl) msgEl.textContent = ui.copyFailed || ''; }
      document.body.removeChild(t);
    }
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  }

  /* theme: follows the device; the button switches for this visit only */
  /* menu: on small screens the links open as a panel; without JavaScript they stay in a scrolling row */
  var menuBtn = $('#menuBtn');
  var root = document.documentElement;
  if (menuBtn) {
    root.classList.add('has-menu');
    menuBtn.hidden = false;
    var setMenu = function (open) {
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', menuBtn.getAttribute(open ? 'data-label-close' : 'data-label-open'));
    };
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    $('#siteNav').addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', function (e) {
      if (root.classList.contains('menu-open') && !e.target.closest('header.site')) setMenu(false);
    });
    if (window.matchMedia) {
      var wide = matchMedia('(min-width: 861px)');
      var onWide = function (m) { if (m.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
    }
  }

  var themeBtn = $('#themeBtn');
  if (themeBtn) {
    themeBtn.hidden = false;
    themeBtn.addEventListener('click', function () {
      var r = document.documentElement;
      var cur = r.getAttribute('data-theme');
      var dark = cur === 'dark' || (!cur && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      r.setAttribute('data-theme', dark ? 'light' : 'dark');
    });
  }

  /* print: open every disclosure so nothing is hidden on paper */
  window.addEventListener('beforeprint', function () {
    $$('details').forEach(function (d) { d.setAttribute('open', ''); });
  });

  /* email: copy button next to the address */
  var emailCopy = $('#emailCopy');
  if (emailCopy) {
    emailCopy.hidden = false;
    emailCopy.addEventListener('click', function () {
      copyText($('#emailText').textContent, $('#emailMsg'));
    });
  }

  /* studio: tap-a-step track, built from the same data as the table */
  var staticTable = $('#studioStatic');
  var live = $('#studioLive');
  if (staticTable && live && studio) {
    var cur = 0;
    var fromHash = /^#step-(\d)$/.exec(location.hash || '');
    if (fromHash) cur = Math.max(0, Math.min(studio.steps.length - 1, +fromHash[1] - 1));

    var renderStudio = function () {
      live.textContent = '';
      var track = h('div', { class: 'track', role: 'group', 'aria-label': ui.studioPick });
      track.appendChild(h('div', { class: 'rowlab', text: ui.studioRowStep }));
      studio.steps.forEach(function (s, i) {
        var b = h('button', { class: 'step-btn', type: 'button', 'aria-pressed': i === cur ? 'true' : 'false' }, [
          h('span', { class: 'n', text: String(s.n) }),
          h('span', { class: 't', text: s.title })
        ]);
        b.addEventListener('click', function () { cur = i; if (history.replaceState) history.replaceState(null, '', '#step-' + s.n); renderStudio(); var again = $('.step-btn[aria-pressed="true"]', live); if (again) again.focus(); });
        track.appendChild(b);
      });
      track.appendChild(h('div', { class: 'rowlab', text: ui.studioRowAi }));
      studio.steps.forEach(function (s, i) {
        track.appendChild(h('div', { class: 'cell ' + s.ai + (i === cur ? ' on' : ''), text: studio.roles[s.ai].label }));
      });
      track.appendChild(h('div', { class: 'rowlab', text: ui.studioRowPartner }));
      studio.steps.forEach(function (s, i) {
        track.appendChild(h('div', { class: 'cell ' + (s.partner ? 'tutor' : 'none') + (i === cur ? ' on' : ''), text: s.partner ? studio.partner.yes : '—', 'aria-label': s.partner ? studio.partner.yes : studio.partner.no }));
      });
      track.appendChild(h('div', { class: 'rowlab', text: ui.studioRowFacilitator }));
      studio.steps.forEach(function (s, i) {
        var kind = s.facilitator ? s.facilitator.kind : 'guide';
        var label = kind === 'decide' ? ui.studioDecides : kind === 'signoff' ? ui.studioSignsOff : ui.studioGuides;
        track.appendChild(h('div', { class: 'cell ' + (s.facilitator ? 'own' : 'none') + (i === cur ? ' on' : ''), text: label }));
      });
      live.appendChild(h('div', { class: 'track-scroll' }, [track]));

      var s = studio.steps[cur];
      var role = studio.roles[s.ai];
      var panel = h('div', { class: 'panel', 'aria-live': 'polite' }, [
        h('div', {}, [
          h('div', { class: 'big', text: String(s.n) }),
          h('h3', { text: s.title }),
          h('p', { class: 'lede', text: s.what })
        ]),
        h('ul', { class: 'facts' }, [
          h('li', {}, [h('span', { class: 'mono', text: ui.studioLabelAi }), h('span', {}, [h('span', { class: 'pill ' + s.ai, text: role.label }), h('br'), role.explain])]),
          h('li', {}, [h('span', { class: 'mono', text: ui.studioLabelPartner }), h('span', { text: s.partner ? studio.partner.yesLong : studio.partner.noLong })]),
          h('li', {}, [h('span', { class: 'mono', text: ui.studioLabelFacilitator }), h('span', { text: s.facilitator ? s.facilitator.text : studio.facilitatorDefault })])
        ])
      ]);
      live.appendChild(panel);
    };
    renderStudio();
    staticTable.hidden = true;
    live.hidden = false;
    window.addEventListener('hashchange', function () {
      var m = /^#step-(\d)$/.exec(location.hash || '');
      if (m) { cur = Math.max(0, Math.min(studio.steps.length - 1, +m[1] - 1)); renderStudio(); }
    });
  }

  /* tool: five questions for your field (saves and sends nothing) */
  var lensHost = $('[data-tool="lens"]');
  if (lensHost && ui.lensQuestions) {
    var qEls = [];
    var field = h('input', { id: 'lens-field', type: 'text', placeholder: ui.lensFieldHint });
    var form = h('div', { class: 'spec' }, [h('div', { class: 'field' }, [h('label', { for: 'lens-field', text: ui.lensField }), field])]);
    ui.lensQuestions.forEach(function (q, i) {
      var ta = h('textarea', { id: 'lens-' + i });
      qEls.push(ta);
      form.appendChild(h('div', { class: 'field' }, [h('label', { for: 'lens-' + i, text: q }), ta]));
    });
    var meter = h('i', { class: 'p0' });
    var count = h('p', { class: 'hint', 'aria-live': 'polite', text: fill(ui.lensCount, { done: 0 }) });
    var brief = h('pre', { class: 'brief', 'aria-live': 'polite', text: ui.lensEmpty });
    var msg = h('span', { class: 'hint', role: 'status' });
    var copyBtn = h('button', { class: 'btn small', type: 'button', text: ui.lensCopy });
    var makeBrief = function () {
      var done = 0, lines = [];
      qEls.forEach(function (q, i) { var v = q.value.trim(); if (v) { done++; lines.push(ui.lensShort[i] + ': ' + v); } });
      meter.className = 'p' + done;
      count.textContent = fill(ui.lensCount, { done: done });
      var f = field.value.trim();
      var text = done
        ? ui.lensTitle + (f ? ' - ' + f : '') + '\n\n' + lines.join('\n\n') + (qEls[4].value.trim() ? '' : '\n\n' + ui.lensStill)
        : ui.lensEmpty;
      brief.textContent = text;
      return done ? text : '';
    };
    qEls.concat([field]).forEach(function (el) { el.addEventListener('input', makeBrief); });
    copyBtn.addEventListener('click', function () {
      var t = makeBrief();
      if (!t) { msg.textContent = ui.lensNeedOne; return; }
      copyText(t, msg);
    });
    lensHost.appendChild(h('div', { class: 'grid g2' }, [
      form,
      h('div', { class: 'spec preview' }, [
        h('div', {}, [h('div', { class: 'meter', 'aria-hidden': 'true' }, [meter]), count]),
        brief,
        h('div', { class: 'actions' }, [copyBtn, msg]),
        h('p', { class: 'hint', text: ui.lensNote })
      ])
    ]));
    lensHost.hidden = false;
    var plainList = lensHost.previousElementSibling;
    if (plainList && plainList.tagName === 'OL') plainList.hidden = true; // the worksheet shows the same five questions
    var ns = lensHost.nextElementSibling; if (ns && ns.tagName === 'NOSCRIPT') ns.remove();
  }

  /* tool: interest-message builder (saves and sends nothing) */
  var interestHost = $('[data-tool="interest"]');
  if (interestHost && ui.roles) {
    var role = 0;
    var chips = h('div', { class: 'chips' });
    var nameEl = h('input', { id: 'inv-name', type: 'text', autocomplete: 'name' });
    var placeEl = h('input', { id: 'inv-place', type: 'text', placeholder: ui.interestPlaceHint });
    var msgEl = h('textarea', { id: 'inv-msg', placeholder: ui.interestMessageHint });
    var out = h('pre', { class: 'brief', 'aria-live': 'polite' });
    var note = h('p', { class: 'hint' });
    var status = h('span', { class: 'hint', role: 'status' });
    var mailBtn = null;
    var updateMail = function () {};
    var build = function () {
      var r = ui.roles[role];
      var n = nameEl.value.trim(), p = placeEl.value.trim(), m = msgEl.value.trim();
      var text = 'Subject: ' + fill(ui.interestSubject, { role: r }) + '\n\n' + ui.interestHello + '\n\n' +
        fill(ui.interestIntro, { role: r.toLowerCase(), place: p ? fill(ui.interestIn, { place: p }) : '' }) + ' ' +
        (m || ui.interestDefault) + '\n\n' + ui.interestThanks + (n ? ',\n' + n : '.');
      out.textContent = text;
      updateMail(text);
      return text;
    };
    var renderChips = function () {
      chips.textContent = '';
      ui.roles.forEach(function (r, i) {
        var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': i === role ? 'true' : 'false', text: r });
        b.addEventListener('click', function () { role = i; renderChips(); build(); });
        chips.appendChild(b);
      });
    };
    renderChips();
    [nameEl, placeEl, msgEl].forEach(function (el) { el.addEventListener('input', build); });
    note.textContent = data.email ? ui.interestNote : ui.interestNoteNoEmail;
    if (data.email) {
      mailBtn = h('a', { class: 'btn', href: 'mailto:' + data.email }, [ui.interestOpen]);
      updateMail = function (text) {
        var lines = text.split('\n');
        var subject = lines[0].replace(/^Subject:\s*/, '');
        var body = lines.slice(2).join('\r\n');
        mailBtn.href = 'mailto:' + data.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      };
    }
    var copyMsg = h('button', { class: 'btn ghost', type: 'button', text: ui.interestCopy });
    copyMsg.addEventListener('click', function () { copyText(build(), status); });
    build();
    interestHost.appendChild(h('div', { class: 'grid g2' }, [
      h('div', { class: 'spec' }, [
        h('fieldset', {}, [h('legend', { text: ui.interestIam }), chips]),
        h('div', { class: 'field' }, [h('label', { for: 'inv-name', text: ui.interestName }), nameEl]),
        h('div', { class: 'field' }, [h('label', { for: 'inv-place', text: ui.interestPlace }), placeEl]),
        h('div', { class: 'field' }, [h('label', { for: 'inv-msg', text: ui.interestMessage }), msgEl, h('span', { class: 'hint', text: ui.interestWarning })])
      ]),
      h('div', { class: 'spec preview' }, [
        h('h3', { text: ui.interestTitle }),
        out,
        h('div', { class: 'actions' }, mailBtn ? [mailBtn, copyMsg, status] : [copyMsg, status]),
        note
      ])
    ]));
    interestHost.hidden = false;
    var ns2 = interestHost.nextElementSibling; if (ns2 && ns2.tagName === 'NOSCRIPT') ns2.remove();
  }

  /* 3D scene in the home hero.
   It starts by itself, after the page has loaded and the browser is idle, but only for visitors who can take it:
   not with reduced motion, data-saver on, or a 2G/3G connection. Everyone else keeps the still poster and the
   button, which loads the scene when pressed. The page works fully without any of this. */
  var startBtn = $('#startTour');
  var hero = $('#hero');
  if (startBtn && hero && studio) {
    startBtn.hidden = false;
    var ctrl = null, booting = false, wantTour = false, userStarted = false;
    var labelHtml = startBtn.innerHTML;
    var studioHref = ($('.hero .actions .btn') || {}).href || '/';

    var canAmbient = function () {
      try {
        if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
        var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
        if (c.saveData) return false;
        if (/^(slow-2g|2g|3g)$/.test(c.effectiveType || '')) return false;
        if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
      } catch (e) { /* assume capable */ }
      return true;
    };
    var load = function (src, done, fail) {
      var s = document.createElement('script');
      s.src = src; s.onload = done; s.onerror = fail;
      document.head.appendChild(s);
    };
    var showFailure = function (text) {
      var old = $('#tourNote');
      if (old) old.remove();
      var note = h('aside', { class: 'note', id: 'tourNote', role: 'status' }, [text]);
      hero.insertAdjacentElement('afterend', note);
    };
    var restore = function () { startBtn.disabled = false; startBtn.innerHTML = labelHtml; };
    var boot = function (thenTour) {
      if (ctrl) { if (thenTour) ctrl.enterTour(); return; }
      if (booting) { wantTour = wantTour || thenTour; return; }
      booting = true;
      wantTour = thenTour;
      var fail = function (shown) {
        booting = false; restore();
        if (userStarted) showFailure(shown || ui.tourFailed);
      };
      load('/vendor/three.min.js', function () {
        load('/tour.js', function () {
          ctrl = window.BBCTour.start({
            hero: hero, ui: ui, studio: studio, studioHref: studioHref,
            onExit: function () { startBtn.focus(); },
            onFail: function () { ctrl = null; }
          });
          booting = false;
          restore();
          if (!ctrl) { if (userStarted) showFailure(ui.tourNoGL); return; }
          if (wantTour) ctrl.enterTour();
        }, fail);
      }, fail);
    };

    startBtn.addEventListener('click', function () {
      userStarted = true;
      var old = $('#tourNote');
      if (old) old.remove();
      if (!ctrl) { startBtn.disabled = true; startBtn.textContent = ui.tourLoading; }
      boot(true);
    });

    if (canAmbient()) {
      var go = function () { boot(false); };
      var schedule = function () {
        if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 3000 });
        else setTimeout(go, 1200);
      };
      if (document.readyState === 'complete') schedule();
      else window.addEventListener('load', schedule);
    }
  }
})();

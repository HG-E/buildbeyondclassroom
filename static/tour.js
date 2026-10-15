/* BBC virtual tour. Loaded only after the visitor presses "Take the virtual tour",
   together with the self-hosted Three.js (static/vendor/three.min.js).
   The scene is ported from the approved design reference (docs/design/bbc-design.html).
   Words and the eight steps come from the page's JSON data block, not from this file.
   Keyboard: arrows move between stops, Home and End jump, Escape closes the tour. */
(function () {
  'use strict';

  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function start(opts) {
    var THREE = window.THREE;
    var ui = opts.ui, studio = opts.studio;
    var STEPS = studio.steps;
    var ROLES = studio.roles;

    if (!THREE) { opts.onFail(); return null; }

    /* ---------- DOM ---------- */
    var stage = el('section', 'stage');
    stage.setAttribute('tabindex', '0');
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', ui.tourRegion);
    var canvas = el('canvas');
    canvas.id = 'gl';
    canvas.setAttribute('aria-hidden', 'true');
    var hint = el('p', 'hintbar', ui.tourHint);
    hint.setAttribute('aria-hidden', 'true');
    var closeBtn = el('button', 'btn small ghost stage-close', ui.tourClose);
    closeBtn.type = 'button';
    var overlay = el('div', 'ui');
    var inner = el('div', 'ui-in');
    var bar = el('div', 'tourbar');
    var card = el('div', 'tcard');
    card.setAttribute('aria-live', 'polite');
    card.hidden = true;
    var right = el('div', 'tright');
    var ctl = el('div', 'tctl');
    ctl.setAttribute('role', 'group');
    ctl.setAttribute('aria-label', ui.tourControls);
    var bPrev = el('button', 'rbtn', '‹');
    bPrev.type = 'button'; bPrev.setAttribute('aria-label', ui.tourPrev); bPrev.disabled = true;
    var bPlay = el('button', 'rbtn wide', ui.tourPlay);
    bPlay.type = 'button'; bPlay.setAttribute('aria-pressed', 'false');
    var bNext = el('button', 'rbtn', '›');
    bNext.type = 'button'; bNext.setAttribute('aria-label', ui.tourNext);
    var dotsEl = el('div', 'dots');
    dotsEl.setAttribute('role', 'group');
    dotsEl.setAttribute('aria-label', ui.tourStops);
    ctl.appendChild(bPrev); ctl.appendChild(bPlay); ctl.appendChild(bNext);
    right.appendChild(ctl); right.appendChild(dotsEl);
    bar.appendChild(card); bar.appendChild(right);
    inner.appendChild(bar); overlay.appendChild(inner);
    stage.appendChild(canvas); stage.appendChild(hint); stage.appendChild(closeBtn); stage.appendChild(overlay);

    /* ---------- state ---------- */
    var RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var target = 0, p = 0, auto = false, hold = 0, dead = false, raf = 0;
    var HEX = { tutor: '#35D0B5', build: '#7C9CFF', own: '#F4A55C' };

    /* ---------- renderer (fails cleanly without WebGL) ---------- */
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'low-power' });
    } catch (err) {
      opts.onFail();
      return null;
    }
    renderer.outputEncoding = THREE.sRGBEncoding;

    opts.mount.textContent = '';
    opts.mount.appendChild(stage);

    /* ---------- UI ---------- */
    var dotBtns = [];
    var di;
    for (di = 0; di <= 8; di++) {
      (function (i) {
        var b = el('button', 'dot');
        b.type = 'button';
        b.setAttribute('aria-label', i === 0 ? ui.tourStartLabel : fill(ui.tourStopLabel, { n: i, title: STEPS[i - 1].title }));
        b.appendChild(el('i'));
        b.addEventListener('click', function () { goTo(i, true); });
        dotsEl.appendChild(b);
        dotBtns.push(b);
      })(di);
    }
    function setAuto(on) {
      auto = !!on && !RM;
      bPlay.setAttribute('aria-pressed', auto ? 'true' : 'false');
      bPlay.textContent = auto ? ui.tourPause : ui.tourPlay;
      hold = 0;
    }
    function renderCard() {
      var atStart = target === 0;
      card.hidden = atStart;
      card.textContent = '';
      if (!atStart) {
        var s = STEPS[target - 1];
        var extra = s.facilitator ? s.facilitator.text : (s.partner ? studio.partner.yesLong : studio.partner.noLong);
        card.appendChild(el('p', 'mono', fill(ui.tourStopOf, { n: target, total: STEPS.length })));
        card.appendChild(el('h2', 'tt', s.title));
        card.appendChild(el('p', null, s.what));
        var row = el('p', 'row');
        row.appendChild(el('span', 'pill ' + s.ai, ROLES[s.ai].label));
        row.appendChild(el('span', null, extra));
        card.appendChild(row);
        var open = el('button', 'linkbtn', ui.tourOpenStep);
        open.type = 'button';
        open.addEventListener('click', function () {
          var base = opts.studioHref.split('#')[0];
          window.location.href = base + '#step-' + s.n;
        });
        card.appendChild(open);
      }
      bPrev.disabled = atStart;
      bNext.disabled = target === STEPS.length;
      dotBtns.forEach(function (b, i) {
        if (i === target) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        b.classList.toggle('done', i < target && i > 0);
      });
    }
    function goTo(i, user) {
      target = Math.max(0, Math.min(STEPS.length, i));
      if (user) setAuto(false);
      renderCard();
      if (RM) p = target;
    }
    bPrev.addEventListener('click', function () { goTo(target - 1, true); });
    bNext.addEventListener('click', function () { goTo(target + 1, true); });
    bPlay.addEventListener('click', function () {
      if (auto) { setAuto(false); }
      else { if (target >= STEPS.length) goTo(0, false); if (target === 0) goTo(1, false); setAuto(true); }
    });
    if (RM) bPlay.hidden = true;
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); opts.onClose(); return; }
      if (e.target !== stage) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(target + 1, true); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(target - 1, true); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(0, true); }
      else if (e.key === 'End') { e.preventDefault(); goTo(STEPS.length, true); }
    });
    closeBtn.addEventListener('click', function () { opts.onClose(); });
    goTo(1, false);
    setAuto(true);
    renderCard();
    try { stage.scrollIntoView({ block: 'start' }); stage.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }

    /* ---------- 3D scene ---------- */
    var V3 = THREE.Vector3, UP = new V3(0, 1, 0);
    var C = { tutor: 0x35D0B5, build: 0x7C9CFF, own: 0xF4A55C, mark: 0xF6C927, paper: 0xE9F0EB, deep: 0x0A1612 };
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(C.deep);
    scene.fog = new THREE.Fog(C.deep, 40, 210);
    var camera = new THREE.PerspectiveCamera(50, 1, 0.5, 600);
    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0c1a15, 0.5));
    var sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(40, 70, 30);
    scene.add(sun);
    var glow = new THREE.PointLight(C.mark, 1.7, 52);
    scene.add(glow);

    function M(color, o) {
      o = o || {};
      var m = new THREE.MeshStandardMaterial({
        color: color, roughness: 0.75, metalness: 0.05, flatShading: true,
        emissive: o.emissive || 0x000000, emissiveIntensity: o.ei || 0, side: o.side || THREE.FrontSide
      });
      m.transparent = true;
      m.opacity = o.opacity != null ? o.opacity : 1;
      m.userData.base = m.opacity;
      return m;
    }
    function FX(color, op) {
      var m = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: op != null ? op : 1, side: THREE.DoubleSide });
      m.userData.fx = true;
      return m;
    }
    function mesh(geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; }
    function edges(geo, color) {
      var l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: color, transparent: true }));
      l.material.userData.base = 1;
      return l;
    }
    function ring(r, tube, mat) { var m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 56), mat); m.rotation.x = -Math.PI / 2; return m; }
    function house(x, z, s, col, roof) {
      var g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(2 * s, 1.6 * s, 2 * s), M(col), 0, 0.8 * s, 0));
      var r = mesh(new THREE.ConeGeometry(1.7 * s, 1.2 * s, 4), M(roof || C.paper), 0, 2.2 * s, 0);
      r.rotation.y = Math.PI / 4;
      g.add(r);
      g.position.set(x, 0, z);
      return g;
    }
    function person(x, z, col) {
      var g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.3, 8), M(col), 0, 0.65, 0));
      g.add(mesh(new THREE.SphereGeometry(0.4, 10, 8), M(C.paper), 0, 1.65, 0));
      g.position.set(x, 0, z);
      return g;
    }
    function ease(x) { return x * x * (3 - 2 * x); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    /* ground, stars, dust */
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x0F2119, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    var grid = new THREE.GridHelper(600, 150, 0x2a5a4a, 0x173128);
    grid.position.y = 0.03;
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    scene.add(grid);
    (function () {
      var n = 500, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * 6.283, r = 140 + Math.random() * 160;
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 45 + Math.random() * 150; pos[i * 3 + 2] = Math.sin(a) * r - 40;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe3ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })));
    })();
    var dust;
    (function () {
      var n = 260, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 140; pos[i * 3 + 1] = 0.5 + Math.random() * 22; pos[i * 3 + 2] = 60 - Math.random() * 220;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      dust = new THREE.Points(g, new THREE.PointsMaterial({ color: C.mark, size: 0.4, transparent: true, opacity: 0.55 }));
      scene.add(dust);
    })();

    /* path through the community */
    var P = [[-30, 0, 60], [-18, 0, 42], [-26, 0, 20], [-6, 0, 2], [14, 0, -14], [2, 0, -38], [26, 0, -56], [40, 0, -82], [22, 0, -104], [-4, 0, -124], [-24, 0, -146]]
      .map(function (v) { return new V3(v[0], v[1], v[2]); });
    var path = new THREE.CatmullRomCurve3(P);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 400, 0.28, 6, false), new THREE.MeshBasicMaterial({ color: C.mark })));
    var trav = [];
    for (var ti = 0; ti < 3; ti++) {
      var tm = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      scene.add(tm);
      trav.push(tm);
    }

    /* quiet background community */
    var samples = path.getSpacedPoints(200);
    var seed = 7;
    function R() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var fmats = [0x1d3d33, 0x244a3e, 0x2b3f4a, 0x30403a].map(function (c) { return new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 1 }); });
    var bgeo = new THREE.BoxGeometry(2, 1.6, 2), rgeo = new THREE.ConeGeometry(1.7, 1.2, 4);
    (function () {
      var placed = 0, tries = 0;
      while (placed < 70 && tries < 1500) {
        tries++;
        var x = (R() - 0.5) * 210, z = 70 - R() * 240, ok = true;
        for (var k = 0; k < samples.length; k += 2) {
          var dx = samples[k].x - x, dz = samples[k].z - z;
          if (dx * dx + dz * dz < 24 * 24) { ok = false; break; }
        }
        if (!ok) continue;
        var mm = fmats[Math.floor(R() * fmats.length)], g = new THREE.Group(), b = new THREE.Mesh(bgeo, mm), rf = new THREE.Mesh(rgeo, mm);
        b.position.y = 0.8; rf.position.y = 2.2; rf.rotation.y = Math.PI / 4;
        g.add(b); g.add(rf);
        g.scale.setScalar(1 + R() * 1.6);
        g.position.set(x, 0, z);
        g.rotation.y = R() * 3;
        scene.add(g);
        placed++;
      }
    })();

    /* the hub and eight stations */
    function hubObj() {
      var g = new THREE.Group(), fm = M(C.paper), s = 12, t = 1;
      g.add(mesh(new THREE.BoxGeometry(s, t, t), fm, 0, t / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(s, t, t), fm, 0, s - t / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(t, s, t), fm, -(s / 2 - t / 2), s / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(t, s, t), fm, s / 2 - t / 2, s / 2, 0));
      var cube = mesh(new THREE.BoxGeometry(6, 6, 6), M(C.build, { emissive: C.build, ei: 0.35 }), 8, 13, 0);
      g.add(cube);
      g.add(house(-13, -3, 1.2, C.tutor)); g.add(house(15, -5, 1.1, C.own)); g.add(house(-10, -12, 1, C.build));
      g.userData.tick = function (t2) { cube.rotation.y = t2 * 0.5; cube.rotation.x = t2 * 0.3; cube.position.y = 13 + Math.sin(t2 * 1.1) * 0.7; };
      return g;
    }
    function s1(col) {
      var g = new THREE.Group();
      [[-6, -3], [-3, -6], [4, -5], [6, 1], [-6, 3]].forEach(function (q, i) { g.add(house(q[0], q[1], 1 + (i % 2) * 0.3, i % 2 ? C.build : C.tutor)); });
      [[0, 0], [1.6, 1.2], [-1.6, 1.4]].forEach(function (q) { g.add(person(q[0], q[1], col)); });
      var rs = [];
      for (var i = 0; i < 3; i++) { var r = ring(2, 0.09, FX(col, 0.9)); r.position.y = 0.15; g.add(r); rs.push(r); }
      g.userData.tick = function (t2) { rs.forEach(function (r, i2) { var k = (t2 * 0.45 + i2 / 3) % 1; r.scale.setScalar(0.5 + k * 3.2); r.material.opacity = (1 - k) * 0.85 * (g.userData.r || 0); }); };
      return g;
    }
    function s2(col) {
      var g = new THREE.Group();
      [3, 5, 2.5, 6, 4].forEach(function (hh, i) { g.add(mesh(new THREE.BoxGeometry(1.4, hh, 1.4), M(i === 3 ? C.mark : C.paper), (i - 2) * 2.2, hh / 2, 0)); });
      var lens = new THREE.Group();
      lens.add(new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.24, 10, 32), M(col)));
      var hd = mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.2, 8), M(col), 1.3, -1.9, 0);
      hd.rotation.z = Math.PI / 4;
      lens.add(hd);
      lens.position.set(0, 8.5, 2);
      g.add(lens);
      var gm = M(C.own);
      g.add(mesh(new THREE.BoxGeometry(0.45, 5, 0.45), gm, -3.4, 2.5, 5.5));
      g.add(mesh(new THREE.BoxGeometry(0.45, 5, 0.45), gm, 3.4, 2.5, 5.5));
      g.add(mesh(new THREE.BoxGeometry(7.3, 0.5, 0.5), gm, 0, 5.1, 5.5));
      g.userData.tick = function (t2) { lens.position.x = Math.sin(t2 * 0.8) * 5; lens.position.y = 8.5 + Math.sin(t2 * 1.6) * 0.4; lens.rotation.y = Math.sin(t2 * 0.8) * 0.5; };
      return g;
    }
    function s3() {
      var g = new THREE.Group();
      var core = mesh(new THREE.SphereGeometry(1.6, 16, 12), M(C.mark, { emissive: C.mark, ei: 0.6 }), 0, 5, 0);
      g.add(core);
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.6, 8), M(C.paper), 0, 1.8, 0));
      var cs = [C.tutor, C.build, C.own, C.paper, C.mark, C.tutor, C.build], orb = [];
      for (var i = 0; i < 7; i++) { var m = mesh(new THREE.IcosahedronGeometry(0.7 + (i % 3) * 0.15, 0), M(cs[i]), 0, 5, 0); g.add(m); orb.push(m); }
      g.userData.tick = function (t2) {
        orb.forEach(function (m2, i2) {
          var a = t2 * 0.7 + i2 * (Math.PI * 2 / 7), r = 3.8 + (i2 % 3) * 0.8;
          m2.position.set(Math.cos(a) * r, 5 + Math.sin(t2 * 1.2 + i2) * 1.4, Math.sin(a) * r);
          m2.rotation.x = t2 + i2; m2.rotation.y = t2 * 0.8;
        });
        core.scale.setScalar(1 + Math.sin(t2 * 3) * 0.06);
      };
      return g;
    }
    function s4(col) {
      var g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(13, 0.2, 10), M(0x13342b), 0, 0.1, 0));
      var wf = edges(new THREE.BoxGeometry(6, 4, 5), col);
      wf.position.y = 2.2;
      g.add(wf);
      var rf = edges(new THREE.ConeGeometry(4.6, 2.6, 4), col);
      rf.rotation.y = Math.PI / 4; rf.position.y = 5.5;
      g.add(rf);
      var bp = mesh(new THREE.PlaneGeometry(5.5, 3.6), M(C.build, { opacity: 0.35, side: THREE.DoubleSide }), -6, 5, -1);
      bp.rotation.y = 0.6;
      g.add(bp);
      g.add(mesh(new THREE.BoxGeometry(7, 0.12, 0.5), M(C.mark), 0, 0.3, 4.2));
      g.add(person(6, 3, C.tutor));
      g.userData.tick = function (t2) { wf.scale.set(1 + Math.sin(t2) * 0.03, 1, 1); rf.position.y = 5.5 + Math.sin(t2 * 1.2) * 0.15; bp.position.y = 5 + Math.sin(t2 * 0.9) * 0.3; };
      return g;
    }
    function s5(col) {
      var g = new THREE.Group(), bl = [];
      for (var i = 0; i < 12; i++) {
        var x = (i % 3 - 1) * 2.1, z = (Math.floor(i / 3) % 2 - 0.5) * 2.1, y = Math.floor(i / 6) * 1.9 + 0.95;
        var b = mesh(new THREE.BoxGeometry(2, 1.8, 2), M(i % 4 === 0 ? C.mark : (i % 2 ? C.build : C.paper)), x, y, z);
        b.userData.y = y;
        g.add(b);
        bl.push(b);
      }
      g.add(mesh(new THREE.BoxGeometry(0.6, 12, 0.6), M(col), 6.5, 6, 0));
      var jib = mesh(new THREE.BoxGeometry(9, 0.5, 0.5), M(col), 2.5, 12, 0);
      g.add(jib);
      var hook = mesh(new THREE.BoxGeometry(0.2, 5, 0.2), M(C.paper), -1.5, 9.5, 0);
      g.add(hook);
      g.userData.tick = function (t2) {
        var k = ((t2 * 0.16) % 1) * 16;
        bl.forEach(function (b2, i2) { var l = ease(clamp(k - i2, 0, 1)); b2.position.y = b2.userData.y + (1 - l) * 8; b2.scale.setScalar(0.2 + 0.8 * l); });
        jib.rotation.y = Math.sin(t2 * 0.4) * 0.15;
        hook.position.x = -1.5 + Math.sin(t2 * 0.8) * 0.8;
      };
      return g;
    }
    function s6(col) {
      var g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.6, 1.4, 10, 8), M(C.paper), 0, 5, 0));
      g.add(mesh(new THREE.SphereGeometry(1, 12, 10), M(col, { emissive: col, ei: 0.8 }), 0, 10.7, 0));
      var rs = [];
      for (var i = 0; i < 3; i++) { var r = ring(1, 0.12, FX(col, 0.8)); r.position.y = 10.7; g.add(r); rs.push(r); }
      var sh = mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.3, 6), M(C.tutor), 6, 5, 0);
      sh.rotation.x = Math.PI / 2;
      g.add(sh);
      [[-5, 4], [5, 5], [-6, -3], [3, -6]].forEach(function (q) { g.add(person(q[0], q[1], C.build)); });
      g.userData.tick = function (t2) {
        rs.forEach(function (r2, i2) { var k = (t2 * 0.4 + i2 / 3) % 1; r2.scale.setScalar(1 + k * 7); r2.material.opacity = (1 - k) * 0.8 * (g.userData.r || 0); });
        sh.position.y = 5 + Math.sin(t2 * 1.3) * 0.4; sh.rotation.y = t2 * 0.6;
      };
      return g;
    }
    function s7(col) {
      var g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(6.5, 7, 0.8, 28), M(0x1a3a30), 0, 0.4, 0));
      var cv = document.createElement('canvas');
      cv.width = 320; cv.height = 200;
      var cx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
      var sm = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      sm.userData.base = 1;
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6), sm);
      scr.position.set(0, 6.4, -3.5);
      g.add(scr);
      g.add(mesh(new THREE.BoxGeometry(9.4, 0.3, 0.3), M(col), 0, 3.5, -3.5));
      g.add(mesh(new THREE.BoxGeometry(1.6, 2.4, 1.4), M(col), -4.6, 2, 1.5));
      for (var i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 1, 1.6), M(C.paper), (i - 2) * 2.5, 0.5, 9.5 + Math.abs(i - 2) * 0.8));
      var fr = 0;
      g.userData.tick = function (t2) {
        fr++;
        if (fr % 3) return;
        cx.fillStyle = '#0F2A22'; cx.fillRect(0, 0, 320, 200);
        for (var j = 0; j < 5; j++) {
          var hh = 20 + (Math.sin(t2 * 0.9 + j * 0.8) * 0.5 + 0.5) * 70 + j * 14;
          cx.fillStyle = j === 4 ? '#F6C927' : '#7C9CFF';
          cx.fillRect(24 + j * 58, 180 - hh, 40, hh);
        }
        tex.needsUpdate = true;
      };
      return g;
    }
    function s8(col) {
      var g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.6, 0.9, 5, 8), M(0x8A5A2B), 0, 2.5, 0));
      var lv = [];
      [[0, 6.4, 0, 3], [1.8, 8.2, 0.6, 2.3], [-1.6, 8.6, -0.4, 2.1]].forEach(function (a) {
        var l = mesh(new THREE.IcosahedronGeometry(a[3], 1), M(0x3FBF7F), a[0], a[1], a[2]);
        g.add(l); lv.push(l);
      });
      var coins = [];
      for (var i = 0; i < 6; i++) { var c = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 16), M(C.mark, { emissive: C.mark, ei: 0.25 }), 6.5, 0.2 + i * 0.34, 2); g.add(c); coins.push(c); }
      var loop = new THREE.Mesh(new THREE.TorusGeometry(6, 0.16, 8, 64), M(col, { emissive: col, ei: 0.5 }));
      loop.position.y = 5;
      g.add(loop);
      g.userData.tick = function (t2) {
        lv.forEach(function (l, i2) { l.scale.setScalar(1 + Math.sin(t2 * 1.3 + i2 * 1.7) * 0.05); });
        loop.rotation.y = t2 * 0.5; loop.rotation.x = 1.2 + Math.sin(t2 * 0.4) * 0.1;
        coins.forEach(function (c2, i2) { c2.position.y = 0.2 + i2 * 0.34 + Math.max(0, Math.sin(t2 * 2 - i2 * 0.5)) * 0.12; });
      };
      return g;
    }

    function rr(ctx, x, y, w, hh, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
      ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function makeLabel(num, text, hex) {
      var cv = document.createElement('canvas');
      cv.width = 720; cv.height = 150;
      var ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
      function draw() {
        ctx.clearRect(0, 0, 720, 150);
        ctx.fillStyle = 'rgba(10,22,18,.9)'; rr(ctx, 4, 4, 712, 142, 34); ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = hex; ctx.stroke();
        ctx.fillStyle = hex; ctx.beginPath(); ctx.arc(75, 75, 42, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#0A1612'; ctx.font = "700 46px 'IBM Plex Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(num, 75, 79);
        ctx.fillStyle = '#E9F0EB'; ctx.font = "800 50px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.textAlign = 'left'; ctx.fillText(text, 140, 79);
        tex.needsUpdate = true;
      }
      draw();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!dead) draw(); });
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
      sp.scale.set(12, 2.5, 1);
      sp.renderOrder = 10;
      return sp;
    }

    var BUILD = [s1, s2, s3, s4, s5, s6, s7, s8], stations = [], camPts = [], lookPts = [], clickables = [];

    /* hub (stop 0) */
    var u0 = 0.012, S0 = path.getPointAt(u0), T0 = path.getTangentAt(u0);
    T0.y = 0; T0.normalize();
    var N0 = new V3(T0.z, 0, -T0.x);
    var hub = hubObj();
    hub.position.copy(S0);
    hub.rotation.y = Math.atan2(T0.x, T0.z);
    hub.userData.idx = 0;
    scene.add(hub);
    clickables.push(hub);
    camPts.push(S0.clone().addScaledVector(T0, -36).addScaledVector(N0, 22).setY(15));
    lookPts.push(S0.clone().addScaledVector(N0, 12).setY(6));

    STEPS.forEach(function (st, i) {
      var u = 0.13 + i * 0.108, S = path.getPointAt(u), T = path.getTangentAt(u);
      T.y = 0; T.normalize();
      var N = new V3(T.z, 0, -T.x), side = (i % 2) ? 1 : -1, col = C[st.ai];
      var O = S.clone().addScaledVector(N, side * 11);
      var Cm = S.clone().addScaledVector(T, -25).addScaledVector(N, -side * 3.5);
      Cm.y = 11.5;
      var L = O.clone();
      L.y = 2.6;
      var g = BUILD[i](col);
      g.position.copy(O);
      var d = Cm.clone().sub(O);
      g.rotation.y = Math.atan2(d.x, d.z);
      g.userData.idx = i + 1;
      scene.add(g);
      var mats = [];
      g.traverse(function (o) { var m = o.material; if (m && !m.userData.fx && mats.indexOf(m) < 0) mats.push(m); });
      var lab = makeLabel(String(st.n), st.title, HEX[st.ai]);
      lab.position.copy(O).add(new V3(0, 11, 0));
      scene.add(lab);
      lab.userData.idx = i + 1;
      stations.push({ g: g, mats: mats, lab: lab, r: -1, O: O, col: HEX[st.ai] });
      clickables.push(g, lab);
      camPts.push(Cm);
      lookPts.push(L);
    });
    var camCurve = new THREE.CatmullRomCurve3(camPts), lookCurve = new THREE.CatmullRomCurve3(lookPts);

    /* ---------- interaction ---------- */
    var yaw = 0, pitch = 0, dragging = false, lx = 0, ly = 0, moved = 0, t0 = 0, px = 0, py = 0;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; t0 = performance.now();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* not supported */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      var rc = canvas.getBoundingClientRect();
      px = ((e.clientX - rc.left) / rc.width - 0.5) * 2;
      py = ((e.clientY - rc.top) / rc.height - 0.5) * 2;
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      yaw = clamp(yaw - dx * 0.006, -0.9, 0.9);
      pitch = clamp(pitch + dy * 0.004, -0.35, 0.5);
      if (moved > 6) setAuto(false);
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (e.type === 'pointerup' && moved < 6 && performance.now() - t0 < 500) pick(e);
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(e) {
      var rc = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObjects(clickables, true)[0];
      if (!hit) return;
      var o = hit.object;
      while (o && o.userData.idx === undefined) o = o.parent;
      if (o) goTo(o.userData.idx, true);
    }

    /* ---------- loop ---------- */
    var clock = new THREE.Clock(), visible = true, lw = 0, lh = 0, io = null, ro = null;
    if (window.IntersectionObserver) { io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }); io.observe(stage); }
    function resize() {
      var w = stage.clientWidth, hh = stage.clientHeight;
      if (!w || !hh || (w === lw && hh === lh)) return;
      lw = w; lh = hh;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh;
      camera.fov = w / hh < 0.85 ? 66 : 50;
      camera.updateProjectionMatrix();
    }
    var cp = new V3(), lp = new V3(), off = new V3(), gc = new THREE.Color(C.mark), tc = new THREE.Color(), gp = new V3();
    var total = STEPS.length;
    function frame() {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || !stage.clientWidth) return;
      resize();
      var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      if (auto && Math.abs(p - target) < 0.06) {
        hold += dt;
        if (hold > 6.5) { hold = 0; if (target < total) goTo(target + 1, false); else setAuto(false); }
      }
      p += (target - p) * (RM ? 1 : 1 - Math.exp(-dt * 2.3));
      if (Math.abs(target - p) < 0.002) p = target;
      var tt = clamp(p / total, 0, 1);
      camCurve.getPoint(tt, cp);
      lookCurve.getPoint(tt, lp);
      var sway = RM ? 0 : 1;
      cp.x += Math.sin(t * 0.33) * 0.9 * sway;
      cp.y += Math.sin(t * 0.41) * 0.35 * sway;
      if (!dragging) { yaw *= Math.exp(-dt * 1.2); pitch *= Math.exp(-dt * 1.2); }
      off.copy(cp).sub(lp);
      var len = off.length();
      off.applyAxisAngle(UP, yaw + (RM ? 0 : px * 0.05));
      off.y += (pitch + (RM ? 0 : py * 0.03)) * len * 0.55;
      camera.position.copy(lp).add(off);
      camera.lookAt(lp);
      stations.forEach(function (s, i) {
        var k = i + 1, rt = clamp((p - (k - 1.6)) / 1.1, 0, 1), r = ease(rt);
        s.r += (r - s.r) * (RM || s.r < 0 ? 1 : 1 - Math.exp(-dt * 5));
        if (s.last === undefined || Math.abs(s.r - s.last) > 0.002) {
          s.last = s.r;
          var f = 0.14 + 0.86 * s.r;
          s.mats.forEach(function (m) { m.opacity = m.userData.base * f; });
          s.lab.material.opacity = 0.4 + 0.6 * s.r;
          s.g.scale.y = 0.86 + 0.14 * s.r;
        }
        s.g.userData.r = s.r;
        if (s.g.userData.tick) s.g.userData.tick(t);
      });
      hub.userData.tick(t);
      trav.forEach(function (m, i) { path.getPointAt(((t * 0.035) + i / 3) % 1, gp); m.position.set(gp.x, gp.y + 0.9, gp.z); });
      if (target > 0) { var st = stations[target - 1]; glow.position.set(st.O.x, 10, st.O.z); tc.set(st.col); }
      else { glow.position.set(S0.x, 12, S0.z); tc.set(C.mark); }
      gc.lerp(tc, 0.06);
      glow.color.copy(gc);
      dust.rotation.y = Math.sin(t * 0.05) * 0.03;
      renderer.render(scene, camera);
    }
    resize();
    frame();
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(stage); }

    return {
      destroy: function () {
        dead = true;
        cancelAnimationFrame(raf);
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        try { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) { /* ignore */ }
      }
    };
  }

  window.BBCTour = { start: start };
})();

/* ===========================================================================
   m1-kripke.js — Possible-worlds semantics
   Build a frame on a canvas; evaluate modal/epistemic formulas world-by-world;
   read off frame properties; switch among K / T / S4 / S5 / epistemic.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  var SYSTEMS = {
    K:  { name: 'K',  axioms: ['K'],                req: [] },
    T:  { name: 'T',  axioms: ['K', 'T'],            req: ['reflexive'] },
    S4: { name: 'S4', axioms: ['K', 'T', '4'],       req: ['reflexive', 'transitive'] },
    S5: { name: 'S5', axioms: ['K', 'T', 'B', '4', '5'], req: ['reflexive', 'symmetric', 'transitive'] },
    Ep: { name: 'S5 (epistemic)', axioms: ['K', 'T', '4', '5'], req: ['equivalence'] }
  };
  var AX = {
    K:  { f: '□(p→q)→(□p→□q)', d: 'distribution (holds in every Kripke frame)' },
    T:  { f: '□p→p',           d: 'reflexivity — what is necessary is true' },
    '4':{ f: '□p→□□p',         d: 'transitivity — positive introspection' },
    B:  { f: 'p→□◇p',          d: 'symmetry — the Brouwer axiom' },
    '5':{ f: '◇p→□◇p',         d: 'euclidean — negative introspection' }
  };

  function mod() {
    var worlds = [], edges = [], nextId = 0, sel = null, sys = 'S5';
    var tool = 'world', relSrc = null, dragging = null, dox = 0, doy = 0, mx = 0, my = 0;
    var R = 28;
    var canvas, ctx, tip, refs = {};

    function preset(name) {
      worlds = []; edges = []; nextId = 0; sel = null; relSrc = null;
      function w(x, y, v) { worlds.push({ id: nextId, x: x, y: y, label: 'w' + LV.sub(nextId + 1), val: v }); nextId++; }
      function e(a, b) { edges.push({ from: a, to: b, agent: 1 }); }
      if (name === 's5') {
        w(150, 150, { p: 1, q: 0 }); w(360, 110, { p: 0, q: 1 }); w(330, 270, { p: 1, q: 1 });
        [0, 1, 2].forEach(function (i) { e(i, i); });
        e(0, 1); e(1, 0); e(1, 2); e(2, 1); e(0, 2); e(2, 0); sys = 'S5';
      } else if (name === 's4') {
        w(90, 180, { p: 1, q: 0 }); w(240, 180, { p: 1, q: 1 }); w(390, 180, { p: 0, q: 1 }); w(540, 180, { p: 0, q: 0 });
        [0, 1, 2, 3].forEach(function (i) { e(i, i); });
        e(0, 1); e(1, 2); e(2, 3); e(0, 2); e(0, 3); e(1, 3); sys = 'S4';
      } else if (name === 'failT') {
        w(160, 160, { p: 1 }); w(380, 160, { p: 0 });
        e(0, 1); sys = 'K'; // no reflexive loops: T should fail
      }
      sys && setSys(sys);
      refresh();
    }

    /* ---- geometry / hit-testing ---- */
    function worldAt(x, y) {
      for (var i = worlds.length - 1; i >= 0; i--)
        if (Math.hypot(worlds[i].x - x, worlds[i].y - y) < R) return worlds[i];
      return null;
    }

    /* ---- evaluation ---- */
    function interp() {
      return {
        atom: function (n, w) { var ww = worlds.find(function (x) { return x.id === w; }); return ww && ww.val[n]; },
        box: function (child, w) { var s = LV.rel.succ(edges, w); return s.every(child); },
        dia: function (child, w) { var s = LV.rel.succ(edges, w); return s.some(child); },
        K: function (ag, child, w) { var s = LV.rel.succ(edges, w); return s.every(child); }
      };
    }
    function evalAt(ast, w) { return LV.evalAST(ast, w, interp()); }

    function evaluate() {
      var raw = refs.formula.value.trim();
      LV.clear(refs.evalOut);
      if (!raw || !worlds.length) { renderTruth(null); return; }
      var ast;
      try { ast = LV.parse(raw); }
      catch (err) { refs.evalOut.appendChild(el('span.badge.b-no', { text: '⚠ ' + err.message })); renderTruth(null); return; }
      var rows = worlds.map(function (w) { return { w: w, v: evalAt(ast, w.id) }; });
      var all = rows.every(function (r) { return r.v; });
      var none = rows.every(function (r) { return !r.v; });
      refs.evalOut.appendChild(
        el('span', { 'class': 'badge ' + (all ? 'b-ok' : none ? 'b-no' : 'b-info') },
          all ? '✓ valid in this model' : none ? '✗ false at every world' : '~ true at some worlds')
      );
      refs.evalOut.appendChild(el('span.mono', { style: { marginLeft: '10px', fontSize: '12px', color: 'var(--muted)' }, text: LV.show(ast) }));
      renderTruth(rows);
      draw();
    }

    function renderTruth(rows) {
      var pane = refs.truth; LV.clear(pane);
      if (!rows) { pane.appendChild(el('p.muted', { style: { fontSize: '12px' }, text: 'evaluate a formula to see truth at each world' })); return; }
      var t = el('table.tbl');
      t.appendChild(el('tr', null, el('th', { text: 'world' }), el('th', { text: 'valuation' }), el('th', { text: 'φ' })));
      rows.forEach(function (r) {
        var props = Object.keys(r.w.val).filter(function (k) { return r.w.val[k]; }).join(',') || '∅';
        t.appendChild(el('tr', null,
          el('td', { text: r.w.label }),
          el('td', { text: '{' + props + '}' }),
          el('td', { 'class': r.v ? 'tag-ok' : 'tag-no', text: r.v ? 'T' : 'F' })));
      });
      pane.appendChild(t);
    }

    /* ---- axioms / frame properties ---- */
    function checkAxiom(a) {
      var ids = worlds.map(function (w) { return w.id; });
      if (a === 'K') return true; // valid in all frames
      if (a === 'T') return LV.rel.isReflexive(ids, edges);
      if (a === '4') return LV.rel.isTransitive(ids, edges);
      if (a === 'B') return LV.rel.isSymmetric(ids, edges);
      if (a === '5') return LV.rel.isEuclidean(ids, edges);
      return true;
    }
    function renderAxioms() {
      var s = SYSTEMS[sys]; refs.sysName.textContent = s.name;
      LV.clear(refs.axioms);
      s.axioms.forEach(function (a) {
        var ok = checkAxiom(a);
        refs.axioms.appendChild(
          el('div.axiom', null,
            el('span.name', { text: a }),
            el('span.f', { text: AX[a].f }),
            el('span', { 'class': 'st ' + (ok ? 'tag-ok' : 'tag-no'), text: ok ? '✓' : '✗' })));
      });
      // observed frame properties
      var ids = worlds.map(function (w) { return w.id; });
      var props = [];
      if (LV.rel.isReflexive(ids, edges)) props.push('reflexive');
      if (LV.rel.isSymmetric(ids, edges)) props.push('symmetric');
      if (LV.rel.isTransitive(ids, edges)) props.push('transitive');
      if (LV.rel.isEuclidean(ids, edges)) props.push('euclidean');
      if (LV.rel.isSerial(ids, edges)) props.push('serial');
      refs.frameProps.textContent = props.length ? 'Observed frame: ' + props.join(', ') : 'No special frame properties hold.';
    }

    function setSys(s) {
      sys = s;
      Array.prototype.forEach.call(refs.sysTabs.children, function (b) { b.classList.toggle('active', b.dataset.sys === s); });
      renderAxioms(); evaluate();
    }

    /* ---- canvas drawing ---- */
    function resize() {
      var w = canvas.parentElement.clientWidth;
      canvas.width = w; canvas.height = 420; draw();
    }
    function arrow(x, y, bx, by, color) {
      var dx = x - bx, dy = y - by, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, px = -uy, py = ux;
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - ux * 9 + px * 4, y - uy * 9 + py * 4);
      ctx.lineTo(x - ux * 9 - px * 4, y - uy * 9 - py * 4); ctx.closePath(); ctx.fill();
    }
    function draw() {
      if (!ctx) return;
      var C = LV.theme();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = C.rule; ctx.lineWidth = .5; ctx.globalAlpha = .4;
      for (var x = 0; x < canvas.width; x += 38) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (var y = 0; y < canvas.height; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      edges.forEach(function (e) { drawEdge(e, C); });
      if (tool === 'relation' && relSrc != null) {
        var s = worlds.find(function (w) { return w.id === relSrc; });
        if (s) { ctx.strokeStyle = C.accent; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]); }
      }
      worlds.forEach(function (w) { drawWorld(w, C); });
    }
    function drawEdge(e, C) {
      var a = worlds.find(function (w) { return w.id === e.from; }), b = worlds.find(function (w) { return w.id === e.to; });
      if (!a || !b) return;
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.4; ctx.setLineDash([]);
      if (e.from === e.to) {
        var lx = a.x + R * 1.15, ly = a.y - R * 1.15;
        ctx.beginPath(); ctx.arc(lx, ly, 15, 0, Math.PI * 2); ctx.stroke();
        arrow(lx + 10, ly + 11, lx + 3, ly + 14, C.accent); return;
      }
      var rev = edges.some(function (x) { return x.from === e.to && x.to === e.from; });
      var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
      var sx = a.x + ux * R, sy = a.y + uy * R, ex = b.x - ux * R, ey = b.y - uy * R;
      if (rev) {
        sx += nx * 9; sy += ny * 9; ex += nx * 9; ey += ny * 9;
        var mx2 = (sx + ex) / 2 + nx * 16, my2 = (sy + ey) / 2 + ny * 16;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx2, my2, ex, ey); ctx.stroke();
        arrow(ex, ey, ex - ux * 8 + nx * 3, ey - uy * 8 + ny * 3, C.accent);
      } else {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        arrow(ex, ey, ex - ux * 10, ey - uy * 10, C.accent);
      }
    }
    function drawWorld(w, C) {
      var isSel = w.id === sel, isSrc = w.id === relSrc;
      ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? C.warm : C.paper; ctx.fill();
      ctx.strokeStyle = isSrc ? C.accent2 : isSel ? C.accent : C.gold;
      ctx.lineWidth = isSel || isSrc ? 2.5 : 1.5; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = 'bold 14px Playfair Display, serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.label, w.x, w.y);
      var tp = Object.keys(w.val).filter(function (k) { return w.val[k]; });
      if (tp.length) { ctx.font = '10px JetBrains Mono, monospace'; ctx.fillStyle = C.accent3; ctx.fillText(tp.join(','), w.x, w.y + R + 11); }
    }

    /* ---- world property editor ---- */
    function renderProps() {
      var pane = refs.props; LV.clear(pane);
      var w = worlds.find(function (x) { return x.id === sel; });
      if (!w) { pane.appendChild(el('p.muted', { style: { fontSize: '12px' }, text: 'click a world to edit its valuation' })); return; }
      pane.appendChild(el('div.mono', { style: { fontSize: '12px', color: 'var(--accent)', marginBottom: '8px' }, text: 'World ' + w.label }));
      ['p', 'q', 'r'].forEach(function (p) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!w.val[p];
        cb.addEventListener('change', function () { w.val[p] = cb.checked ? 1 : 0; evaluate(); draw(); });
        pane.appendChild(el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--mono)', fontSize: '13px', marginBottom: '5px' } },
          cb, el('span', { text: p }), el('span.muted', { text: w.val[p] ? 'T' : 'F' })));
      });
    }

    function setTool(t) {
      tool = t; relSrc = null;
      Array.prototype.forEach.call(refs.tools.children, function (b) { b.classList.toggle('active', b.dataset.tool === t); });
      draw();
    }

    function refresh() { renderProps(); renderAxioms(); evaluate(); draw(); }

    /* ---- build DOM ---- */
    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module I · relational semantics' }),
        el('h2', { text: 'Kripke models, modal & epistemic logic' }),
        el('p', { text: 'A model is a set of possible worlds, an accessibility relation, and a valuation. □φ holds at w iff φ holds at every accessible world; ◇φ iff at some. Reading the relation as an agent\u2019s indistinguishability gives epistemic logic, where □ becomes "the agent knows".' })));

      var body = el('div.module-body');
      stage.appendChild(body);

      // toolbar
      var tools = el('div.btn-row', { style: { marginBottom: '14px' } });
      [['world', '+ world'], ['relation', '↗ relation'], ['move', '✥ move'], ['delete', '⌫ delete']].forEach(function (t) {
        var b = el('button.btn', { text: t[1] }); b.dataset.tool = t[0];
        b.addEventListener('click', function () { setTool(t[0]); }); tools.appendChild(b);
      });
      tools.appendChild(el('span', { style: { width: '14px' } }));
      [['s5', 'preset: S5'], ['s4', 'preset: S4 chain'], ['failT', 'preset: T fails']].forEach(function (p) {
        var b = el('button.btn', { text: p[1] }); b.addEventListener('click', function () { preset(p[0]); }); tools.appendChild(b);
      });
      refs.tools = tools;
      body.appendChild(tools);

      var split = el('div.split');
      body.appendChild(split);

      // canvas
      var cwrap = el('div.canvas-card');
      canvas = el('canvas'); cwrap.appendChild(canvas);
      tip = el('div.tooltip'); cwrap.appendChild(tip);
      split.appendChild(cwrap);
      ctx = canvas.getContext('2d');

      // right column
      var col = el('div.grid', { style: { gridTemplateColumns: '1fr' } });
      split.appendChild(col);

      // formula card
      var fcard = el('div.card');
      fcard.appendChild(el('h4', { text: 'formula' }));
      refs.formula = el('input', { type: 'text', value: '□p → p', style: { width: '100%' } });
      var frow = el('div.btn-row');
      frow.appendChild(refs.formula);
      var evalBtn = el('button.btn.primary', { text: 'eval' }); evalBtn.addEventListener('click', evaluate);
      frow.appendChild(evalBtn);
      fcard.appendChild(frow);
      var sr = el('div.symrow');
      '□ ◇ ¬ ∧ ∨ → ↔ ⊤ ⊥'.split(' ').forEach(function (s) {
        var b = el('button.sym', { text: s }); b.addEventListener('click', function () { insert(s); }); sr.appendChild(b);
      });
      fcard.appendChild(sr);
      refs.evalOut = el('div', { style: { marginTop: '10px' } }); fcard.appendChild(refs.evalOut);
      col.appendChild(fcard);

      // system card
      var scard = el('div.card');
      scard.appendChild(el('h4', { text: 'logical system' }));
      var tabs = el('div.btn-row', { style: { marginBottom: '10px' } });
      Object.keys(SYSTEMS).forEach(function (k) {
        var b = el('button.btn', { text: SYSTEMS[k].name === 'S5 (epistemic)' ? 'Sₑₚ' : SYSTEMS[k].name });
        b.dataset.sys = k; b.addEventListener('click', function () { setSys(k); }); tabs.appendChild(b);
      });
      refs.sysTabs = tabs; scard.appendChild(tabs);
      scard.appendChild(el('div.mono', { style: { fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' } },
        el('span', { text: 'axioms of ' }), refs.sysName = el('span', { style: { color: 'var(--accent)' }, text: 'S5' })));
      refs.axioms = el('div'); scard.appendChild(refs.axioms);
      refs.frameProps = el('div.mono', { style: { fontSize: '11px', color: 'var(--muted)', marginTop: '8px' } }); scard.appendChild(refs.frameProps);
      col.appendChild(scard);

      // world props
      var pcard = el('div.card'); pcard.appendChild(el('h4', { text: 'selected world' }));
      refs.props = el('div'); pcard.appendChild(refs.props); col.appendChild(pcard);

      // truth table
      var tcard = el('div.card'); tcard.appendChild(el('h4', { text: 'truth at worlds' }));
      refs.truth = el('div'); tcard.appendChild(refs.truth); col.appendChild(tcard);

      // canvas listeners
      canvas.addEventListener('mousedown', onDown);
      canvas.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', function () { dragging = null; });
      canvas.addEventListener('mouseleave', function () { tip.style.opacity = 0; });

      var ro = function () { resize(); }; window.addEventListener('resize', ro);
      setTimeout(function () { resize(); preset('s5'); }, 30);
    }

    function insert(s) {
      var i = refs.formula.value.length; refs.formula.value += s; refs.formula.focus();
    }
    function onDown(ev) {
      var r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, hit = worldAt(x, y);
      if (tool === 'world') {
        if (!hit) { worlds.push({ id: nextId, x: x, y: y, label: 'w' + LV.sub(nextId + 1), val: {} }); sel = nextId; nextId++; }
        else sel = hit.id;
        renderProps(); draw();
      } else if (tool === 'relation') {
        if (!hit) return;
        if (relSrc == null) relSrc = hit.id;
        else { if (!LV.rel.has(edges, relSrc, hit.id)) edges.push({ from: relSrc, to: hit.id, agent: 1 }); relSrc = null; refresh(); }
      } else if (tool === 'move') { if (hit) { dragging = hit.id; dox = x - hit.x; doy = y - hit.y; } }
      else if (tool === 'delete') {
        if (hit) { worlds = worlds.filter(function (w) { return w.id !== hit.id; }); edges = edges.filter(function (e) { return e.from !== hit.id && e.to !== hit.id; }); if (sel === hit.id) { sel = null; renderProps(); } }
        else { var nr = nearestEdge(x, y); if (nr) edges = edges.filter(function (e) { return e !== nr; }); }
        refresh();
      }
    }
    function onMove(ev) {
      var r = canvas.getBoundingClientRect(); mx = ev.clientX - r.left; my = ev.clientY - r.top;
      if (dragging != null) { var w = worlds.find(function (x) { return x.id === dragging; }); if (w) { w.x = mx - dox; w.y = my - doy; } draw(); }
      else if (tool === 'relation' && relSrc != null) draw();
      var hit = worldAt(mx, my);
      if (hit && tool !== 'move') {
        var props = Object.keys(hit.val).filter(function (k) { return hit.val[k]; }).join(', ') || '∅';
        tip.textContent = hit.label + ': {' + props + '}';
        tip.style.left = (hit.x + 34) + 'px'; tip.style.top = (hit.y - 18) + 'px'; tip.style.opacity = 1;
      } else tip.style.opacity = 0;
    }
    function nearestEdge(x, y) {
      var best = null, bd = 16;
      edges.forEach(function (e) {
        if (e.from === e.to) return;
        var a = worlds.find(function (w) { return w.id === e.from; }), b = worlds.find(function (w) { return w.id === e.to; });
        if (!a || !b) return; var d = Math.hypot(x - (a.x + b.x) / 2, y - (a.y + b.y) / 2);
        if (d < bd) { bd = d; best = e; }
      }); return best;
    }

    return { mount: mount };
  }

  LV.register({
    id: 'kripke', no: 'I', title: 'Kripke models',
    sub: 'Modal · epistemic · S4 / S5',
    create: mod
  });
})();

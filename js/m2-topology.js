/* ===========================================================================
   m2-topology.js — Topological semantics (McKinsey–Tarski)
   On a topological space (X, τ): ⟦□φ⟧ = interior ⟦φ⟧, ⟦◇φ⟧ = closure ⟦φ⟧.
   S4 is sound & complete w.r.t. topological spaces — the same logic as
   reflexive-transitive Kripke frames, seen geometrically.
   Here X is a small finite space; the user paints ⟦p⟧ and watches □p, ◇p,
   the boundary, and the S4 laws (int int = int, int A ⊆ A) verify live.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  // generate a topology τ on X from a subbasis: close under finite ∩ and arbitrary ∪
  function genTopology(X, subbasis) {
    function key(s) { return X.filter(function (x) { return s[x]; }).join(','); }
    var sets = {}; // key -> boolean-map
    function add(s) { sets[key(s)] = s; }
    var empty = {}; var full = {}; X.forEach(function (x) { full[x] = true; });
    add(empty); add(full);
    subbasis.forEach(function (b) { var m = {}; b.forEach(function (x) { m[x] = true; }); add(m); });
    var changed = true;
    while (changed) {
      changed = false;
      var vals = Object.keys(sets).map(function (k) { return sets[k]; });
      for (var i = 0; i < vals.length; i++) for (var j = 0; j < vals.length; j++) {
        var inter = {}, uni = {};
        X.forEach(function (x) { if (vals[i][x] && vals[j][x]) inter[x] = true; if (vals[i][x] || vals[j][x]) uni[x] = true; });
        if (!(key(inter) in sets)) { add(inter); changed = true; }
        if (!(key(uni) in sets)) { add(uni); changed = true; }
      }
    }
    return Object.keys(sets).map(function (k) { return sets[k]; });
  }

  function mod() {
    var refs = {}, canvas, ctx;
    // X = 5 collinear points; subbasis U={x0,x1,x2}, V={x2,x3,x4}
    var X = [0, 1, 2, 3, 4];
    var pos = [[120, 150], [230, 150], [340, 150], [450, 150], [560, 150]];
    var subbasis = [[0, 1, 2], [2, 3, 4]];
    var tau = genTopology(X, subbasis);
    var P = { 2: true, 3: true }; // current ⟦p⟧ (the "rabbit" set, default {x2,x3})

    function subset(a, b) { return X.every(function (x) { return !a[x] || b[x]; }); } // a ⊆ b
    function comp(a) { var c = {}; X.forEach(function (x) { if (!a[x]) c[x] = true; }); return c; }

    function interior(A) {
      // largest open set ⊆ A = union of all open subsets
      var res = {};
      tau.forEach(function (O) { if (subset(O, A)) X.forEach(function (x) { if (O[x]) res[x] = true; }); });
      return res;
    }
    function closure(A) { return comp(interior(comp(A))); } // cl A = X \ int(X\A)

    function setEq(a, b) { return X.every(function (x) { return !!a[x] === !!b[x]; }); }

    function recompute() {
      var A = {}; Object.keys(P).forEach(function (k) { if (P[k]) A[k] = true; });
      var intA = interior(A), clA = closure(A);
      // S4 law checks
      var idempotent = setEq(interior(intA), intA);  // int int = int   (axiom 4)
      var deflation = subset(intA, A);                // int A ⊆ A       (axiom T)
      var inflation = subset(A, clA);                 // A ⊆ cl A
      LV.clear(refs.laws);
      [['□φ → φ', deflation, 'int A ⊆ A  (T)'],
       ['□φ → □□φ', idempotent, 'int(int A) = int A  (4)'],
       ['φ → ◇φ', inflation, 'A ⊆ cl A']].forEach(function (r) {
        refs.laws.appendChild(el('div.axiom', null,
          el('span.f', { text: r[0] }),
          el('span.muted', { style: { fontSize: '11px', fontFamily: 'var(--mono)' }, text: r[2] }),
          el('span', { 'class': 'st ' + (r[1] ? 'tag-ok' : 'tag-no'), text: r[1] ? '✓' : '✗' })));
      });
      // sets readout
      function fmt(m) { var s = X.filter(function (x) { return m[x]; }).map(function (x) { return 'x' + LV.sub(x); }); return s.length ? '{' + s.join(', ') + '}' : '∅'; }
      LV.clear(refs.sets);
      var t = el('table.tbl');
      [['⟦p⟧', fmt(A), 'var(--ink)'],
       ['□p = int ⟦p⟧', fmt(intA), 'var(--accent3)'],
       ['◇p = cl ⟦p⟧', fmt(clA), 'var(--accent2)'],
       ['boundary ∂p', fmt(boundary(A, intA, clA)), 'var(--gold)']].forEach(function (r) {
        t.appendChild(el('tr', null, el('td', { style: { color: r[2] }, text: r[0] }), el('td', { text: r[1] })));
      });
      refs.sets.appendChild(t);
      draw(A, intA, clA);
    }
    function boundary(A, intA, clA) { var b = {}; X.forEach(function (x) { if (clA[x] && !intA[x]) b[x] = true; }); return b; }

    function resize() { var w = canvas.parentElement.clientWidth; canvas.width = w; canvas.height = 300; recompute(); }

    function draw(A, intA, clA) {
      if (!ctx) return;
      var C = LV.theme();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // draw the two basic open sets as translucent regions
      function blob(set, color, label, dy) {
        var xs = set.map(function (x) { return pos[x][0]; });
        var minx = Math.min.apply(null, xs) - 38, maxx = Math.max.apply(null, xs) + 38;
        var cy = 150 + dy;
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.globalAlpha = .08;
        roundRect(minx, cy - 46, maxx - minx, 92, 30); ctx.fill();
        ctx.globalAlpha = .55; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); roundRect(minx, cy - 46, maxx - minx, 92, 30); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = color; ctx.font = '11px JetBrains Mono, monospace'; ctx.textAlign = 'left';
        ctx.fillText(label, minx + 6, cy - 52);
      }
      blob([0, 1, 2], C.accent, 'open U', -14);
      blob([2, 3, 4], C.gold, 'open V', 14);

      // points
      X.forEach(function (x) {
        var p = pos[x], inP = !!A[x], inInt = !!intA[x], inCl = !!clA[x];
        // outer ring colour encodes role
        var ring = inInt ? C.accent3 : inCl ? C.accent2 : C.rule;
        ctx.beginPath(); ctx.arc(p[0], p[1], 17, 0, Math.PI * 2);
        ctx.fillStyle = inP ? C.warm : C.paper; ctx.fill();
        ctx.lineWidth = (inInt || inCl) ? 3 : 1.4; ctx.strokeStyle = ring; ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = 'bold 12px Playfair Display, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('x' + LV.sub(x), p[0], p[1]);
        if (inP) { ctx.fillStyle = C.accent3; ctx.font = '10px JetBrains Mono'; ctx.fillText('p', p[0], p[1] + 28); }
      });
      // legend
      ctx.font = '11px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.accent3; ctx.fillText('● interior (□p)', 20, 280);
      ctx.fillStyle = C.accent2; ctx.fillText('● closure (◇p)', 160, 280);
      ctx.fillStyle = C.muted; ctx.fillText('fill = in ⟦p⟧ · click a point to toggle', 300, 280);
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module IV · geometric semantics' }),
        el('h2', { text: 'Topological semantics — S4 as geometry' }),
        el('p', { text: 'The McKinsey–Tarski theorem: S4 is exactly the modal logic of topological spaces, with □ read as topological interior and ◇ as closure. Open sets play the role of "necessity": int A ⊆ A gives axiom T, and int(int A) = int A gives axiom 4. Paint the proposition p over a finite space and watch its interior, closure, and boundary.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      var split = el('div.split'); body.appendChild(split);
      var cw = el('div.canvas-card'); canvas = el('canvas'); cw.appendChild(canvas); split.appendChild(cw);
      ctx = canvas.getContext('2d');
      canvas.addEventListener('click', function (ev) {
        var r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
        X.forEach(function (k) { if (Math.hypot(pos[k][0] - x, pos[k][1] - y) < 18) { P[k] = !P[k]; } });
        recompute();
      });

      var col = el('div.grid', { style: { gridTemplateColumns: '1fr' } }); split.appendChild(col);

      var lc = el('div.card'); lc.appendChild(el('h4', { text: 'S4 laws on this space' }));
      refs.laws = el('div'); lc.appendChild(refs.laws); col.appendChild(lc);

      var sc = el('div.card'); sc.appendChild(el('h4', { text: 'computed sets' }));
      refs.sets = el('div'); sc.appendChild(refs.sets); col.appendChild(sc);

      var tc = el('div.card'); tc.appendChild(el('h4', { text: 'the topology τ' }));
      var lst = X.length;
      tc.appendChild(el('p.muted', { style: { fontSize: '12px' } },
        el('span', { text: 'X = {x₀,…,x₄}, generated by basic opens U={x₀,x₁,x₂}, V={x₂,x₃,x₄}. ' }),
        el('span', { text: 'τ has ' + tau.length + ' open sets (the dashed regions plus all ∪/∩ of them). x₂ is the only point in every open containing 0–2 or 2–4 — the topological "glue".' })));
      col.appendChild(tc);

      var bridge = el('div.card'); bridge.appendChild(el('h4', { text: 'bridge to Module III' }));
      bridge.appendChild(el('p.muted', { style: { fontSize: '12.5px' } },
        'Every reflexive-transitive (S4) Kripke frame is an Alexandrov space: let the open sets be the R-upward-closed sets. Then int A = {w : R(w) ⊆ A} = □A and cl A = {w : R(w) ∩ A ≠ ∅} = ◇A. Modal box and topological interior are literally the same operator.'));
      col.appendChild(bridge);

      window.addEventListener('resize', function () { resize(); });
      setTimeout(resize, 30);
    }
    return { mount: mount };
  }

  LV.register({ id: 'topology', no: 'IV', title: 'Topology', sub: 'Interior = □, closure = ◇', create: mod });
})();

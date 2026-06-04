/* ===========================================================================
   m7-agt.js — Algorithmic game theory
   When many selfish agents route themselves through a shared network, the
   equilibrium can be worse than the social optimum. The PRICE OF ANARCHY is
   that ratio. Two canonical instances:
     1. Pigou's example — selfish routing gives total cost 1 vs optimum 3/4,
        so the price of anarchy is 4/3.
     2. Braess's paradox — adding a fast road to a network can make EVERYONE
        slower at equilibrium. The closed-form equilibria are computed and
        drawn; the user toggles the extra road and watches latency rise.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  function mod() {
    var refs = {}, canvasP, ctxP, canvasB, ctxB;
    var f = 1.0;          // Pigou: fraction of flow on the variable (x) edge
    var braessEdge = true; // Braess: is the zero-cost shortcut present?

    /* ---------- Pigou ---------- */
    function pigouCost(frac) { return frac * frac + (1 - frac) * 1; } // f·ℓ_bottom + (1-f)·ℓ_top
    function renderPigou() {
      var cost = pigouCost(f);
      var selfish = pigouCost(1);   // = 1
      var optimum = pigouCost(0.5); // = 0.75
      LV.clear(refs.pigouOut);
      refs.pigouOut.appendChild(el('table.tbl', null,
        row('your split — fraction on the x-edge', f.toFixed(2), 'var(--ink)'),
        row('total latency at your split', cost.toFixed(3), 'var(--ink)'),
        row('selfish equilibrium (all on x-edge)', selfish.toFixed(3), 'var(--accent2)'),
        row('social optimum (split 50/50)', optimum.toFixed(3), 'var(--accent3)'),
        row('price of anarchy = selfish / optimum', (selfish / optimum).toFixed(3) + '  (= 4/3)', 'var(--accent)')));
      drawPigou(cost);
    }
    function row(k, v, c) { return el('tr', null, el('td', { text: k }), el('td', { style: { color: c, fontWeight: '600' }, text: v })); }

    function drawPigou(cost) {
      if (!ctxP) return; var C = LV.theme(), w = canvasP.width, h = canvasP.height;
      ctxP.clearRect(0, 0, w, h); ctxP.fillStyle = C.bg; ctxP.fillRect(0, 0, w, h);
      var s = [60, h / 2], t = [w - 60, h / 2];
      // top edge (constant latency 1), bottom edge (latency = x)
      edgeCurve(ctxP, s, t, -70, C, (1 - f), 'ℓ = 1  (constant)', '1.00', C.gold);
      edgeCurve(ctxP, s, t, 70, C, f, 'ℓ = x  (congestible)', f.toFixed(2), C.accent2);
      nodeP(ctxP, s, 's', C); nodeP(ctxP, t, 't', C);
    }
    function edgeCurve(ctx, s, t, bow, C, flow, label, lat, col) {
      var mx = (s[0] + t[0]) / 2, my = (s[1] + t[1]) / 2 + bow;
      ctx.strokeStyle = col; ctx.lineWidth = 2 + flow * 12; ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.quadraticCurveTo(mx, my, t[0], t[1]); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.ink; ctx.font = '12px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(label, mx, my + (bow < 0 ? -10 : 22));
      ctx.fillStyle = col; ctx.font = 'bold 12px "IBM Plex Mono", monospace';
      ctx.fillText('latency ' + lat, mx, my + (bow < 0 ? 8 : -6));
    }
    function nodeP(ctx, p, label, C) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 22, 0, Math.PI * 2);
      ctx.fillStyle = C.paper; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.accent; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = 'bold 15px Fraunces, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, p[0], p[1]); ctx.textBaseline = 'alphabetic';
    }

    /* ---------- Braess ---------- */
    // Nodes S,A,B,T. Edges S->A (x), S->B (1), A->T (1), B->T (x), A->B (0, optional).
    function braessResult() {
      if (!braessEdge) {
        // split 1/2-1/2 over S->A->T and S->B->T; each route latency = 0.5 + 1 = 1.5
        return { latency: 1.5, total: 1.5, route: 'half take S→A→T, half take S→B→T' };
      }
      // with shortcut everyone routes S->A->B->T: S->A flow 1 (lat 1), A->B (0), B->T flow 1 (lat 1) => 2
      return { latency: 2.0, total: 2.0, route: 'everyone takes S→A→B→T' };
    }
    function renderBraess() {
      var r = braessResult();
      LV.clear(refs.braessOut);
      refs.braessOut.appendChild(el('table.tbl', null,
        row('shortcut A→B present?', braessEdge ? 'yes (latency 0)' : 'no', braessEdge ? 'var(--accent2)' : 'var(--muted)'),
        row('equilibrium routing', r.route, 'var(--ink)'),
        row('latency every driver experiences', r.latency.toFixed(2), braessEdge ? 'var(--accent2)' : 'var(--accent3)')));
      var worse = braessEdge;
      refs.braessOut.appendChild(el('div', { style: { marginTop: '10px' } },
        el('span', { 'class': 'badge ' + (worse ? 'b-no' : 'b-ok'), text: worse ? '⚠ adding the road raised latency 1.50 → 2.00' : 'without the road, latency is 1.50' })));
      drawBraess();
    }
    function drawBraess() {
      if (!ctxB) return; var C = LV.theme(), w = canvasB.width, h = canvasB.height;
      ctxB.clearRect(0, 0, w, h); ctxB.fillStyle = C.bg; ctxB.fillRect(0, 0, w, h);
      var S = [60, h / 2], A = [w / 2, 60], B = [w / 2, h - 60], T = [w - 60, h / 2];
      bEdge(S, A, 'x', C.accent2, C); bEdge(S, B, '1', C.gold, C);
      bEdge(A, T, '1', C.gold, C); bEdge(B, T, 'x', C.accent2, C);
      if (braessEdge) bEdge(A, B, '0', C.accent3, C);
      else { // draw dashed ghost
        ctxB.strokeStyle = C.rule; ctxB.setLineDash([5, 5]); ctxB.lineWidth = 1.5;
        ctxB.beginPath(); ctxB.moveTo(A[0], A[1] + 24); ctxB.lineTo(B[0], B[1] - 24); ctxB.stroke(); ctxB.setLineDash([]);
      }
      [[S, 'S'], [A, 'A'], [B, 'B'], [T, 'T']].forEach(function (n) { nodeP(ctxB, n[0], n[1], C); });
    }
    function bEdge(p, q, lab, col, C) {
      var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      var sx = p[0] + ux * 24, sy = p[1] + uy * 24, ex = q[0] - ux * 24, ey = q[1] - uy * 24;
      ctxB.strokeStyle = col; ctxB.lineWidth = 2.4;
      ctxB.beginPath(); ctxB.moveTo(sx, sy); ctxB.lineTo(ex, ey); ctxB.stroke();
      // arrowhead
      ctxB.fillStyle = col; ctxB.beginPath();
      var px = -uy, py = ux;
      ctxB.moveTo(ex, ey); ctxB.lineTo(ex - ux * 10 + px * 4, ey - uy * 10 + py * 4); ctxB.lineTo(ex - ux * 10 - px * 4, ey - uy * 10 - py * 4); ctxB.closePath(); ctxB.fill();
      ctxB.fillStyle = C.ink; ctxB.font = 'bold 13px "IBM Plex Mono", monospace'; ctxB.textAlign = 'center';
      ctxB.fillText('ℓ=' + lab, (sx + ex) / 2 + px * 12, (sy + ey) / 2 + py * 12 + 4);
    }

    function resize() {
      [canvasP, canvasB].forEach(function (cv) { if (cv) { cv.width = cv.parentElement.clientWidth; cv.height = 240; } });
      renderPigou(); renderBraess();
    }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module VIII · the cost of selfishness' }),
        el('h2', { text: 'Algorithmic game theory — the price of anarchy' }),
        el('p', { text: 'When self-interested agents share a network, their Nash equilibrium can be strictly worse than what a central planner would choose. The ratio between the two is the price of anarchy. Two classic instances show it — including Braess\u2019s paradox, where building a new road makes everyone slower.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      // Pigou
      var p1 = el('div.card', { style: { marginBottom: '22px' } });
      p1.appendChild(el('h3', { text: '1 · Pigou\u2019s example — routing one unit of traffic from s to t' }));
      p1.appendChild(el('p.muted', { style: { fontSize: '12.5px', marginBottom: '6px' } }, 'One road has constant latency 1; the other has latency equal to its load x. Drag the split and compare your total latency with the selfish equilibrium and the social optimum.'));
      var cwP = el('div.canvas-card'); canvasP = el('canvas'); cwP.appendChild(canvasP); p1.appendChild(cwP); ctxP = canvasP.getContext('2d');
      var sl = el('input', { type: 'range', min: '0', max: '100', value: '100', style: { marginTop: '12px' } });
      sl.addEventListener('input', function () { f = parseInt(sl.value, 10) / 100; renderPigou(); });
      p1.appendChild(el('label.lab', { text: 'fraction routed onto the congestible (x) edge' }));
      p1.appendChild(sl);
      refs.pigouOut = el('div', { style: { marginTop: '12px' } }); p1.appendChild(refs.pigouOut);
      body.appendChild(p1);

      // Braess
      var p2 = el('div.card');
      p2.appendChild(el('h3', { text: '2 · Braess\u2019s paradox — when a new road hurts everyone' }));
      p2.appendChild(el('p.muted', { style: { fontSize: '12.5px', marginBottom: '6px' } }, 'Without the green shortcut, traffic splits evenly and every driver faces latency 1.5. Add the zero-cost shortcut and self-interest funnels everyone through it — pushing latency up to 2.0.'));
      var cwB = el('div.canvas-card'); canvasB = el('canvas'); cwB.appendChild(canvasB); p2.appendChild(cwB); ctxB = canvasB.getContext('2d');
      var tog = el('button.btn.primary', { text: 'remove the shortcut A→B', style: { marginTop: '12px' } });
      tog.addEventListener('click', function () { braessEdge = !braessEdge; tog.textContent = braessEdge ? 'remove the shortcut A→B' : 'add the shortcut A→B'; renderBraess(); });
      p2.appendChild(tog);
      refs.braessOut = el('div', { style: { marginTop: '12px' } }); p2.appendChild(refs.braessOut);
      body.appendChild(p2);

      window.addEventListener('resize', function () { resize(); });
      setTimeout(resize, 30);
    }
    return { mount: mount };
  }

  LV.register({ id: 'agt', no: 'VIII', title: 'Algorithmic game theory', sub: 'Price of anarchy · Braess', create: mod });
})();

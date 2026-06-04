/* ===========================================================================
   m3-agents.js — AI agent foundations
   Multi-agent epistemic logic: each agent i has an indistinguishability
   relation ~_i (an equivalence). K_i φ = φ holds at every world i can't
   distinguish from the actual one. Group operators: C (common knowledge,
   the reflexive-transitive closure of the union of the ~_i) and D
   (distributed knowledge, the intersection). Public announcement φ! is the
   core dynamic-epistemic update: delete every world where φ is false, then
   re-evaluate. This is the engine behind puzzles like the muddy children and
   underlies multi-agent coordination in AI.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  function mod() {
    var refs = {}, canvas, ctx;
    var nAgents = 2;
    var worlds = [], edges = [], actual = 0; // edges: {from,to,agent}
    var sel = null, tool = 'move', dragging = null, dox = 0, doy = 0, mx = 0, my = 0;
    var relAgent = 1, relSrc = null;
    var R = 26;
    var AGCOL = ['', null, null, null]; // filled from theme each draw

    function agentColor(a, C) {
      return [null, C.accent, C.accent2, C.accent3, C.gold][a] || C.muted;
    }

    function presetMuddy() {
      // Two children, each muddy or clean -> 4 worlds = bit strings 11,10,01,00 (a=child1,b=child2 muddy)
      worlds = []; edges = [];
      var coords = [[170, 110], [410, 110], [170, 270], [410, 270]];
      var bits = [[1, 1], [1, 0], [0, 1], [0, 0]];
      bits.forEach(function (b, i) {
        worlds.push({ id: i, x: coords[i][0], y: coords[i][1], label: b.join(''), val: { a: b[0], b: b[1] } });
      });
      // child 1 sees child 2's forehead but not own -> ~1 links worlds differing only in 'a'
      // child 2 sees child 1 -> ~2 links worlds differing only in 'b'
      function eq(i, j, agent) { edges.push({ from: i, to: j, agent: agent }); edges.push({ from: j, to: i, agent: agent }); }
      worlds.forEach(function (w) { edges.push({ from: w.id, to: w.id, agent: 1 }); edges.push({ from: w.id, to: w.id, agent: 2 }); });
      // agent 1 cannot tell own bit a: link worlds same b, diff a -> (11,01),(10,00)
      eq(0, 2, 1); eq(1, 3, 1);
      // agent 2 cannot tell own bit b: link worlds same a, diff b -> (11,10),(01,00)
      eq(0, 1, 2); eq(2, 3, 2);
      actual = 0; sel = null;
      refresh();
    }

    function interp() {
      return {
        atom: function (n, w) { var ww = worlds.find(function (x) { return x.id === w; }); return ww && ww.val[n]; },
        box: function (child, w) { return LV.rel.succ(edges, w).every(child); }, // generic □ = everyone? use union
        K: function (ag, child, w) { return LV.rel.succ(edges, w, ag).every(child); },
        C: function (child, w) {
          var ags = []; for (var i = 1; i <= nAgents; i++) ags.push(i);
          var ids = worlds.map(function (x) { return x.id; });
          return LV.rel.reach(ids, edges, w, ags).every(child);
        },
        D: function (child, w) {
          // distributed: worlds related by every agent's relation (intersection)
          var ids = worlds.map(function (x) { return x.id; });
          var inter = ids.filter(function (v) {
            for (var a = 1; a <= nAgents; a++) if (!LV.rel.has(edges, w, v, a)) return false;
            return true;
          });
          return inter.every(child);
        }
      };
    }

    function evaluate() {
      var raw = refs.formula.value.trim(); LV.clear(refs.evalOut);
      if (!raw || !worlds.length) { renderTruth(null); return; }
      var ast; try { ast = LV.parse(raw); } catch (e) { refs.evalOut.appendChild(el('span.badge.b-no', { text: '⚠ ' + e.message })); return; }
      var rows = worlds.map(function (w) { return { w: w, v: LV.evalAST(ast, w.id, interp()) }; });
      var atActual = rows.find(function (r) { return r.w.id === actual; });
      refs.evalOut.appendChild(el('span', { 'class': 'badge ' + (atActual && atActual.v ? 'b-ok' : 'b-no') },
        (atActual && atActual.v ? '✓ true' : '✗ false') + ' at actual world ' + (worlds.find(function (w) { return w.id === actual; }) || {}).label));
      renderTruth(rows); draw();
    }

    function renderTruth(rows) {
      var p = refs.truth; LV.clear(p);
      if (!rows) { p.appendChild(el('p.muted', { style: { fontSize: '12px' }, text: 'evaluate a formula' })); return; }
      var t = el('table.tbl'); t.appendChild(el('tr', null, el('th', { text: 'world' }), el('th', { text: 'val' }), el('th', { text: 'φ' })));
      rows.forEach(function (r) {
        var v = Object.keys(r.w.val).filter(function (k) { return r.w.val[k]; }).join(',') || '∅';
        var tr = el('tr', null, el('td', { text: r.w.label + (r.w.id === actual ? ' ◀' : '') }), el('td', { text: '{' + v + '}' }), el('td', { 'class': r.v ? 'tag-ok' : 'tag-no', text: r.v ? 'T' : 'F' }));
        t.appendChild(tr);
      });
      p.appendChild(t);
    }

    function announce() {
      var raw = refs.formula.value.trim(); if (!raw) return;
      var ast; try { ast = LV.parse(raw); } catch (e) { return; }
      var keep = worlds.filter(function (w) { return LV.evalAST(ast, w.id, interp()); });
      var keepIds = keep.map(function (w) { return w.id; });
      if (keepIds.indexOf(actual) < 0) {
        refs.evalOut.appendChild(el('div.badge.b-warn', { style: { marginTop: '6px' }, text: 'cannot announce: false at the actual world' })); return;
      }
      worlds = keep;
      edges = edges.filter(function (e) { return keepIds.indexOf(e.from) >= 0 && keepIds.indexOf(e.to) >= 0; });
      refs.announceLog.appendChild(el('div', { style: { fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--accent2)' }, text: '! ' + LV.show(ast) + '  →  ' + worlds.length + ' worlds remain' }));
      refresh();
    }

    function resize() { var w = canvas.parentElement.clientWidth; canvas.width = w; canvas.height = 380; draw(); }
    function arrow(x, y, bx, by, color) {
      var dx = x - bx, dy = y - by, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, px = -uy, py = ux;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - ux * 8 + px * 3.5, y - uy * 8 + py * 3.5); ctx.lineTo(x - ux * 8 - px * 3.5, y - uy * 8 - py * 3.5); ctx.closePath(); ctx.fill();
    }
    function draw() {
      if (!ctx) return; var C = LV.theme();
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // edges, offset per agent so two agents' links don't overlap
      edges.forEach(function (e) {
        if (e.from === e.to) return;
        var a = worlds.find(function (w) { return w.id === e.from; }), b = worlds.find(function (w) { return w.id === e.to; });
        if (!a || !b || a.id > b.id) return; // draw once per undirected pair
        var col = agentColor(e.agent, C);
        var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
        var off = (e.agent - 1.5) * 7;
        ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(a.x + ux * R + nx * off, a.y + uy * R + ny * off); ctx.lineTo(b.x - ux * R + nx * off, b.y - uy * R + ny * off); ctx.stroke();
      });
      worlds.forEach(function (w) {
        var isActual = w.id === actual, isSel = w.id === sel;
        ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, Math.PI * 2);
        ctx.fillStyle = isActual ? C.warm : C.paper; ctx.fill();
        ctx.lineWidth = isActual ? 3 : isSel ? 2.4 : 1.4; ctx.strokeStyle = isActual ? C.accent2 : isSel ? C.accent : C.gold; ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = 'bold 12px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.label, w.x, w.y);
      });
      // legend
      ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      for (var i = 1; i <= nAgents; i++) { ctx.fillStyle = agentColor(i, C); ctx.fillText('— agent ' + i, 18 + (i - 1) * 92, 360); }
      ctx.fillStyle = C.accent2; ctx.fillText('◀ actual', 18 + nAgents * 92, 360);
    }

    function setTool(t) { tool = t; relSrc = null; Array.prototype.forEach.call(refs.tools.children, function (b) { if (b.dataset.tool) b.classList.toggle('active', b.dataset.tool === t); }); }
    function refresh() { renderProps(); evaluate(); draw(); }

    function renderProps() {
      var p = refs.props; LV.clear(p);
      var w = worlds.find(function (x) { return x.id === sel; });
      if (!w) { p.appendChild(el('p.muted', { style: { fontSize: '12px' }, text: 'click a world to set it actual / edit' })); return; }
      p.appendChild(el('div.mono', { style: { fontSize: '12px', color: 'var(--accent)', marginBottom: '6px' }, text: 'World ' + w.label }));
      var setBtn = el('button.btn', { text: w.id === actual ? '★ is actual' : 'set as actual' });
      setBtn.addEventListener('click', function () { actual = w.id; refresh(); });
      p.appendChild(setBtn);
      p.appendChild(el('div', { style: { marginTop: '8px' } }));
      ['a', 'b'].forEach(function (k) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!w.val[k];
        cb.addEventListener('change', function () { w.val[k] = cb.checked ? 1 : 0; evaluate(); });
        p.appendChild(el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: '12px', marginTop: '4px' } }, cb, el('span', { text: k }), el('span.muted', { text: w.val[k] ? 'T' : 'F' })));
      });
    }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module III · multi-agent epistemics' }),
        el('h2', { text: 'AI agent foundations — knowledge among many minds' }),
        el('p', { text: 'Each agent has its own indistinguishability relation; Kᵢφ means agent i knows φ. Common knowledge Cφ ("everyone knows that everyone knows…") is the closure that makes coordination possible, and a public announcement φ! updates the model by deleting worlds where φ is false. These are the primitives behind protocol reasoning, mechanism design, and multi-agent RL.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      var tools = el('div.btn-row', { style: { marginBottom: '14px' } });
      [['move', '✥ move'], ['actual', '★ set actual'], ['delete', '⌫ delete']].forEach(function (t) {
        var b = el('button.btn', { text: t[1] }); b.dataset.tool = t[0]; b.addEventListener('click', function () { setTool(t[0]); }); tools.appendChild(b);
      });
      tools.appendChild(el('span', { style: { width: '12px' } }));
      var pmuddy = el('button.btn', { text: 'preset: muddy children' }); pmuddy.addEventListener('click', presetMuddy); tools.appendChild(pmuddy);
      refs.tools = tools; body.appendChild(tools);

      var split = el('div.split'); body.appendChild(split);
      var cw = el('div.canvas-card'); canvas = el('canvas'); cw.appendChild(canvas); split.appendChild(cw); ctx = canvas.getContext('2d');
      canvas.addEventListener('mousedown', onDown); canvas.addEventListener('mousemove', onMove); window.addEventListener('mouseup', function () { dragging = null; });

      var col = el('div.grid', { style: { gridTemplateColumns: '1fr' } }); split.appendChild(col);

      var fc = el('div.card'); fc.appendChild(el('h4', { text: 'epistemic formula' }));
      refs.formula = el('input', { type: 'text', value: 'K₁(a ∨ b) ∧ ¬K₁a', style: { width: '100%' } });
      var fr = el('div.btn-row'); fr.appendChild(refs.formula);
      var eb = el('button.btn.primary', { text: 'eval' }); eb.addEventListener('click', evaluate); fr.appendChild(eb);
      fc.appendChild(fr);
      var sr = el('div.symrow'); 'K₁ K₂ C D ¬ ∧ ∨ → ↔'.split(' ').forEach(function (s) { var b = el('button.sym', { text: s }); b.addEventListener('click', function () { refs.formula.value += s; refs.formula.focus(); }); sr.appendChild(b); });
      fc.appendChild(sr);
      refs.evalOut = el('div', { style: { marginTop: '10px' } }); fc.appendChild(refs.evalOut);
      var ab = el('button.btn', { text: '📢 announce φ!  (public update)', style: { marginTop: '10px' } }); ab.addEventListener('click', announce); fc.appendChild(ab);
      col.appendChild(fc);

      var pc = el('div.card'); pc.appendChild(el('h4', { text: 'selected world' })); refs.props = el('div'); pc.appendChild(refs.props); col.appendChild(pc);
      var tc = el('div.card'); tc.appendChild(el('h4', { text: 'truth at worlds' })); refs.truth = el('div'); tc.appendChild(refs.truth); col.appendChild(tc);
      var lc = el('div.card'); lc.appendChild(el('h4', { text: 'announcement history' })); refs.announceLog = el('div'); lc.appendChild(refs.announceLog); col.appendChild(lc);

      var note = el('div.card');
      note.appendChild(el('h4', { text: 'try the muddy children' }));
      note.appendChild(el('p.muted', { style: { fontSize: '12.5px' } },
        'Load the preset. World "11" (both muddy) is actual. Father announces "at least one of you is muddy" — announce a ∨ b (nothing changes; it was common knowledge if both visibly muddy, but world 00 is removed). Then announce that nobody yet knows their own state: ¬K₁a ∧ ¬K₂b. Worlds collapse until each child can deduce their own muddiness. This is epistemic reasoning made mechanical.'));
      col.appendChild(note);

      window.addEventListener('resize', function () { resize(); });
      setTimeout(function () { resize(); presetMuddy(); refs.formula.value = 'K₁(a ∨ b) ∧ ¬K₁a'; evaluate(); }, 30);
    }

    function worldAt(x, y) { for (var i = worlds.length - 1; i >= 0; i--) if (Math.hypot(worlds[i].x - x, worlds[i].y - y) < R) return worlds[i]; return null; }
    function onDown(ev) {
      var r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, hit = worldAt(x, y);
      if (!hit) return;
      if (tool === 'actual') { actual = hit.id; sel = hit.id; refresh(); }
      else if (tool === 'delete') { worlds = worlds.filter(function (w) { return w.id !== hit.id; }); edges = edges.filter(function (e) { return e.from !== hit.id && e.to !== hit.id; }); refresh(); }
      else { sel = hit.id; dragging = hit.id; dox = x - hit.x; doy = y - hit.y; renderProps(); draw(); }
    }
    function onMove(ev) {
      var r = canvas.getBoundingClientRect(); mx = ev.clientX - r.left; my = ev.clientY - r.top;
      if (dragging != null) { var w = worlds.find(function (x) { return x.id === dragging; }); if (w) { w.x = mx - dox; w.y = my - doy; } draw(); }
    }

    return { mount: mount };
  }

  LV.register({ id: 'agents', no: 'III', title: 'Agent foundations', sub: 'Common knowledge · announcements', create: mod });
})();

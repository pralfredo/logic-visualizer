/* ===========================================================================
   m6-games.js — Game theory: Nash equilibrium
   A 2x2 bimatrix game. Each cell holds (row payoff, column payoff). The tool
   marks best responses, finds every pure-strategy Nash equilibrium (a cell
   where neither player can profitably deviate), computes the mixed-strategy
   equilibrium, and flags strictly dominant strategies. This is where the
   single-agent decision theory of Module VI becomes genuinely strategic:
   the best act now depends on what the other rational agent does.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  // payoff[i][j] = [rowPayoff, colPayoff]; i in {0:T,1:B}, j in {0:L,1:R}
  var PRESETS = {
    pd: { name: "Prisoner's Dilemma", rows: ['Cooperate', 'Defect'], cols: ['Cooperate', 'Defect'],
      P: [[[3, 3], [0, 5]], [[5, 0], [1, 1]]] },
    stag: { name: 'Stag Hunt', rows: ['Stag', 'Hare'], cols: ['Stag', 'Hare'],
      P: [[[4, 4], [0, 3]], [[3, 0], [3, 3]]] },
    bos: { name: 'Battle of the Sexes', rows: ['Opera', 'Football'], cols: ['Opera', 'Football'],
      P: [[[2, 1], [0, 0]], [[0, 0], [1, 2]]] },
    mp: { name: 'Matching Pennies', rows: ['Heads', 'Tails'], cols: ['Heads', 'Tails'],
      P: [[[1, -1], [-1, 1]], [[-1, 1], [1, -1]]] },
    chicken: { name: 'Chicken', rows: ['Swerve', 'Straight'], cols: ['Swerve', 'Straight'],
      P: [[[0, 0], [-1, 1]], [[1, -1], [-10, -10]]] }
  };

  function mod() {
    var refs = {};
    var g = clone(PRESETS.pd);

    function clone(x) { return JSON.parse(JSON.stringify(x)); }

    function pureNE() {
      var P = g.P, ne = [];
      // row best responses to each column j
      for (var j = 0; j < 2; j++) {
        var rb = P[0][j][0] >= P[1][j][0] ? 0 : 1;
        var rbest = [P[0][j][0] === Math.max(P[0][j][0], P[1][j][0]),
                     P[1][j][0] === Math.max(P[0][j][0], P[1][j][0])];
        g._rowBR = g._rowBR || [[false, false], [false, false]];
        g._rowBR[0][j] = rbest[0]; g._rowBR[1][j] = rbest[1];
      }
      // col best responses to each row i
      for (var i = 0; i < 2; i++) {
        var cmax = Math.max(P[i][0][1], P[i][1][1]);
        g._colBR = g._colBR || [[false, false], [false, false]];
        g._colBR[i][0] = P[i][0][1] === cmax; g._colBR[i][1] = P[i][1][1] === cmax;
      }
      for (i = 0; i < 2; i++) for (j = 0; j < 2; j++)
        if (g._rowBR[i][j] && g._colBR[i][j]) ne.push([i, j]);
      return ne;
    }

    function mixedNE() {
      var P = g.P;
      var a = P[0][0][0], b = P[0][1][0], c = P[1][0][0], d = P[1][1][0]; // row payoffs
      var e = P[0][0][1], f = P[0][1][1], gg = P[1][0][1], h = P[1][1][1]; // col payoffs
      var qd = (a - b - c + d), pd_ = (e - f - gg + h);
      var q = qd !== 0 ? (d - b) / qd : null;   // prob Col plays L
      var p = pd_ !== 0 ? (h - gg) / pd_ : null; // prob Row plays T
      var ok = p != null && q != null && p > 0 && p < 1 && q > 0 && q < 1;
      return { p: p, q: q, ok: ok };
    }

    function dominant() {
      var P = g.P, out = [];
      // row: does T strictly dominate B or vice versa?
      if (P[0][0][0] > P[1][0][0] && P[0][1][0] > P[1][1][0]) out.push('Row: ' + g.rows[0] + ' strictly dominant');
      if (P[1][0][0] > P[0][0][0] && P[1][1][0] > P[0][1][0]) out.push('Row: ' + g.rows[1] + ' strictly dominant');
      if (P[0][0][1] > P[0][1][1] && P[1][0][1] > P[1][1][1]) out.push('Col: ' + g.cols[0] + ' strictly dominant');
      if (P[0][1][1] > P[0][0][1] && P[1][1][1] > P[1][0][1]) out.push('Col: ' + g.cols[1] + ' strictly dominant');
      return out;
    }

    function render() {
      var ne = pureNE();
      var isNE = function (i, j) { return ne.some(function (c) { return c[0] === i && c[1] === j; }); };
      // matrix
      var pane = refs.matrix; LV.clear(pane);
      var t = el('table.tbl', { style: { fontSize: '13px' } });
      var head = el('tr', null, el('th', { text: '' }), el('th', { text: g.cols[0] }), el('th', { text: g.cols[1] }));
      t.appendChild(head);
      for (var i = 0; i < 2; i++) {
        var tr = el('tr', null, el('th', { text: g.rows[i] }));
        for (var j = 0; j < 2; j++) (function (i, j) {
          var cell = el('td', { style: { textAlign: 'center', padding: '8px', borderRadius: '6px' } });
          if (isNE(i, j)) { cell.style.outline = '2px solid var(--accent)'; cell.style.background = 'rgba(47,44,214,.07)'; }
          var rIn = el('input', { type: 'number', value: g.P[i][j][0], style: { width: '46px', padding: '2px 4px', color: 'var(--accent)', fontWeight: g._rowBR[i][j] ? '700' : '400', borderColor: g._rowBR[i][j] ? 'var(--accent)' : 'var(--rule)' } });
          rIn.addEventListener('input', function () { g.P[i][j][0] = parseFloat(rIn.value) || 0; render(); });
          var cIn = el('input', { type: 'number', value: g.P[i][j][1], style: { width: '46px', padding: '2px 4px', color: 'var(--accent2)', fontWeight: g._colBR[i][j] ? '700' : '400', borderColor: g._colBR[i][j] ? 'var(--accent2)' : 'var(--rule)' } });
          cIn.addEventListener('input', function () { g.P[i][j][1] = parseFloat(cIn.value) || 0; render(); });
          cell.appendChild(el('div', { style: { display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' } }, rIn, el('span', { style: { color: 'var(--muted)' }, text: ',' }), cIn));
          if (isNE(i, j)) cell.appendChild(el('div', { style: { marginTop: '4px' } }, el('span.badge.b-info', { text: 'NE' })));
          tr.appendChild(cell);
        })(i, j);
        t.appendChild(tr);
      }
      pane.appendChild(t);
      pane.appendChild(el('p.muted', { style: { fontSize: '11.5px', marginTop: '8px' } },
        'Bold + coloured outline = a best response (cobalt = Row, vermilion = Column). A cell where both are best responses is a pure-strategy Nash equilibrium.'));

      // results
      var R = refs.results; LV.clear(R);
      R.appendChild(el('h4', { text: 'pure-strategy equilibria' }));
      if (ne.length) ne.forEach(function (c) {
        R.appendChild(el('div', { style: { marginBottom: '4px' } },
          el('span.badge.b-ok', { text: '(' + g.rows[c[0]] + ', ' + g.cols[c[1]] + ')' }),
          el('span.muted', { style: { fontSize: '12px', marginLeft: '8px' }, text: 'payoff (' + g.P[c[0]][c[1]][0] + ', ' + g.P[c[0]][c[1]][1] + ')' })));
      });
      else R.appendChild(el('p.muted', { style: { fontSize: '12.5px' }, text: 'none in pure strategies — look to the mixed equilibrium.' }));

      var m = mixedNE();
      R.appendChild(el('h4', { text: 'mixed-strategy equilibrium', style: { marginTop: '14px' } }));
      if (m.ok) {
        R.appendChild(el('p', { style: { fontSize: '13px' } },
          'Row plays ', el('b', { text: g.rows[0] }), ' with p = ', el('b', { text: m.p.toFixed(2) }),
          ', Column plays ', el('b', { text: g.cols[0] }), ' with q = ', el('b', { text: m.q.toFixed(2) }), '.'));
        R.appendChild(el('p.muted', { style: { fontSize: '11.5px' } }, 'Each player mixes precisely so as to leave the other indifferent — the hallmark of a mixed equilibrium.'));
      } else R.appendChild(el('p.muted', { style: { fontSize: '12.5px' }, text: 'no fully-mixed equilibrium (the indifference conditions have no interior solution here).' }));

      var dom = dominant();
      if (dom.length) {
        R.appendChild(el('h4', { text: 'dominant strategies', style: { marginTop: '14px' } }));
        dom.forEach(function (d) { R.appendChild(el('div', { style: { fontSize: '12.5px' } }, el('span.badge.b-warn', { text: d }))); });
      }
    }

    function loadPreset(k) {
      var pr = PRESETS[k];
      g = clone(pr); render();
      refs.title.textContent = pr.name;
    }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module VII · strategic interaction' }),
        el('h2', { text: 'Game theory — Nash equilibrium' }),
        el('p', { text: 'Decision theory asked what a lone agent should do. Now the payoff of your choice depends on another rational agent\u2019s choice, and vice versa. A Nash equilibrium is a profile from which no one can profitably deviate. Edit any payoff, or load a classic game, and watch the best responses and equilibria recompute.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      var pr = el('div.btn-row', { style: { marginBottom: '16px' } });
      pr.appendChild(el('span.mono', { style: { fontSize: '11px', color: 'var(--muted)', marginRight: '4px' }, text: 'load:' }));
      Object.keys(PRESETS).forEach(function (k) {
        var b = el('button.btn', { text: PRESETS[k].name }); b.addEventListener('click', function () { loadPreset(k); }); pr.appendChild(b);
      });
      body.appendChild(pr);

      var split = el('div.split-even');
      var left = el('div.card');
      left.appendChild(el('h3', null, refs.title = el('span', { text: g.name })));
      left.appendChild(el('p.muted', { style: { fontSize: '12px', marginBottom: '10px' } }, 'Row chooses a row, Column a column. Each cell: (Row payoff, Column payoff).'));
      refs.matrix = el('div'); left.appendChild(refs.matrix);
      split.appendChild(left);

      var right = el('div.card');
      refs.results = el('div'); right.appendChild(refs.results);
      split.appendChild(right);
      body.appendChild(split);

      body.appendChild(el('div.card', { style: { marginTop: '20px' } },
        el('h4', { text: 'why it matters' }),
        el('p.muted', { style: { fontSize: '12.5px' } },
          'The Prisoner\u2019s Dilemma\u2019s only equilibrium is mutual defection though both would prefer mutual cooperation — the gap between individual and collective rationality. Matching Pennies has no pure equilibrium at all, which is exactly why Nash\u2019s theorem guaranteeing a mixed equilibrium in every finite game is foundational. The next module measures the social cost of these equilibria.')));

      render();
    }
    return { mount: mount };
  }

  LV.register({ id: 'games', no: 'VII', title: 'Game theory', sub: 'Nash equilibrium · best response', create: mod });
})();

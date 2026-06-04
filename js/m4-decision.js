/* ===========================================================================
   m4-decision.js — Decision theory
   (1) A general expected-utility calculator over an acts × states matrix.
   (2) Newcomb's problem, the canonical case where evidential and causal
       decision theory diverge: EDT one-boxes (your choice is evidence about
       the predictor's already-made prediction); CDT two-boxes (dominance —
       the choice cannot causally change a sealed box). A slider over predictor
       accuracy shows exactly where the two theories disagree, with a nod to
       the functional decision theory used in modern AI agent-foundations work.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  function bar(label, value, max, win) {
    var pct = max > 0 ? Math.max(0, value / max) * 100 : 0;
    var fill = el('div', { 'class': 'bar-fill' + (win ? ' win' : '') }); fill.style.width = pct.toFixed(1) + '%';
    return el('div', { style: { marginBottom: '8px' } },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '12px', marginBottom: '3px' } },
        el('span', { text: label }), el('span', { style: { fontWeight: '600' }, text: '$' + Math.round(value).toLocaleString() })),
      el('div.bar-track', null, fill));
  }

  function mod() {
    var refs = {};

    /* ---- (1) generic EU calculator ---- */
    // 2 acts × 2 states default; editable utilities + state probabilities
    var euState = { p: 0.5, U: [[100, 0], [40, 40]], actNames: ['risky', 'safe'], stateNames: ['boom', 'bust'] };

    function renderEU() {
      var s = euState; var pane = refs.eu; LV.clear(pane);
      var probs = [s.p, 1 - s.p];
      // matrix table with editable utilities
      var t = el('table.tbl');
      var head = el('tr', null, el('th', { text: 'act \\ state' }));
      s.stateNames.forEach(function (n, j) { head.appendChild(el('th', { text: n + ' (' + (probs[j] * 100).toFixed(0) + '%)' })); });
      head.appendChild(el('th', { text: 'EU' }));
      t.appendChild(head);
      var eus = s.U.map(function (row) { return row.reduce(function (a, u, j) { return a + probs[j] * u; }, 0); });
      var best = eus.indexOf(Math.max.apply(null, eus));
      s.U.forEach(function (row, i) {
        var tr = el('tr', null, el('td', { text: s.actNames[i] }));
        row.forEach(function (u, j) {
          var inp = el('input', { type: 'number', value: u, style: { width: '64px', padding: '3px 6px' } });
          inp.addEventListener('input', function () { s.U[i][j] = parseFloat(inp.value) || 0; renderEU(); });
          tr.appendChild(el('td', null, inp));
        });
        tr.appendChild(el('td', { 'class': i === best ? 'tag-ok' : '', text: Math.round(eus[i]).toLocaleString() + (i === best ? ' ◀' : '') }));
        t.appendChild(tr);
      });
      pane.appendChild(t);
      pane.appendChild(el('div', { style: { marginTop: '12px' } },
        el('label.lab', { text: 'P(' + s.stateNames[0] + ') = ' + (s.p * 100).toFixed(0) + '%' })));
      var slider = el('input', { type: 'range', min: '0', max: '100', value: String(s.p * 100) });
      slider.addEventListener('input', function () { s.p = parseInt(slider.value, 10) / 100; renderEU(); });
      pane.appendChild(slider);
      pane.appendChild(el('p.muted', { style: { fontSize: '12px', marginTop: '8px' } },
        'EU(act) = Σ P(state)·U(act,state). The recommended act maximises expected utility under the probability distribution.'));
    }

    /* ---- (2) Newcomb ---- */
    var newcomb = { acc: 0.9, prior: 0.5 };
    var OPAQUE = 1000000, TRANSPARENT = 1000;

    function renderNewcomb() {
      var a = newcomb.acc; var pane = refs.newcomb; LV.clear(pane);
      // Payoffs: B = opaque box ($1M if predicted one-box, else $0); A = transparent ($1000, always taken if two-boxing)
      // EDT: condition on the act. P(million | one-box) = acc ; P(million | two-box) = 1 - acc
      var eu_one_EDT = a * OPAQUE + (1 - a) * 0;                 // one-box: take only B
      var eu_two_EDT = a * 0 + (1 - a) * OPAQUE + TRANSPARENT;   // two-box: B is likely empty + always get A
      // CDT: the prediction is already fixed with prior probability p of "million present"; act can't change it.
      var p = newcomb.prior;
      var eu_one_CDT = p * OPAQUE + (1 - p) * 0;
      var eu_two_CDT = p * (OPAQUE + TRANSPARENT) + (1 - p) * (0 + TRANSPARENT); // dominance: +1000 in both columns
      var edtPick = eu_one_EDT >= eu_two_EDT ? 'one-box' : 'two-box';
      var cdtPick = eu_one_CDT >= eu_two_CDT ? 'one-box' : 'two-box';

      // controls
      pane.appendChild(el('label.lab', { text: 'predictor accuracy = ' + (a * 100).toFixed(0) + '%' }));
      var sl = el('input', { type: 'range', min: '50', max: '100', value: String(a * 100) });
      sl.addEventListener('input', function () { newcomb.acc = parseInt(sl.value, 10) / 100; renderNewcomb(); });
      pane.appendChild(sl);

      // two theory cards
      var cols = el('div.split-even', { style: { marginTop: '14px' } });
      var edt = el('div.card', { style: { background: 'var(--paper)' } });
      edt.appendChild(el('h4', { text: 'Evidential DT' }));
      edt.appendChild(el('p.muted', { style: { fontSize: '11.5px', marginBottom: '10px' } }, 'conditions on the act as evidence about the prediction'));
      edt.appendChild(bar('one-box', eu_one_EDT, OPAQUE + TRANSPARENT, edtPick === 'one-box'));
      edt.appendChild(bar('two-box', eu_two_EDT, OPAQUE + TRANSPARENT, edtPick === 'two-box'));
      edt.appendChild(el('div', { style: { marginTop: '8px' } }, el('span.badge.b-info', { text: 'recommends: ' + edtPick })));
      cols.appendChild(edt);

      var cdt = el('div.card', { style: { background: 'var(--paper)' } });
      cdt.appendChild(el('h4', { text: 'Causal DT' }));
      cdt.appendChild(el('p.muted', { style: { fontSize: '11.5px', marginBottom: '10px' } }, 'box is sealed; choice cannot cause its contents — dominance rules'));
      cdt.appendChild(bar('one-box', eu_one_CDT, OPAQUE + TRANSPARENT, cdtPick === 'one-box'));
      cdt.appendChild(bar('two-box', eu_two_CDT, OPAQUE + TRANSPARENT, cdtPick === 'two-box'));
      cdt.appendChild(el('div', { style: { marginTop: '8px' } }, el('span.badge.b-info', { text: 'recommends: ' + cdtPick })));
      cols.appendChild(cdt);
      pane.appendChild(cols);

      // verdict
      var conflict = edtPick !== cdtPick;
      pane.appendChild(el('div', { style: { marginTop: '14px' } },
        el('span', { 'class': 'badge ' + (conflict ? 'b-warn' : 'b-ok') },
          conflict ? '⚔ the theories disagree at this accuracy' : 'the theories agree here')));
      pane.appendChild(el('p.muted', { style: { fontSize: '12px', marginTop: '8px' } },
        'CDT two-boxes for any accuracy above chance (two-boxing strictly dominates: it adds $1,000 whatever the box holds). EDT one-boxes once accuracy clears the break-even point near 50.05%. The empirical fact that committed one-boxers walk away with $1,000,000 is what motivates functional decision theory (FDT) — choosing the decision procedure a predictor would have already modelled, central to AI agent-foundations research.'));
    }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module IV · rational choice' }),
        el('h2', { text: 'Decision theory — from knowledge to action' }),
        el('p', { text: 'Once an agent represents the world (Modules I–III), it must choose. Expected-utility theory ranks acts by Σ P(state)·U(act,state). But "probability of what, given what?" splits the field: evidential decision theory conditions on the act; causal decision theory asks only what the act brings about. Newcomb\u2019s problem is where they part ways.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      var g = el('div.grid', { style: { gridTemplateColumns: '1fr' } }); body.appendChild(g);

      var c1 = el('div.card'); c1.appendChild(el('h3', { text: 'Expected-utility calculator' }));
      refs.eu = el('div'); c1.appendChild(refs.eu); g.appendChild(c1);

      var c2 = el('div.card'); c2.appendChild(el('h3', { text: 'Newcomb\u2019s problem — EDT vs CDT' }));
      c2.appendChild(el('p.muted', { style: { fontSize: '12.5px', marginBottom: '6px' } },
        'A reliable predictor has already placed $1,000,000 in the opaque box if and only if it predicted you would take only that box; the transparent box always holds $1,000. Do you take one box or both?'));
      refs.newcomb = el('div'); c2.appendChild(refs.newcomb); g.appendChild(c2);

      renderEU(); renderNewcomb();
    }
    return { mount: mount };
  }

  LV.register({ id: 'decision', no: 'IV', title: 'Decision theory', sub: 'Expected utility · Newcomb', create: mod });
})();

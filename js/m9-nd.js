/* ===========================================================================
   m9-nd.js — Natural deduction (Fitch-style) proof checker
   Each line carries a formula, a rule, cited line numbers, and a scope depth.
   Assumptions open boxes; introduction rules discharge them. The checker
   verifies every line against the rule, enforces scope/accessibility, and
   reports whether the proof establishes the goal from its premises. The pure
   checker lives on LV.nd and is tested independently of the DOM.
   ========================================================================= */
(function () {
  'use strict';

  var nd = {};
  LV.nd = nd;

  function S(ast) { return LV.show(ast); }
  function isNegOf(x, y) { return x && x.t === 'not' && S(x.a) === S(y); }
  function prefix(a, b) { if (a.length > b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function arrEq(a, b) { return a.length === b.length && a.every(function (v, i) { return v === b[i]; }); }

  // lines: [{formula, rule, cites:[1-based], depth}]   goalStr optional
  nd.check = function (lines, goalStr) {
    var n = lines.length;
    var F = [], err = [], boxes = [], parseErr = [];
    // parse
    for (var i = 0; i < n; i++) {
      try { F[i] = LV.parse(lines[i].formula); parseErr[i] = null; }
      catch (e) { F[i] = null; parseErr[i] = e.message; }
    }
    // scope pass
    var stack = []; // open assumption indices
    var scopeErr = [];
    for (i = 0; i < n; i++) {
      var d = lines[i].depth | 0, rule = lines[i].rule;
      var isAssume = rule === 'assumption';
      var target = isAssume ? d - 1 : d;
      if (target < 0) target = 0;
      while (stack.length > target) stack.pop();
      if (stack.length < target) { scopeErr[i] = 'indentation jumps too deep'; boxes[i] = stack.slice(); }
      else {
        if (isAssume) { boxes[i] = stack.concat([i]); stack.push(i); }
        else boxes[i] = stack.slice();
      }
      if (rule === 'premise' && d !== 0) scopeErr[i] = scopeErr[i] || 'a premise must be at the outermost level';
    }

    function acc(j, i) { return j < i && j >= 0 && prefix(boxes[j], boxes[i]); }
    function enclosing(a) { return boxes[a].slice(0, -1); } // boxes around an assumption, excluding its own
    function inBox(c, a) { return boxes[c].indexOf(a) >= 0; }

    for (i = 0; i < n; i++) {
      if (parseErr[i]) { err[i] = 'parse error: ' + parseErr[i]; continue; }
      if (scopeErr[i]) { err[i] = scopeErr[i]; continue; }
      var L = lines[i], r = L.rule, c = (L.cites || []).map(function (x) { return x - 1; }), e = null;
      var Ai = F[i];
      function need(k) { if (c.length !== k) { e = r + ' needs ' + k + ' citation(s)'; return false; } return true; }
      function valid(idx) { return idx >= 0 && idx < n && F[idx]; }
      switch (r) {
        case 'premise': break;
        case 'assumption': break;
        case 'reit':
          if (!need(1)) break;
          if (!acc(c[0], i)) { e = 'cited line not in scope'; break; }
          if (S(Ai) !== S(F[c[0]])) e = 'reiteration must copy the cited line';
          break;
        case 'andI':
          if (!need(2)) break;
          if (!acc(c[0], i) || !acc(c[1], i)) { e = 'cited line not in scope'; break; }
          if (Ai.t !== 'and' || S(Ai.a) !== S(F[c[0]]) || S(Ai.b) !== S(F[c[1]])) e = 'expected (cite1) ∧ (cite2)';
          break;
        case 'andE':
          if (!need(1)) break;
          if (!acc(c[0], i)) { e = 'cited line not in scope'; break; }
          if (F[c[0]].t !== 'and') { e = 'cited line is not a conjunction'; break; }
          if (S(Ai) !== S(F[c[0]].a) && S(Ai) !== S(F[c[0]].b)) e = 'must be one conjunct of the cited line';
          break;
        case 'orI':
          if (!need(1)) break;
          if (!acc(c[0], i)) { e = 'cited line not in scope'; break; }
          if (Ai.t !== 'or' || (S(Ai.a) !== S(F[c[0]]) && S(Ai.b) !== S(F[c[0]]))) e = 'cited line must be a disjunct of the result';
          break;
        case 'impE':
          if (!need(2)) break;
          if (!acc(c[0], i) || !acc(c[1], i)) { e = 'cited line not in scope'; break; }
          var imp = F[c[0]].t === 'imp' ? F[c[0]] : F[c[1]], ant = F[c[0]].t === 'imp' ? F[c[1]] : F[c[0]];
          if (imp.t !== 'imp') { e = 'no conditional among the cited lines'; break; }
          if (S(ant) !== S(imp.a) || S(Ai) !== S(imp.b)) e = 'modus ponens does not fit';
          break;
        case 'notE':
          if (!need(2)) break;
          if (!acc(c[0], i) || !acc(c[1], i)) { e = 'cited line not in scope'; break; }
          if (Ai.t !== 'bot') { e = 'the result of ¬E must be ⊥'; break; }
          if (!(isNegOf(F[c[0]], F[c[1]]) || isNegOf(F[c[1]], F[c[0]]))) e = 'cited lines are not a formula and its negation';
          break;
        case 'botE':
          if (!need(1)) break;
          if (!acc(c[0], i)) { e = 'cited line not in scope'; break; }
          if (F[c[0]].t !== 'bot') e = '⊥E must cite a line that is ⊥';
          break;
        case 'impI':
          if (!need(2)) break; // [assumption, conclusion]
          var a = c[0], cc = c[1];
          if (!valid(a) || lines[a].rule !== 'assumption') { e = 'first citation must be an assumption'; break; }
          if (!arrEq(enclosing(a), boxes[i])) { e = 'the assumption box is not the one being discharged here'; break; }
          if (!inBox(cc, a)) { e = 'second citation must lie inside the assumption box'; break; }
          if (Ai.t !== 'imp' || S(Ai.a) !== S(F[a]) || S(Ai.b) !== S(F[cc])) e = 'result must be (assumption) → (conclusion)';
          break;
        case 'notI':
          if (!need(2)) break;
          var a2 = c[0], c2 = c[1];
          if (!valid(a2) || lines[a2].rule !== 'assumption') { e = 'first citation must be an assumption'; break; }
          if (!arrEq(enclosing(a2), boxes[i])) { e = 'wrong assumption box for ¬I'; break; }
          if (!inBox(c2, a2)) { e = 'second citation must be inside the box'; break; }
          if (F[c2].t !== 'bot') { e = 'the box must end in ⊥'; break; }
          if (Ai.t !== 'not' || S(Ai.a) !== S(F[a2])) e = 'result must be ¬(assumption)';
          break;
        case 'raa':
          if (!need(2)) break;
          var a3 = c[0], c3 = c[1];
          if (!valid(a3) || lines[a3].rule !== 'assumption') { e = 'first citation must be an assumption'; break; }
          if (F[a3].t !== 'not') { e = 'reductio assumes a negation ¬φ'; break; }
          if (!arrEq(enclosing(a3), boxes[i])) { e = 'wrong assumption box for RAA'; break; }
          if (!inBox(c3, a3)) { e = 'second citation must be inside the box'; break; }
          if (F[c3].t !== 'bot') { e = 'the box must end in ⊥'; break; }
          if (S(Ai) !== S(F[a3].a)) e = 'result must be φ (where the assumption was ¬φ)';
          break;
        case 'orE':
          if (!need(5)) break; // [disj, assume1, concl1, assume2, concl2]
          var dj = c[0], aA = c[1], cA = c[2], aB = c[3], cB = c[4];
          if (!acc(dj, i) || F[dj].t !== 'or') { e = 'first citation must be a disjunction in scope'; break; }
          if (lines[aA].rule !== 'assumption' || lines[aB].rule !== 'assumption') { e = 'citations 2 and 4 must be assumptions'; break; }
          if (S(F[aA]) !== S(F[dj].a) || S(F[aB]) !== S(F[dj].b)) { e = 'the two assumptions must be the two disjuncts'; break; }
          if (!arrEq(enclosing(aA), boxes[i]) || !arrEq(enclosing(aB), boxes[i])) { e = 'both case-boxes must discharge here'; break; }
          if (!inBox(cA, aA) || !inBox(cB, aB)) { e = 'each conclusion must be inside its case-box'; break; }
          if (S(Ai) !== S(F[cA]) || S(Ai) !== S(F[cB])) e = 'both cases must conclude the result';
          break;
        default: e = 'unknown rule';
      }
      err[i] = e;
    }

    // does it prove the goal?
    var allOk = err.every(function (x) { return !x; });
    var lastDepth0 = n > 0 && lines[n - 1].depth === 0 && (boxes[n - 1] || []).length === 0;
    var proves = false, goalAst = null;
    if (goalStr) { try { goalAst = LV.parse(goalStr); } catch (e2) { } }
    if (allOk && lastDepth0 && goalAst && F[n - 1]) proves = S(F[n - 1]) === S(goalAst);
    var premises = lines.filter(function (l) { return l.rule === 'premise'; }).map(function (l) { return l.formula; });
    return { errors: err, boxes: boxes, allOk: allOk, proves: proves, premises: premises };
  };

  /* ---------------------- UI ---------------------- */
  var el = LV.el;
  var RULES = [
    ['premise', 'Premise'], ['assumption', 'Assumption'], ['reit', 'Reiteration'],
    ['andI', '∧I'], ['andE', '∧E'], ['orI', '∨I'], ['orE', '∨E (5 cites)'],
    ['impI', '→I (discharge)'], ['impE', '→E (MP)'],
    ['notE', '¬E'], ['notI', '¬I (discharge)'], ['botE', '⊥E'], ['raa', 'RAA (¬φ⊢⊥ ⟹ φ)']
  ];

  var EXAMPLES = {
    'p → p': [
      { formula: 'p', rule: 'assumption', cites: [], depth: 1 },
      { formula: 'p → p', rule: 'impI', cites: [1, 1], depth: 0 }
    ],
    '(p ∧ q) → (q ∧ p)': [
      { formula: 'p ∧ q', rule: 'assumption', cites: [], depth: 1 },
      { formula: 'p', rule: 'andE', cites: [1], depth: 1 },
      { formula: 'q', rule: 'andE', cites: [1], depth: 1 },
      { formula: 'q ∧ p', rule: 'andI', cites: [3, 2], depth: 1 },
      { formula: '(p ∧ q) → (q ∧ p)', rule: 'impI', cites: [1, 4], depth: 0 }
    ],
    '¬(p ∧ ¬p)': [
      { formula: 'p ∧ ¬p', rule: 'assumption', cites: [], depth: 1 },
      { formula: 'p', rule: 'andE', cites: [1], depth: 1 },
      { formula: '¬p', rule: 'andE', cites: [1], depth: 1 },
      { formula: '⊥', rule: 'notE', cites: [2, 3], depth: 1 },
      { formula: '¬(p ∧ ¬p)', rule: 'notI', cites: [1, 4], depth: 0 }
    ],
    '¬¬p ⊢ p (classical)': [
      { formula: '¬¬p', rule: 'premise', cites: [], depth: 0 },
      { formula: '¬p', rule: 'assumption', cites: [], depth: 1 },
      { formula: '⊥', rule: 'notE', cites: [1, 2], depth: 1 },
      { formula: 'p', rule: 'raa', cites: [2, 3], depth: 0 }
    ]
  };

  function mod() {
    var refs = {}, lines = JSON.parse(JSON.stringify(EXAMPLES['(p ∧ q) → (q ∧ p)'])), goal = '(p ∧ q) → (q ∧ p)';

    function render() {
      var pane = refs.proof; LV.clear(pane);
      lines.forEach(function (L, i) {
        var rowOk = null;
        var row = el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' } });
        row.appendChild(el('span.mono', { style: { width: '22px', color: 'var(--muted)', fontSize: '12px', textAlign: 'right' }, text: String(i + 1) }));
        // indentation (Fitch boxes)
        var indent = el('div', { style: { display: 'flex' } });
        for (var b = 0; b < L.depth; b++) indent.appendChild(el('span', { style: { width: '14px', alignSelf: 'stretch', borderLeft: '2px solid var(--accent)', marginLeft: '2px' } }));
        row.appendChild(indent);
        // depth controls
        var minus = el('button.btn', { text: '⊟', style: { padding: '2px 6px' } }); minus.addEventListener('click', function () { L.depth = Math.max(0, L.depth - 1); render(); });
        var plus = el('button.btn', { text: '⊞', style: { padding: '2px 6px' } }); plus.addEventListener('click', function () { L.depth = L.depth + 1; render(); });
        row.appendChild(minus); row.appendChild(plus);
        // formula
        var fin = el('input', { type: 'text', value: L.formula, style: { width: '150px', fontSize: '13px' } });
        fin.addEventListener('input', function () { L.formula = fin.value; });
        row.appendChild(fin);
        // rule
        var sel = el('select', { style: { fontSize: '12px' } });
        RULES.forEach(function (r) { var o = el('option', { value: r[0], text: r[1] }); if (L.rule === r[0]) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', function () { L.rule = sel.value; });
        row.appendChild(sel);
        // cites
        var cin = el('input', { type: 'text', value: (L.cites || []).join(','), placeholder: 'lines', style: { width: '74px', fontSize: '12px' } });
        cin.addEventListener('input', function () { L.cites = cin.value.split(',').map(function (x) { return parseInt(x.trim(), 10); }).filter(function (x) { return !isNaN(x); }); });
        row.appendChild(cin);
        // delete
        var del = el('button.btn', { text: '×', style: { padding: '2px 7px' } }); del.addEventListener('click', function () { lines.splice(i, 1); render(); });
        row.appendChild(del);
        // status
        refs.statusCells = refs.statusCells || {};
        var st = el('span', { style: { width: '20px', textAlign: 'center', fontWeight: '700' } }); st.dataset.line = i; row.appendChild(st);
        pane.appendChild(row);
      });
      var add = el('button.btn', { text: '+ line', style: { marginTop: '8px' } });
      add.addEventListener('click', function () { lines.push({ formula: '', rule: 'reit', cites: [], depth: lines.length ? lines[lines.length - 1].depth : 0 }); render(); });
      pane.appendChild(add);
    }

    function doCheck() {
      var res = nd.check(lines, refs.goal.value.trim());
      // annotate status per row
      var rows = refs.proof.querySelectorAll('span[data-line]');
      rows.forEach(function (st) {
        var i = +st.dataset.line, e = res.errors[i];
        st.textContent = e ? '✗' : '✓';
        st.style.color = e ? 'var(--accent2)' : 'var(--accent3)';
        st.title = e || 'ok';
      });
      LV.clear(refs.verdict);
      // list any errors
      var errs = res.errors.map(function (e, i) { return e ? (i + 1) + ': ' + e : null; }).filter(Boolean);
      if (errs.length) {
        refs.verdict.appendChild(el('span.badge.b-no', { text: errs.length + ' line(s) need fixing' }));
        var ul = el('div', { style: { marginTop: '6px' } });
        errs.forEach(function (m) { ul.appendChild(el('div.mono', { style: { fontSize: '11.5px', color: 'var(--accent2)' }, text: '• line ' + m })); });
        refs.verdict.appendChild(ul);
      } else {
        refs.verdict.appendChild(el('span', { 'class': 'badge ' + (res.proves ? 'b-ok' : 'b-warn'),
          text: res.proves ? '✓ valid proof — establishes the goal' : '✓ every line checks; final line does not match the goal (or undischarged assumptions remain)' }));
        if (res.premises.length) refs.verdict.appendChild(el('p.muted', { style: { fontSize: '12px', marginTop: '6px' }, text: 'from premises: ' + res.premises.join(', ') }));
      }
    }

    function load(name) { lines = JSON.parse(JSON.stringify(EXAMPLES[name])); goal = name.replace(/ ⊢.*| \(classical\)/, ''); refs.goal.value = goal === '¬¬p' ? 'p' : goal; render(); LV.clear(refs.verdict); }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module II · foundations · proof theory' }),
        el('h2', { text: 'Natural deduction — a proof checker' }),
        el('p', { text: 'Where Module I gives meaning (semantics), this gives derivation (syntax). Build a Fitch-style proof: assumptions open boxes drawn as vertical rules, and introduction rules discharge them. The checker validates every line against its rule, enforces that citations stay in scope, and reports whether the proof actually establishes the goal.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      var ex = el('div.btn-row', { style: { marginBottom: '14px' } });
      ex.appendChild(el('span.mono', { style: { fontSize: '11px', color: 'var(--muted)' }, text: 'load:' }));
      Object.keys(EXAMPLES).forEach(function (k) { var b = el('button.btn', { text: k }); b.addEventListener('click', function () { load(k); }); ex.appendChild(b); });
      body.appendChild(ex);

      var goalRow = el('div.btn-row', { style: { marginBottom: '12px' } });
      goalRow.appendChild(el('label.lab', { text: 'goal:' }));
      refs.goal = el('input', { type: 'text', value: goal, style: { width: '260px' } });
      goalRow.appendChild(refs.goal);
      var chk = el('button.btn.primary', { text: '✓ check proof' }); chk.addEventListener('click', doCheck); goalRow.appendChild(chk);
      body.appendChild(goalRow);

      var card = el('div.card');
      card.appendChild(el('h4', { text: 'proof  ·  ⊞/⊟ set box depth · cite line numbers comma-separated' }));
      refs.proof = el('div', { style: { fontFamily: 'var(--mono)' } }); card.appendChild(refs.proof);
      body.appendChild(card);

      refs.verdict = el('div', { style: { marginTop: '14px' } }); body.appendChild(refs.verdict);

      body.appendChild(el('div.card', { style: { marginTop: '18px' } },
        el('h4', { text: 'rules' }),
        el('p.muted', { style: { fontSize: '12px' } },
          'Discharge rules (→I, ¬I, RAA, ∨E) cite an assumption line and a line inside its box. For →I cite [assumption, conclusion]; for ¬I and RAA cite [assumption, the ⊥ line]; for ∨E cite [disjunction, assume-left, concl-left, assume-right, concl-right]. Type ⊥ for absurdity (or load an example to see the shapes).')));

      render(); doCheck();
    }
    return { mount: mount };
  }

  LV.register({ id: 'nd', no: 'II', title: 'Natural deduction', sub: 'Fitch proofs · scope · discharge', create: mod });
})();

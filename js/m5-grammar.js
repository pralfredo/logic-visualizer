/* ===========================================================================
   m5-grammar.js — Gavagai → full grammar
   Two faces of the same epistemological problem: data underdetermines theory.
   (1) Quine's "gavagai": a single ostension is compatible with mutually
       incompatible reference schemes (rabbit / undetached parts / time-slice /
       rabbithood). Adding "experiments" fails to discriminate them — the
       indeterminacy of translation.
   (2) Grammar induction: from example strings, infer the language. Several
       grammars stay consistent with any finite positive sample; only negative
       evidence (or a built-in simplicity / subset bias — read: Universal
       Grammar) forces convergence. This is Gold's theorem made tangible, and
       the formal echo of the gavagai problem.
   ========================================================================= */
(function () {
  'use strict';
  var el = LV.el;

  /* ---- candidate grammars over alphabet {a,b} ---- */
  var GRAMMARS = [
    { name: 'a*', desc: 'any run of a\u2019s', acc: function (s) { return /^a*$/.test(s); }, kind: 'regular' },
    { name: 'a*b*', desc: 'a\u2019s then b\u2019s', acc: function (s) { return /^a*b*$/.test(s); }, kind: 'regular' },
    { name: '(ab)*', desc: 'repeated ab', acc: function (s) { return /^(ab)*$/.test(s); }, kind: 'regular' },
    { name: 'aⁿbⁿ', desc: 'equal a\u2019s then b\u2019s', acc: function (s) { return /^a*b*$/.test(s) && (s.match(/a/g) || []).length === (s.match(/b/g) || []).length; }, kind: 'context-free' },
    { name: 'Σ*', desc: 'every string', acc: function (s) { return /^[ab]*$/.test(s); }, kind: 'regular (universal)' }
  ];

  // enumerate all strings over {a,b} up to length N — used to size each language
  function corpus(N) {
    var out = ['']; for (var len = 1; len <= N; len++) {
      var prev = out.filter(function (x) { return x.length === len - 1; });
      prev.forEach(function (p) { out.push(p + 'a'); out.push(p + 'b'); });
    }
    return out;
  }
  var CORP = corpus(6);

  function mod() {
    var refs = {};
    var pos = ['', 'ab', 'aabb'], neg = []; // start consistent with several grammars

    /* ---- gavagai hypotheses ---- */
    var GAV = [
      { name: 'rabbit', desc: 'the whole enduring animal' },
      { name: 'undetached rabbit-parts', desc: 'the fused collection of parts' },
      { name: 'rabbit time-slice', desc: 'a momentary stage of a rabbit' },
      { name: 'rabbithood', desc: 'the abstract universal, instantiated here' },
      { name: '\u201clo, dinner!\u201d', desc: 'a one-word observation sentence' }
    ];
    var experiments = []; // each fails to discriminate, by construction
    var EXPS = [
      'Point at the rabbit and say "gavagai?" — native assents.',
      'Point at a different rabbit — native assents again.',
      'Point at a rabbit\u2019s ear alone — native assents (parts? or still "rabbit there"?).',
      'Wait a moment, point at the same rabbit — native assents (same object? new stage?).'
    ];

    function renderGav() {
      var pane = refs.gav; LV.clear(pane);
      // each hypothesis is still alive: ostension can't separate co-extensive schemes
      GAV.forEach(function (h) {
        pane.appendChild(el('div.hyp', null,
          el('div', { style: { flex: '1' } },
            el('div.h-name', { text: h.name }),
            el('div.h-desc', { text: h.desc })),
          el('span.badge.b-warn', { text: 'still compatible' })));
      });
      LV.clear(refs.expLog);
      experiments.forEach(function (e) { refs.expLog.appendChild(el('div', { style: { fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: '4px' }, text: '· ' + e })); });
      if (experiments.length) refs.expLog.appendChild(el('div.badge.b-no', { style: { marginTop: '4px' }, text: 'after ' + experiments.length + ' experiment(s): ' + GAV.length + ' hypotheses survive — translation underdetermined' }));
    }

    /* ---- grammar induction ---- */
    function consistent(g) {
      return pos.every(function (s) { return g.acc(s); }) && neg.every(function (s) { return !g.acc(s); });
    }
    function size(g) { return CORP.filter(function (s) { return g.acc(s); }).length; } // language size up to len 6

    function renderGrammar() {
      // examples
      LV.clear(refs.posChips); LV.clear(refs.negChips);
      pos.forEach(function (s, i) { refs.posChips.appendChild(chip(s || 'ε', 'pos', function () { pos.splice(i, 1); renderGrammar(); })); });
      neg.forEach(function (s, i) { refs.negChips.appendChild(chip(s || 'ε', 'neg', function () { neg.splice(i, 1); renderGrammar(); })); });

      var alive = GRAMMARS.filter(consistent);
      var minSize = alive.length ? Math.min.apply(null, alive.map(size)) : Infinity;

      LV.clear(refs.hyps);
      GRAMMARS.forEach(function (g) {
        var ok = consistent(g), isBest = ok && size(g) === minSize;
        var row = el('div', { 'class': 'hyp' + (ok ? '' : ' dead') + (isBest ? ' best' : '') },
          el('div', { style: { flex: '1' } },
            el('div.h-name', { text: g.name }),
            el('div.h-desc', { text: g.desc + ' · ' + g.kind })),
          el('span.muted', { style: { fontFamily: 'var(--mono)', fontSize: '11px' }, text: size(g) + ' strings ≤6' }),
          el('span', { 'class': 'badge ' + (ok ? (isBest ? 'b-ok' : 'b-info') : 'b-no'), text: ok ? (isBest ? 'subset pick' : 'consistent') : 'refuted' }));
        refs.hyps.appendChild(row);
      });

      // verdict
      LV.clear(refs.verdict);
      var nAlive = alive.length;
      var msg, cls;
      if (nAlive === 0) { msg = 'No candidate grammar fits — the data is contradictory or outside the hypothesis class.'; cls = 'b-no'; }
      else if (nAlive === 1) { msg = 'Exactly one grammar survives: the language is identified.'; cls = 'b-ok'; }
      else { msg = nAlive + ' grammars remain consistent. With this data alone the language is NOT determined.'; cls = 'b-warn'; }
      refs.verdict.appendChild(el('span', { 'class': 'badge ' + cls, text: msg }));
      var hasNeg = neg.length > 0;
      refs.verdict.appendChild(el('p.muted', { style: { fontSize: '12.5px', marginTop: '8px' } },
        hasNeg
          ? 'Negative examples eliminate the over-general grammars (Σ* in particular). This is why explicit correction is so powerful — and why its scarcity in child language acquisition motivates an innate bias.'
          : 'Notice that Σ* is never refuted by positive data: no string you can show is outside it. Gold\u2019s theorem says no learner can identify a superfinite class from positive examples alone. To converge, a learner must add a prior — the subset principle (prefer the smallest consistent language), which here is highlighted as the "subset pick". That prior is not read off the data; it is the formal counterpart of Quine\u2019s analytical hypotheses and of Universal Grammar.'));
    }

    function chip(label, cls, onx) {
      var c = el('span', { 'class': 'chip ' + cls });
      c.appendChild(el('span', { text: label }));
      var x = el('span', { style: { cursor: 'pointer', marginLeft: '6px', opacity: '.6' }, text: '×' }); x.addEventListener('click', onx);
      c.appendChild(x); return c;
    }

    /* sample from a hidden target language */
    function sample(targetName, polarity) {
      var g = GRAMMARS.find(function (x) { return x.name === targetName; });
      var pool = CORP.filter(function (s) { return polarity === '+' ? g.acc(s) : !g.acc(s); });
      // prefer shorter, unseen strings
      pool.sort(function (a, b) { return a.length - b.length; });
      pool = pool.filter(function (s) { return pos.indexOf(s) < 0 && neg.indexOf(s) < 0; });
      if (!pool.length) return;
      var pick = pool[Math.floor(Math.random() * Math.min(pool.length, 4))];
      if (polarity === '+') pos.push(pick); else neg.push(pick);
      renderGrammar();
    }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module IX · learning & meaning' }),
        el('h2', { text: 'Gavagai → full grammar' }),
        el('p', { text: 'A native says "gavagai" as a rabbit darts past. What does the word mean? Quine\u2019s point is that no amount of pointing settles it. The same underdetermination is provable for grammar: from finitely many example sentences, several grammars always remain consistent. Convergence requires either negative evidence or a built-in inductive bias — the formal shadow of innate structure.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      // PART 1 — gavagai
      var p1 = el('div.card', { style: { marginBottom: '22px' } });
      p1.appendChild(el('h3', { text: '1 · Radical translation — the indeterminacy of reference' }));
      var scene = el('div.scene');
      scene.appendChild(el('div', { style: { fontSize: '46px' } }, '🐇'));
      scene.appendChild(el('div.utterance', { text: '\u201cGavagai!\u201d' }));
      p1.appendChild(scene);
      var sp = el('div.split-even', { style: { marginTop: '16px' } });
      var left = el('div'); left.appendChild(el('h4', { text: 'co-extensive hypotheses' })); refs.gav = el('div'); left.appendChild(refs.gav); sp.appendChild(left);
      var right = el('div');
      right.appendChild(el('h4', { text: 'run an experiment' }));
      var eb = el('button.btn', { text: '👉 point and query' });
      eb.addEventListener('click', function () { if (experiments.length < EXPS.length) experiments.push(EXPS[experiments.length]); renderGav(); });
      right.appendChild(eb);
      refs.expLog = el('div', { style: { marginTop: '10px' } }); right.appendChild(refs.expLog);
      sp.appendChild(right);
      p1.appendChild(sp);
      body.appendChild(p1);

      // PART 2 — grammar induction
      var p2 = el('div.card');
      p2.appendChild(el('h3', { text: '2 · From examples to a grammar — identification in the limit' }));

      var ctrls = el('div', { style: { marginBottom: '14px' } });
      var inputRow = el('div.btn-row');
      refs.strInput = el('input', { type: 'text', value: 'abab', placeholder: 'string over {a,b}', style: { width: '160px' } });
      inputRow.appendChild(refs.strInput);
      var addPos = el('button.btn', { text: '+ positive' }); addPos.addEventListener('click', function () { var s = refs.strInput.value.replace(/[^ab]/g, ''); if (pos.indexOf(s) < 0) pos.push(s); renderGrammar(); });
      var addNeg = el('button.btn', { text: '− negative' }); addNeg.addEventListener('click', function () { var s = refs.strInput.value.replace(/[^ab]/g, ''); if (neg.indexOf(s) < 0) neg.push(s); renderGrammar(); });
      inputRow.appendChild(addPos); inputRow.appendChild(addNeg);
      ctrls.appendChild(inputRow);

      var sampleRow = el('div.btn-row', { style: { marginTop: '10px' } });
      sampleRow.appendChild(el('label.lab', { text: 'sample from hidden target:' }));
      ['a*b*', '(ab)*', 'aⁿbⁿ'].forEach(function (tn) {
        var bp = el('button.btn', { text: tn + ' +' }); bp.addEventListener('click', function () { sample(tn, '+'); });
        var bn = el('button.btn', { text: tn + ' −' }); bn.addEventListener('click', function () { sample(tn, '-'); });
        sampleRow.appendChild(bp); sampleRow.appendChild(bn);
      });
      var clr = el('button.btn', { text: 'clear' }); clr.addEventListener('click', function () { pos = []; neg = []; renderGrammar(); });
      sampleRow.appendChild(clr);
      ctrls.appendChild(sampleRow);
      p2.appendChild(ctrls);

      var exWrap = el('div.split-even');
      var pe = el('div'); pe.appendChild(el('h4', { text: 'positive examples (∈ L)' })); refs.posChips = el('div'); pe.appendChild(refs.posChips); exWrap.appendChild(pe);
      var ne = el('div'); ne.appendChild(el('h4', { text: 'negative examples (∉ L)' })); refs.negChips = el('div'); ne.appendChild(refs.negChips); exWrap.appendChild(ne);
      p2.appendChild(exWrap);

      p2.appendChild(el('h4', { text: 'hypothesis space', style: { marginTop: '16px' } }));
      refs.hyps = el('div'); p2.appendChild(refs.hyps);
      refs.verdict = el('div', { style: { marginTop: '10px' } }); p2.appendChild(refs.verdict);
      body.appendChild(p2);

      renderGav(); renderGrammar();
    }

    return { mount: mount };
  }

  LV.register({ id: 'grammar', no: 'IX', title: 'Gavagai → grammar', sub: 'Indeterminacy · Gold\u2019s theorem', create: mod });
})();

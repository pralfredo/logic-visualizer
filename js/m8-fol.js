/* ===========================================================================
   m8-fol.js — First-order logic: models & satisfaction
   A finite structure M = (domain, interpretation of constants, predicates,
   relations). The user edits the structure; the engine evaluates any
   first-order formula with ∀ / ∃ / = / connectives by recursion over the
   finite domain, reporting truth for closed formulas and the satisfying
   assignments for open ones. Pure logic lives on LV.fol so it can be tested
   independently of the DOM.
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------- pure logic: LV.fol ---------------------- */
  var fol = {};
  LV.fol = fol;

  fol.normalize = function (s) {
    return s
      .replace(/<->/g, '↔').replace(/<=>/g, '↔')
      .replace(/->/g, '→').replace(/=>/g, '→')
      .replace(/\bforall\b/gi, '∀').replace(/\bexists\b/gi, '∃')
      .replace(/\ball\b/gi, '∀').replace(/\bsome\b/gi, '∃')
      .replace(/[!~]/g, '¬').replace(/&/g, '∧').replace(/\|/g, '∨');
  };

  fol.tokenize = function (s) {
    s = fol.normalize(s);
    var toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if ('()¬∧∨→↔∀∃=,'.indexOf(c) >= 0) { toks.push({ k: c }); i++; continue; }
      if (/[A-Z]/.test(c)) { toks.push({ k: 'pred', name: c }); i++; continue; }
      if (/[a-z]/.test(c)) { toks.push({ k: 'term', name: c }); i++; continue; }
      throw new Error('unexpected "' + c + '"');
    }
    return toks;
  };

  fol.parse = function (str) {
    var toks = fol.tokenize(str), pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function expect(k) { var t = next(); if (!t || t.k !== k) throw new Error('expected ' + k); return t; }
    function iff() { var a = imp(); while (peek() && peek().k === '↔') { next(); a = { t: 'iff', a: a, b: imp() }; } return a; }
    function imp() { var a = or(); if (peek() && peek().k === '→') { next(); return { t: 'imp', a: a, b: imp() }; } return a; }
    function or() { var a = and(); while (peek() && peek().k === '∨') { next(); a = { t: 'or', a: a, b: and() }; } return a; }
    function and() { var a = un(); while (peek() && peek().k === '∧') { next(); a = { t: 'and', a: a, b: un() }; } return a; }
    function un() {
      var t = peek(); if (!t) throw new Error('unexpected end');
      if (t.k === '¬') { next(); return { t: 'not', a: un() }; }
      if (t.k === '∀' || t.k === '∃') {
        next(); var v = expect('term').name; return { t: t.k === '∀' ? 'all' : 'exists', v: v, a: iff() };
      }
      return atom();
    }
    function term() { var t = expect('term'); return { name: t.name }; }
    function atom() {
      var t = peek(); if (!t) throw new Error('unexpected end');
      if (t.k === '(') { next(); var e = iff(); expect(')'); return e; }
      if (t.k === 'pred') {
        next(); expect('('); var args = [term()];
        while (peek() && peek().k === ',') { next(); args.push(term()); }
        expect(')'); return { t: 'pred', name: t.name, args: args };
      }
      if (t.k === 'term') { var a = term(); expect('='); var b = term(); return { t: 'eq', a: a, b: b }; }
      throw new Error('unexpected token');
    }
    var ast = iff(); if (pos < toks.length) throw new Error('trailing input'); return ast;
  };

  fol.freeVars = function (ast, M) {
    var consts = M ? M.consts : {};
    var out = {};
    (function walk(n, bound) {
      if (!n) return;
      if (n.t === 'pred') { n.args.forEach(function (a) { if (!(a.name in consts) && bound.indexOf(a.name) < 0) out[a.name] = 1; }); return; }
      if (n.t === 'eq') { [n.a, n.b].forEach(function (a) { if (!(a.name in consts) && bound.indexOf(a.name) < 0) out[a.name] = 1; }); return; }
      if (n.t === 'all' || n.t === 'exists') { walk(n.a, bound.concat([n.v])); return; }
      if (n.a) walk(n.a, bound); if (n.b) walk(n.b, bound);
    })(ast, []);
    return Object.keys(out).sort();
  };

  function termVal(t, g, M) { return (t.name in M.consts) ? M.consts[t.name] : g[t.name]; }

  fol.evalUnder = function (ast, g, M) {
    function ev(n) {
      switch (n.t) {
        case 'pred': {
          var p = M.preds[n.name];
          if (!p) throw new Error('unknown predicate ' + n.name);
          if (p.arity !== n.args.length) throw new Error(n.name + ' expects ' + p.arity + ' argument(s)');
          var vals = n.args.map(function (a) { return termVal(a, g, M); });
          if (vals.some(function (v) { return v === undefined; })) throw new Error('unbound variable');
          return p.ext.indexOf(vals.join('|')) >= 0;
        }
        case 'eq': return termVal(n.a, g, M) === termVal(n.b, g, M);
        case 'not': return !ev(n.a);
        case 'and': return ev(n.a) && ev(n.b);
        case 'or': return ev(n.a) || ev(n.b);
        case 'imp': return !ev(n.a) || ev(n.b);
        case 'iff': return ev(n.a) === ev(n.b);
        case 'all': return M.domain.every(function (d) { var g2 = Object.assign({}, g); g2[n.v] = d; return fol.evalUnder(n.a, g2, M); });
        case 'exists': return M.domain.some(function (d) { var g2 = Object.assign({}, g); g2[n.v] = d; return fol.evalUnder(n.a, g2, M); });
      }
      throw new Error('bad node ' + n.t);
    }
    return ev(ast);
  };

  fol.satisfy = function (ast, M) {
    var free = fol.freeVars(ast, M);
    if (!free.length) return { closed: true, value: fol.evalUnder(ast, {}, M) };
    var rows = [];
    (function rec(idx, g) {
      if (idx === free.length) { if (fol.evalUnder(ast, g, M)) rows.push(Object.assign({}, g)); return; }
      M.domain.forEach(function (d) { var g2 = Object.assign({}, g); g2[free[idx]] = d; rec(idx + 1, g2); });
    })(0, {});
    return { closed: false, free: free, rows: rows };
  };

  fol.show = function (ast) {
    function p(n, pr) {
      var prec = { iff: 1, imp: 2, or: 3, and: 4 };
      function w(x, s) { return x < pr ? '(' + s + ')' : s; }
      switch (n.t) {
        case 'pred': return n.name + '(' + n.args.map(function (a) { return a.name; }).join(',') + ')';
        case 'eq': return n.a.name + '=' + n.b.name;
        case 'not': return '¬' + p(n.a, 5);
        case 'all': return '∀' + n.v + ' ' + p(n.a, 2);
        case 'exists': return '∃' + n.v + ' ' + p(n.a, 2);
        case 'and': return w(4, p(n.a, 4) + ' ∧ ' + p(n.b, 4));
        case 'or': return w(3, p(n.a, 3) + ' ∨ ' + p(n.b, 3));
        case 'imp': return w(2, p(n.a, 3) + ' → ' + p(n.b, 2));
        case 'iff': return w(1, p(n.a, 2) + ' ↔ ' + p(n.b, 1));
      }
      return '?';
    }
    return p(ast, 0);
  };

  /* ---------------------- UI module ---------------------- */
  var el = LV.el;

  function defaultModel() {
    return {
      domain: ['1', '2', '3', '4'],
      consts: { a: '1', b: '4' },
      preds: {
        P: { arity: 1, ext: ['2', '4'] },              // "even"
        Q: { arity: 1, ext: ['1'] },                    // "is the first"
        R: { arity: 2, ext: ['1|2', '1|3', '1|4', '2|3', '2|4', '3|4'] } // "<"
      }
    };
  }

  function mod() {
    var M = defaultModel(), refs = {}, canvas, ctx;

    function toggleUnary(p, e) { var ext = M.preds[p].ext, i = ext.indexOf(e); if (i >= 0) ext.splice(i, 1); else ext.push(e); refresh(); }
    function toggleBinary(x, y) { var ext = M.preds.R.ext, k = x + '|' + y, i = ext.indexOf(k); if (i >= 0) ext.splice(i, 1); else ext.push(k); refresh(); }

    function setDomain(n) {
      M.domain = []; for (var i = 1; i <= n; i++) M.domain.push(String(i));
      // prune interpretations to current domain
      ['P', 'Q'].forEach(function (p) { M.preds[p].ext = M.preds[p].ext.filter(function (e) { return M.domain.indexOf(e) >= 0; }); });
      M.preds.R.ext = M.preds.R.ext.filter(function (k) { var ab = k.split('|'); return M.domain.indexOf(ab[0]) >= 0 && M.domain.indexOf(ab[1]) >= 0; });
      ['a', 'b'].forEach(function (c) { if (M.domain.indexOf(M.consts[c]) < 0) M.consts[c] = M.domain[0]; });
      refresh();
    }

    function evaluate() {
      var raw = refs.formula.value.trim(); LV.clear(refs.out);
      if (!raw) return;
      var ast; try { ast = fol.parse(raw); } catch (e) { refs.out.appendChild(el('span.badge.b-no', { text: '⚠ ' + e.message })); return; }
      var res;
      try { res = fol.satisfy(ast, M); } catch (e) { refs.out.appendChild(el('span.badge.b-no', { text: '⚠ ' + e.message })); return; }
      if (res.closed) {
        refs.out.appendChild(el('span', { 'class': 'badge ' + (res.value ? 'b-ok' : 'b-no'), text: res.value ? '✓ true in M' : '✗ false in M' }));
        refs.out.appendChild(el('span.mono', { style: { marginLeft: '10px', fontSize: '12px', color: 'var(--muted)' }, text: fol.show(ast) }));
      } else {
        refs.out.appendChild(el('div.mono', { style: { fontSize: '12px', marginBottom: '6px' }, text: 'free variable(s): ' + res.free.join(', ') }));
        if (!res.rows.length) refs.out.appendChild(el('span.badge.b-no', { text: 'no satisfying assignment' }));
        else {
          var t = el('table.tbl');
          t.appendChild(el('tr', null, ...res.free.map(function (v) { return el('th', { text: v }); }), el('th', { text: 'satisfies?' })));
          res.rows.forEach(function (g) {
            t.appendChild(el('tr', null, ...res.free.map(function (v) { return el('td', { text: g[v] }); }), el('td', { 'class': 'tag-ok', text: '✓' })));
          });
          refs.out.appendChild(t);
        }
      }
    }

    function refresh() { renderStructure(); evaluate(); draw(); }

    function renderStructure() {
      var P = refs.struct; LV.clear(P);
      // domain size control
      var dn = el('div.btn-row', { style: { marginBottom: '10px' } });
      dn.appendChild(el('label.lab', { text: 'domain |D| =' }));
      [2, 3, 4, 5, 6].forEach(function (n) {
        var b = el('button.btn', { text: String(n) }); if (M.domain.length === n) b.classList.add('active');
        b.addEventListener('click', function () { setDomain(n); }); dn.appendChild(b);
      });
      P.appendChild(dn);
      // unary predicates table
      var t = el('table.tbl');
      t.appendChild(el('tr', null, el('th', { text: 'elem' }), el('th', { text: 'P (unary)' }), el('th', { text: 'Q (unary)' })));
      M.domain.forEach(function (e) {
        var row = el('tr', null, el('td', { text: e }));
        ['P', 'Q'].forEach(function (p) {
          var cb = el('input', { type: 'checkbox' }); cb.checked = M.preds[p].ext.indexOf(e) >= 0;
          cb.addEventListener('change', function () { toggleUnary(p, e); });
          row.appendChild(el('td', null, cb));
        });
        t.appendChild(row);
      });
      P.appendChild(t);
      // binary relation R grid
      P.appendChild(el('h4', { text: 'R(x, y) — binary', style: { marginTop: '12px' } }));
      var g = el('table.tbl');
      var head = el('tr', null, el('th', { text: 'x \\ y' }));
      M.domain.forEach(function (y) { head.appendChild(el('th', { text: y })); });
      g.appendChild(head);
      M.domain.forEach(function (x) {
        var row = el('tr', null, el('th', { text: x }));
        M.domain.forEach(function (y) {
          var cb = el('input', { type: 'checkbox' }); cb.checked = M.preds.R.ext.indexOf(x + '|' + y) >= 0;
          cb.addEventListener('change', function () { toggleBinary(x, y); });
          row.appendChild(el('td', null, cb));
        });
        g.appendChild(row);
      });
      P.appendChild(g);
      // constants
      P.appendChild(el('h4', { text: 'constants', style: { marginTop: '12px' } }));
      var cr = el('div.btn-row');
      ['a', 'b'].forEach(function (c) {
        var sel = el('select');
        M.domain.forEach(function (e) { var o = el('option', { value: e, text: e }); if (M.consts[c] === e) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', function () { M.consts[c] = sel.value; refresh(); });
        cr.appendChild(el('label.lab', { text: c + ' =' })); cr.appendChild(sel);
      });
      P.appendChild(cr);
    }

    function resize() { if (!canvas) return; canvas.width = canvas.parentElement.clientWidth; canvas.height = 300; draw(); }
    function nodePos(i, n, w, h) { var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.34; var ang = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; }
    function draw() {
      if (!ctx) return; var C = LV.theme(), w = canvas.width, h = canvas.height, n = M.domain.length;
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      var pos = M.domain.map(function (_, i) { return nodePos(i, n, w, h); });
      // R arrows
      M.preds.R.ext.forEach(function (k) {
        var ab = k.split('|'), i = M.domain.indexOf(ab[0]), j = M.domain.indexOf(ab[1]); if (i < 0 || j < 0) return;
        if (i === j) { // self loop
          var p = pos[i]; ctx.strokeStyle = C.accent3; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0] + 22, p[1] - 22, 12, 0, Math.PI * 2); ctx.stroke(); return;
        }
        var a = pos[i], b = pos[j]; var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
        var mutual = M.preds.R.ext.indexOf(ab[1] + '|' + ab[0]) >= 0, off = mutual ? 6 : 0;
        var sx = a[0] + ux * 20 + nx * off, sy = a[1] + uy * 20 + ny * off, ex = b[0] - ux * 20 + nx * off, ey = b[1] - uy * 20 + ny * off;
        ctx.strokeStyle = C.accent3; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = C.accent3; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 9 + nx * 3.5, ey - uy * 9 + ny * 3.5); ctx.lineTo(ex - ux * 9 - nx * 3.5, ey - uy * 9 - ny * 3.5); ctx.closePath(); ctx.fill();
      });
      // nodes
      M.domain.forEach(function (e, i) {
        var p = pos[i], inP = M.preds.P.ext.indexOf(e) >= 0, inQ = M.preds.Q.ext.indexOf(e) >= 0;
        ctx.beginPath(); ctx.arc(p[0], p[1], 20, 0, Math.PI * 2);
        ctx.fillStyle = inP ? 'rgba(47,44,214,.14)' : C.paper; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = inP ? C.accent : C.gold; ctx.stroke();
        if (inQ) { ctx.beginPath(); ctx.arc(p[0], p[1], 25, 0, Math.PI * 2); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.accent3; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = C.ink; ctx.font = 'bold 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, p[0], p[1]);
        // constant labels
        var cs = Object.keys(M.consts).filter(function (c) { return M.consts[c] === e; });
        if (cs.length) { ctx.fillStyle = C.accent2; ctx.font = 'bold 12px "IBM Plex Mono"'; ctx.fillText(cs.join(',') + ' →', p[0], p[1] - 30); }
      });
      ctx.fillStyle = C.muted; ctx.font = '11px "IBM Plex Mono"'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('● fill/blue ring = P    ◌ green ring = Q    → = R    red = constant', 14, h - 12);
    }

    function mount(stage) {
      LV.clear(stage);
      stage.appendChild(el('div.module-head', null,
        el('div.kicker', { text: 'Module I · foundations · semantics' }),
        el('h2', { text: 'First-order logic — models & satisfaction' }),
        el('p', { text: 'A first-order structure fixes a domain of individuals and interprets the constants, predicates, and relations of the language. Tarski\u2019s definition of satisfaction then assigns a truth value to every formula by recursion — quantifiers ranging over the domain. Build a structure and test any sentence with ∀, ∃, =, and the connectives; open formulas return their satisfying assignments.' })));
      var body = el('div.module-body'); stage.appendChild(body);

      var split = el('div.split'); body.appendChild(split);
      var cwrap = el('div.canvas-card'); canvas = el('canvas'); cwrap.appendChild(canvas); split.appendChild(cwrap); ctx = canvas.getContext('2d');

      var col = el('div.grid', { style: { gridTemplateColumns: '1fr' } }); split.appendChild(col);
      var fc = el('div.card'); fc.appendChild(el('h4', { text: 'formula' }));
      refs.formula = el('input', { type: 'text', value: '∀x ∃y R(x,y)', style: { width: '100%' } });
      var fr = el('div.btn-row'); fr.appendChild(refs.formula);
      var eb = el('button.btn.primary', { text: 'eval' }); eb.addEventListener('click', evaluate); fr.appendChild(eb);
      fc.appendChild(fr);
      var sr = el('div.symrow'); '∀ ∃ ¬ ∧ ∨ → ↔ = ( )'.split(' ').forEach(function (s) { var b = el('button.sym', { text: s }); b.addEventListener('click', function () { refs.formula.value += (s === '∀' || s === '∃') ? s : s; refs.formula.focus(); }); sr.appendChild(b); });
      fc.appendChild(sr);
      refs.out = el('div', { style: { marginTop: '10px' } }); fc.appendChild(refs.out);
      col.appendChild(fc);

      var ex = el('div.card'); ex.appendChild(el('h4', { text: 'examples (click to load)' }));
      [['∀x ∃y R(x,y)', 'every x relates to some y'],
       ['∃x ∀y (R(x,y) ∨ x=y)', 'a least element'],
       ['∀x ∀y (R(x,y) → ¬R(y,x))', 'R is asymmetric'],
       ['∀x (P(x) → ¬Q(x))', 'no P is a Q'],
       ['R(a,x)', 'open: which x have a R x?']].forEach(function (e) {
        var b = el('button.btn', { text: e[0], style: { display: 'block', width: '100%', textAlign: 'left', marginBottom: '5px' } });
        b.addEventListener('click', function () { refs.formula.value = e[0]; evaluate(); });
        ex.appendChild(b); ex.appendChild(el('div.muted', { style: { fontSize: '11px', marginTop: '-3px', marginBottom: '6px' }, text: e[1] }));
      });
      col.appendChild(ex);

      var sc = el('div.card'); sc.appendChild(el('h4', { text: 'the structure M' })); refs.struct = el('div'); sc.appendChild(refs.struct); col.appendChild(sc);

      window.addEventListener('resize', function () { resize(); });
      setTimeout(function () { resize(); refresh(); }, 30);
    }
    return { mount: mount };
  }

  LV.register({ id: 'fol', no: 'I', title: 'First-order logic', sub: 'Models · quantifiers · satisfaction', create: mod });
})();

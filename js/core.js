/* ===========================================================================
   core.js — shared engine for the Interactive Logic Visualizer
   - global namespace LV
   - module registry + router hooks
   - modal/epistemic formula parser (-> AST)
   - generic AST evaluator parameterised by a "frame interpretation"
   - small DOM helper
   No build step, no ES modules: loads as a classic <script> so the project
   runs directly from file:// by double-clicking index.html.
   ========================================================================= */
(function (global) {
  'use strict';

  var LV = global.LV || {};
  global.LV = LV;

  /* ---- module registry ---------------------------------------------------- */
  LV.modules = LV.modules || [];
  LV.register = function (def) { LV.modules.push(def); };

  /* ---- tiny DOM helper ---------------------------------------------------- */
  // el('div.card#main', {onclick:fn}, child, child...)
  LV.el = function (sel, attrs) {
    var parts = sel.split(/(?=[.#])/);
    var tag = parts[0] && parts[0][0] !== '.' && parts[0][0] !== '#' ? parts.shift() : 'div';
    var node = document.createElement(tag);
    parts.forEach(function (p) {
      if (p[0] === '.') node.classList.add(p.slice(1));
      else if (p[0] === '#') node.id = p.slice(1);
    });
    var i = 2;
    if (attrs && attrs.nodeType === undefined && typeof attrs !== 'string') {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'style' && typeof attrs[k] === 'object')
          Object.assign(node.style, attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    } else { i = 1; }
    for (; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      node.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  };

  LV.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); return node; };

  /* ---- subscript helpers -------------------------------------------------- */
  var SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  var UNSUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  LV.sub = function (n) { return String(n).split('').map(function (d) { return SUB[d] || d; }).join(''); };

  /* =========================================================================
     FORMULA PARSER
     Accepts unicode operators and ascii fallbacks:
       □ [] | ◇ <> | ¬ ! ~ | ∧ & | ∨ + | → -> | ↔ <-> | ⊤ T1 | ⊥ F0
     Agents: K1 K₁ K2 K₂ ...   Group operators: C (common), D (distributed)
     Atoms: single lowercase letters a..z
     Precedence (loose -> tight): ↔  <  →  <  ∨  <  ∧  <  unary(¬ □ ◇ K C D)
     → is right-associative.
     ========================================================================= */

  function normalize(s) {
    return s
      .replace(/<->/g, '↔').replace(/<=>/g, '↔')
      .replace(/->/g, '→').replace(/=>/g, '→')
      .replace(/\[\]/g, '□').replace(/<>/g, '◇')
      .replace(/!/g, '¬').replace(/~/g, '¬')
      .replace(/&/g, '∧');
    // note: '|' and '+' are NOT auto-mapped to ∨ to avoid clashing with text; use ∨.
  }

  function tokenize(s) {
    s = normalize(s);
    var toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if ('()¬∧∨→↔□◇⊤⊥'.indexOf(c) >= 0) { toks.push({ k: c }); i++; continue; }
      if (c === 'K') {
        var j = i + 1, num = '';
        while (j < s.length && (/[0-9]/.test(s[j]) || UNSUB[s[j]])) {
          num += UNSUB[s[j]] || s[j]; j++;
        }
        toks.push({ k: 'K', agent: num ? parseInt(num, 10) : 1 });
        i = j; continue;
      }
      if (c === 'C') { toks.push({ k: 'C' }); i++; continue; }
      if (c === 'D') { toks.push({ k: 'D' }); i++; continue; }
      if (/[a-z]/.test(c)) { toks.push({ k: 'atom', name: c }); i++; continue; }
      throw new Error('Unexpected character: "' + c + '"');
    }
    return toks;
  }

  LV.parse = function (str) {
    var toks = tokenize(str), pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function expect(k) {
      var t = next();
      if (!t || t.k !== k) throw new Error('Expected ' + k);
      return t;
    }
    function parseIff() {
      var a = parseImp();
      while (peek() && peek().k === '↔') { next(); a = { t: 'iff', a: a, b: parseImp() }; }
      return a;
    }
    function parseImp() {
      var a = parseOr();
      if (peek() && peek().k === '→') { next(); return { t: 'imp', a: a, b: parseImp() }; }
      return a;
    }
    function parseOr() {
      var a = parseAnd();
      while (peek() && peek().k === '∨') { next(); a = { t: 'or', a: a, b: parseAnd() }; }
      return a;
    }
    function parseAnd() {
      var a = parseUnary();
      while (peek() && peek().k === '∧') { next(); a = { t: 'and', a: a, b: parseUnary() }; }
      return a;
    }
    function parseUnary() {
      var t = peek();
      if (!t) throw new Error('Unexpected end of formula');
      if (t.k === '¬') { next(); return { t: 'not', a: parseUnary() }; }
      if (t.k === '□') { next(); return { t: 'box', a: parseUnary() }; }
      if (t.k === '◇') { next(); return { t: 'dia', a: parseUnary() }; }
      if (t.k === 'K') { next(); return { t: 'K', agent: t.agent, a: parseUnary() }; }
      if (t.k === 'C') { next(); return { t: 'C', a: parseUnary() }; }
      if (t.k === 'D') { next(); return { t: 'D', a: parseUnary() }; }
      return parseAtom();
    }
    function parseAtom() {
      var t = peek();
      if (!t) throw new Error('Unexpected end of formula');
      if (t.k === '(') { next(); var e = parseIff(); expect(')'); return e; }
      if (t.k === '⊤') { next(); return { t: 'top' }; }
      if (t.k === '⊥') { next(); return { t: 'bot' }; }
      if (t.k === 'atom') { next(); return { t: 'atom', name: t.name }; }
      throw new Error('Unexpected token: ' + t.k);
    }
    var ast = parseIff();
    if (pos < toks.length) throw new Error('Trailing tokens after formula');
    return ast;
  };

  /* render an AST back to a pretty unicode string (for echoing) */
  LV.show = function (ast) {
    function p(node, parentPrec) {
      var prec = { iff: 1, imp: 2, or: 3, and: 4 };
      var s;
      switch (node.t) {
        case 'atom': return node.name;
        case 'top': return '⊤';
        case 'bot': return '⊥';
        case 'not': return '¬' + p(node.a, 5);
        case 'box': return '□' + p(node.a, 5);
        case 'dia': return '◇' + p(node.a, 5);
        case 'K': return 'K' + LV.sub(node.agent) + p(node.a, 5);
        case 'C': return 'C' + p(node.a, 5);
        case 'D': return 'D' + p(node.a, 5);
        case 'and': s = p(node.a, 4) + ' ∧ ' + p(node.b, 4); return wrap(4, parentPrec, s);
        case 'or': s = p(node.a, 3) + ' ∨ ' + p(node.b, 3); return wrap(3, parentPrec, s);
        case 'imp': s = p(node.a, 3) + ' → ' + p(node.b, 2); return wrap(2, parentPrec, s);
        case 'iff': s = p(node.a, 2) + ' ↔ ' + p(node.b, 1); return wrap(1, parentPrec, s);
      }
      return '?';
    }
    function wrap(prec, parent, s) { return prec < parent ? '(' + s + ')' : s; }
    return p(ast, 0);
  };

  /* collect atoms used in a formula */
  LV.atomsOf = function (ast, acc) {
    acc = acc || {};
    if (!ast) return acc;
    if (ast.t === 'atom') acc[ast.name] = true;
    if (ast.a) LV.atomsOf(ast.a, acc);
    if (ast.b) LV.atomsOf(ast.b, acc);
    return acc;
  };

  /* =========================================================================
     GENERIC EVALUATOR
     A "frame interpretation" supplies how the modal connectives are read:
       interp = {
         atom(name, point) -> bool,
         box(evalChild, point) -> bool,        // □
         dia(evalChild, point) -> bool,        // ◇
         K(agent, evalChild, point) -> bool,   // optional
         C(evalChild, point) -> bool,          // optional
         D(evalChild, point) -> bool           // optional
       }
     evalChild is a function(point) the interpretation calls on accessible points.
     ========================================================================= */
  LV.evalAST = function (ast, point, interp) {
    function ev(node, pt) {
      switch (node.t) {
        case 'atom': return !!interp.atom(node.name, pt);
        case 'top': return true;
        case 'bot': return false;
        case 'not': return !ev(node.a, pt);
        case 'and': return ev(node.a, pt) && ev(node.b, pt);
        case 'or': return ev(node.a, pt) || ev(node.b, pt);
        case 'imp': return !ev(node.a, pt) || ev(node.b, pt);
        case 'iff': return ev(node.a, pt) === ev(node.b, pt);
        case 'box': return interp.box(function (q) { return ev(node.a, q); }, pt);
        case 'dia': return interp.dia(function (q) { return ev(node.a, q); }, pt);
        case 'K': return (interp.K || interp.box)(node.agent, function (q) { return ev(node.a, q); }, pt);
        case 'C': return (interp.C || interp.box)(function (q) { return ev(node.a, q); }, pt);
        case 'D': return (interp.D || interp.box)(function (q) { return ev(node.a, q); }, pt);
      }
      throw new Error('Unknown node ' + node.t);
    }
    return ev(ast, point);
  };

  /* =========================================================================
     RELATION ALGEBRA over integer-id worlds (used by kripke + topology + agents)
     ========================================================================= */
  LV.rel = {
    // successors of w under a list of {from,to} edges (optionally filtered by agent)
    succ: function (edges, w, agent) {
      var out = [];
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (e.from === w && (agent == null || e.agent === agent)) out.push(e.to);
      }
      return out;
    },
    has: function (edges, a, b, agent) {
      return edges.some(function (e) {
        return e.from === a && e.to === b && (agent == null || e.agent === agent);
      });
    },
    // reflexive-transitive closure reachable set from w over given edge predicate
    reach: function (ids, edges, w, agentSet) {
      var seen = {}, stack = [w]; seen[w] = true;
      while (stack.length) {
        var x = stack.pop();
        for (var i = 0; i < edges.length; i++) {
          var e = edges[i];
          if (e.from !== x) continue;
          if (agentSet && agentSet.indexOf(e.agent) < 0) continue;
          if (!seen[e.to]) { seen[e.to] = true; stack.push(e.to); }
        }
      }
      return Object.keys(seen).map(Number);
    },
    // frame property checks
    isReflexive: function (ids, edges) { return ids.every(function (w) { return LV.rel.has(edges, w, w); }); },
    isSymmetric: function (ids, edges) {
      return edges.every(function (e) { return LV.rel.has(edges, e.to, e.from, e.agent); });
    },
    isTransitive: function (ids, edges) {
      for (var i = 0; i < edges.length; i++)
        for (var j = 0; j < edges.length; j++)
          if (edges[i].to === edges[j].from && edges[i].agent === edges[j].agent)
            if (!LV.rel.has(edges, edges[i].from, edges[j].to, edges[i].agent)) return false;
      return true;
    },
    isEuclidean: function (ids, edges) {
      for (var i = 0; i < edges.length; i++)
        for (var j = 0; j < edges.length; j++)
          if (edges[i].from === edges[j].from && edges[i].agent === edges[j].agent)
            if (!LV.rel.has(edges, edges[i].to, edges[j].to, edges[i].agent)) return false;
      return true;
    },
    isSerial: function (ids, edges) {
      return ids.every(function (w) { return edges.some(function (e) { return e.from === w; }); });
    }
  };

  /* theme colours (reads CSS variables so light/dark stay in sync) */
  LV.theme = function () {
    var cs = getComputedStyle(document.documentElement);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    return {
      bg: v('--paper'), paper: v('--parchment'), ink: v('--ink'),
      muted: v('--muted'), rule: v('--rule'), accent: v('--accent'),
      accent2: v('--accent2'), accent3: v('--accent3'), gold: v('--gold')
    };
  };

})(window);

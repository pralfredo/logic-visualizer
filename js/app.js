/* ===========================================================================
   app.js — router + overview
   Builds the sidebar from LV.modules, instantiates a module on demand, and
   keeps the current view in the URL hash so it survives reload.
   ========================================================================= */
(function () {
  'use strict';

  var el = LV.el;
  var stage;
  var instances = {};
  var navItems = {};

  function overview(target) {
    LV.clear(target);

    target.appendChild(el('div.module-head', null,
      el('div.kicker', { text: 'a project in formal epistemology' }),
      el('h2', { text: 'The Architecture of Rational Belief' }),
      el('p', { text: 'Nine interactive instruments tracing a single question: how does a rational agent represent, update, and act on structured information under uncertainty — and where does that capacity reach its limit? Each module is live; nothing is pre-rendered.' })
    ));

    var body = el('div.module-body');
    target.appendChild(body);

    var prose = el('div.prose');
    prose.appendChild(el('p', null,
      el('b', { text: 'The spine. ' }),
      'We lay the foundations — first-order models and the satisfaction relation (I), and the proof theory that derives truths syntactically (II) — then study the logic of possibility and knowledge (III), reveal its hidden geometry (IV), and populate it with many interacting minds (V). From there representation turns into action (VI), self-interested agents reach equilibrium (VII) and we measure the social cost of their selfishness (VIII), before finally probing the epistemic boundary — the point at which data can no longer fix meaning or structure (IX). The arc runs from what can be proved, through how agents act and interact, to what cannot be inferred at all.'
    ));
    body.appendChild(prose);

    var grid = el('div.grid.overview-grid');

    var blurbs = {
      fol: 'A first-order structure — domain, constants, predicates, relations — and Tarski’s satisfaction relation. Test any sentence with ∀, ∃, =, and the connectives; open formulas return their satisfying assignments.',
      nd: 'A Fitch-style natural-deduction proof checker: assumptions open boxes, introduction rules discharge them, and the engine verifies every line, the scope of every citation, and whether the goal is actually proved.',
      kripke: 'Possible-worlds semantics. Build a frame, evaluate □ and ◇ world-by-world, and watch the modal axioms K, T, 4, B, 5 correspond to reflexivity, transitivity, symmetry, and the euclidean property.',
      topology: 'The McKinsey–Tarski theorem: S4 is the logic of topological space, with □ = interior and ◇ = closure. The same logic, now drawn as open sets and boundaries.',
      agents: 'Multi-agent epistemic logic. Indistinguishability relations, common and distributed knowledge, and public-announcement dynamics — the muddy-children puzzle solved by deleting worlds.',
      decision: 'Expected-utility theory and the evidential/causal schism, dramatised by Newcomb’s problem and a slider that finds exactly where the two decision theories disagree.',
      games: 'Strategic-form games and Nash equilibrium. Edit any payoff or load a classic game (Prisoner’s Dilemma, Stag Hunt, Matching Pennies) and watch best responses, pure and mixed equilibria, and dominant strategies recompute.',
      agt: 'The price of anarchy: how far a selfish equilibrium falls short of the social optimum. Pigou’s 4/3 bound and Braess’s paradox, where adding a road makes every driver slower.',
      grammar: 'Quine’s gavagai and Gold’s identification in the limit: a proof, made tactile, that finite data underdetermines both reference and grammar — and that learning needs a prior.'
    };

    LV.modules.forEach(function (m) {
      var card = el('div.card', { style: { cursor: 'pointer' } });

      card.appendChild(el('div.mono', {
        style: { fontSize: '11px', color: 'var(--gold)' },
        text: 'Module ' + m.no
      }));

      card.appendChild(el('h3', {
        style: { marginTop: '4px' },
        text: m.title
      }));

      card.appendChild(el('p.muted', {
        style: { fontSize: '13px' },
        text: blurbs[m.id] || m.sub
      }));

      card.addEventListener('click', function () {
        go(m.id);
      });

      grid.appendChild(card);
    });

    body.appendChild(grid);
  }

  function go(id) {
    Object.keys(navItems).forEach(function (k) {
      navItems[k].classList.toggle('active', k === id);
    });

    if (id === 'overview') {
      overview(stage);
      location.hash = '';
      return;
    }

    var def = LV.modules.find(function (m) {
      return m.id === id;
    });

    if (!def) {
      overview(stage);
      return;
    }

    if (!instances[id]) {
      instances[id] = def.create();
    }

    instances[id].mount(stage);
    location.hash = id;
  }

  function buildNav() {
    var side = document.getElementById('sidebar');
    if (!side) return;

    side.innerHTML = '';

    side.appendChild(el('div.brand', null,
      el('h1', { text: 'Logica Visualis' }),
      el('div.tag', { text: 'an interactive atlas of formal reasoning' })
    ));

    var toc = el('div.toc');

    var ov = el('div.nav-item', null,
      el('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline' } },
        el('span.ni-no', { text: '00' }),
        el('span.ni-title', { text: 'Overview' })
      ),
      el('span.ni-sub', { text: 'the through-line' })
    );

    ov.addEventListener('click', function () {
      go('overview');
    });

    navItems.overview = ov;
    toc.appendChild(ov);

    toc.appendChild(el('div.label', { text: 'modules' }));

    LV.modules.forEach(function (m) {
      var item = el('div.nav-item', null,
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline' } },
          el('span.ni-no', { text: m.no }),
          el('span.ni-title', { text: m.title })
        ),
        el('span.ni-sub', { text: m.sub })
      );

      item.addEventListener('click', function () {
        go(m.id);
      });

      navItems[m.id] = item;
      toc.appendChild(item);
    });

    side.appendChild(toc);
    side.appendChild(el('div.sidebar-foot', {
      text: 'v7 · 9 modules · runs offline'
    }));
  }

  function setupMobileMenu() {
    var menuToggle = document.getElementById('menuToggle');
    var sidebar = document.getElementById('sidebar');
    var stageEl = document.getElementById('stage');
    var BP = 820;

    if (!menuToggle || !sidebar) return;

    function close() { document.body.classList.remove('menu-open'); menuToggle.textContent = '☰'; }

    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = document.body.classList.toggle('menu-open');
      menuToggle.textContent = open ? '✕' : '☰';
    });

    // tap a nav item -> close
    sidebar.addEventListener('click', function () {
      if (window.innerWidth <= BP) close();
    });

    // tap the dimmed backdrop (the exposed stage) -> close
    stageEl.addEventListener('click', function () {
      if (window.innerWidth <= BP && document.body.classList.contains('menu-open')) close();
    });

    // returning to desktop width -> always reset to the static layout
    window.addEventListener('resize', function () {
      if (window.innerWidth > BP) close();
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    stage = document.getElementById('stage');

    buildNav();

    var start = location.hash.replace('#', '') || 'overview';
    var exists = LV.modules.find(function (m) {
      return m.id === start;
    });

    go(exists ? start : 'overview');
    setupMobileMenu();
  });
})();

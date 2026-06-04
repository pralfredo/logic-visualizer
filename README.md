# Logica Visualis
### An interactive atlas of formal reasoning

A self-contained web application that turns nine domains of logic, decision, and
game theory into live, manipulable instruments. **No build step, no server, no
dependencies.** Open it and it runs — including offline.

> **Two ways to run the exact same app:**
> - **`logica-visualis.html`** — the entire project (all styles + all nine
>   modules) inlined into one file. Double-click it, or upload it as `index.html`.
>   This is the recommended way to deploy.
> - **`logic-visualizer/`** — the same thing as a tidy multi-file project
>   (`index.html` + `css/` + `js/`) for reading and editing the source.

The sidebar footer shows the build (**v7 · 9 modules**) — a quick way to confirm
which version a browser actually loaded.

---

## The intellectual spine

Every module answers one part of a single question:

> *How does a rational agent represent, prove, update, and act on structured
> information under uncertainty — and where does that capacity reach its limit?*

The arc runs **foundations → modal logic → applications → limits**:

| # | Module | Question it answers |
|---|--------|---------------------|
| I | **First-order logic** | What makes a sentence *true in a structure*? |
| II | **Natural deduction** | How is a truth *derived*, step by step? |
| III | **Kripke models** | What does it mean for something to be *necessary* or *known*? |
| IV | **Topology** | What is the hidden *geometry* of that same logic? |
| V | **Agent foundations** | How is something known *together*, among many minds? |
| VI | **Decision theory** | How does knowing turn into *acting*? |
| VII | **Game theory** | What is rational when another rational agent reacts to you? |
| VIII | **Algorithmic game theory** | What does selfishness cost the group? |
| IX | **Gavagai → grammar** | What *cannot* be inferred from data at all? |

The recurring motif is **correspondence**: between semantics and proof
(I ↔ II), modal axioms and frame properties (III), modal operators and
topological ones (IV), knowledge and reachability (V), probability and value
(VI), equilibrium and optimum (VII–VIII), and hypothesis and prior (IX). The
same structural idea — *meaning is fixed by the relations among alternatives* —
runs through all nine.

---

## The modules

### I · First-order logic — models & satisfaction
Build a finite first-order structure: a domain of individuals, an interpretation
of the constants, the unary predicates **P**, **Q**, and the binary relation
**R**. Type any formula with `∀`, `∃`, `=`, and the connectives; Tarski's
satisfaction relation is evaluated by recursion over the domain. Closed sentences
return a truth value; open formulas return the assignments that satisfy them. The
structure is drawn live — predicate rings, relation arrows, constant pointers.

### II · Natural deduction — a proof checker
A Fitch-style proof editor and checker for classical propositional logic.
Assumptions open boxes (drawn as vertical rules) and introduction rules discharge
them. The checker validates each line against its rule, enforces that every
citation stays **in scope**, and reports whether the goal is actually proved from
the premises. Supported rules: `Premise`, `Assumption`, `Reiteration`, `∧I`,
`∧E`, `∨I`, `∨E`, `→I`, `→E`, `¬I`, `¬E`, `⊥E`, and `RAA`. This is the
proof-theoretic counterpart to Module I's semantics.

### III · Kripke models — modal & epistemic logic
Draw a frame on the canvas (worlds, an accessibility relation, valuations) and
evaluate `□`/`◇` world-by-world. Switch among **K, T, S4, S5** and an epistemic
reading; each axiom (K, T, 4, B, 5) turns ✓/✗ according to the frame properties
(reflexive, symmetric, transitive, euclidean) the engine detects in your drawing.

### IV · Topology — S4 as geometry
The McKinsey–Tarski theorem: S4 is exactly the modal logic of topological spaces,
with `□ =` interior and `◇ =` closure. Paint a proposition over a finite space and
watch its interior, closure, and boundary; the laws `□φ→φ` and `□φ→□□φ` verify
live. A bridge note connects this back to the reflexive-transitive frames of
Module III (Alexandrov spaces).

### V · Agent foundations — knowledge among many minds
Multi-agent epistemic logic with per-agent indistinguishability relations.
Evaluate `Kᵢφ`, common knowledge `Cφ`, and distributed knowledge `Dφ`, and apply
a **public announcement** `φ!` that updates the model by deleting worlds where `φ`
is false. Comes with the muddy-children preset.

### VI · Decision theory — from knowledge to action
A general expected-utility calculator (editable acts × states matrix with a
probability slider), and **Newcomb's problem** rendered as a contest between
evidential and causal decision theory, with a predictor-accuracy slider that finds
exactly where the two theories diverge.

### VII · Game theory — Nash equilibrium
A 2×2 bimatrix game. Edit any payoff or load a classic (Prisoner's Dilemma, Stag
Hunt, Battle of the Sexes, Matching Pennies, Chicken). The tool marks best
responses, finds every pure-strategy Nash equilibrium, computes the
mixed-strategy equilibrium, and flags dominant strategies.

### VIII · Algorithmic game theory — the price of anarchy
How far a selfish equilibrium falls short of the social optimum. **Pigou's
example** with a draggable flow split (selfish cost 1 vs optimum ¾ → price of
anarchy 4/3), and **Braess's paradox**, where adding a zero-cost road raises every
driver's latency from 1.5 to 2.0.

### IX · Gavagai → full grammar — the limits of inference
Two faces of one problem. Quine's **radical translation** ("gavagai!"), where no
finite ostension settles reference, and **grammar induction**, where several
grammars stay consistent with any finite positive sample. Only negative evidence —
or a built-in subset/simplicity prior — forces convergence. This is **Gold's
identification in the limit** made tactile: data underdetermines both reference and
structure, so learning needs a prior.

---

## How to run

**Locally.** Double-click `logica-visualis.html` (or open `logic-visualizer/index.html`).
Everything runs client-side. An internet connection is used only to load the
display fonts; the app is fully functional offline and falls back to system fonts.

**Deploying to GitHub Pages (or any static host).** Upload **`logica-visualis.html`
renamed to `index.html`** — one file, nothing to cache separately or miss. Commit,
then hard-reload (⌘⇧R / Ctrl-F5) and confirm the sidebar footer reads **v7 ·
9 modules**. If it doesn't, the browser or CDN is still serving a cached copy.

---

## Architecture

```
logica-visualis.html        # single-file build (everything inlined) — deploy this
logic-visualizer/
├── index.html              # multi-file shell: fonts, CSS, then scripts in order
├── css/
│   └── style.css           # "modern editorial" design system + dark mode
└── js/
    ├── core.js             # LV namespace, module registry, modal/propositional
    │                       #   parser (LV.parse), generic evaluator, relation algebra
    ├── m8-fol.js           # Module I   — also exposes the engine on LV.fol
    ├── m9-nd.js            # Module II  — also exposes the checker on LV.nd
    ├── m1-kripke.js        # Module III
    ├── m2-topology.js      # Module IV
    ├── m3-agents.js        # Module V
    ├── m4-decision.js      # Module VI
    ├── m6-games.js         # Module VII
    ├── m7-agt.js           # Module VIII
    ├── m5-grammar.js       # Module IX
    └── app.js              # router, sidebar, overview page
```

> File names carry a historical numeric suffix; the displayed module number comes
> from each module's `no` field, and the sidebar order follows the `<script>` load
> order in `index.html`. They need not match.

**Design choices**

- **Classic `<script>` tags, one global `LV`.** No ES modules, so the project runs
  from `file://` with no server and no CORS friction; the single-file build inlines
  the same scripts in the same order.
- **Type & colour.** Display in **Fraunces**, body/UI in **Space Grotesk**,
  formulae in **IBM Plex Mono**; an electric cobalt / vermilion / emerald / amber
  palette with full light + dark mode driven by CSS custom properties (so every
  module and canvas re-themes automatically).
- **Pure logic, separately testable.** The engines are decoupled from the DOM:
  - `LV.parse(str)` → modal/propositional AST (used by III, V, and the proof
    checker).
  - `LV.fol.parse / .satisfy / .evalUnder` → first-order parsing and satisfaction.
  - `LV.nd.check(lines, goal)` → a full Fitch proof checker returning per-line
    errors and whether the goal is proved.
  - `LV.evalAST`, `LV.rel` → a generic modal evaluator and relation algebra.

**Extending it.** Add `js/mN-yourtopic.js`, implement
`return { mount: function (stage) { … } }`, call
`LV.register({ id, no, title, sub, create })`, and add one `<script>` tag before
`app.js`. The module appears in the sidebar automatically. Rebuild the single-file
version by inlining `style.css` and the scripts (in load order) into one HTML file.

---

## Formula syntax

**Propositional / modal (Modules III, V, and proofs).** Unicode or ASCII:

| meaning | unicode | ASCII |
|---|---|---|
| not | `¬` | `!` or `~` |
| and / or | `∧` · `∨` | `&` · (use `∨`) |
| implies / iff | `→` · `↔` | `->` · `<->` |
| box / diamond | `□` · `◇` | `[]` · `<>` |
| true / false | `⊤` · `⊥` | |
| knows (agent i) | `Kᵢ` | `K1`, `K2`, … |
| common / distributed knowledge | `C` · `D` | |

Precedence (loose → tight): `↔ < → < ∨ < ∧ < unary`; `→` is right-associative.

**First-order (Module I).** Predicates are uppercase (`P`, `Q` unary; `R`
binary); terms are lowercase (declared constants `a`, `b`, otherwise variables);
quantifiers `∀`/`∃` (or `forall`/`exists`), plus `=` and the connectives above.
Examples: `∀x ∃y R(x,y)`, `∀x (P(x) → ¬Q(x))`, `R(a,x)`.

**Natural deduction (Module II).** Discharge rules cite an assumption line and a
line inside its box: `→I` cites `[assumption, conclusion]`; `¬I` and `RAA` cite
`[assumption, the ⊥ line]`; `∨E` cites
`[disjunction, assume-left, concl-left, assume-right, concl-right]`. Use `⊥` for
absurdity.

---

## Verification

The logic is checked, not just written. Every JavaScript file passes
`node --check`; both the multi-file and single-file builds boot all nine modules
in order I→IX with zero runtime errors in a headless DOM; and the pure engines are
unit-tested independently — the first-order evaluator against known model facts
(asymmetry, transitivity, least elements, equality, open formulas) and the
natural-deduction checker against valid proofs (including nested `→I`, `¬I`, `RAA`,
and a two-case `∨E`) as well as invalid ones (affirming the consequent, citing into
a closed box, malformed `∧I`), each accepted or rejected correctly.

---

## A note for a viva

The application is a *working argument* rather than a slide deck — each instrument
verifies its own theory as you manipulate it, and Modules I and II make the
semantics / proof-theory distinction concrete before any of the applied material.
The strongest thread to foreground is the correspondence motif above: the same
idea recurs in nine mathematical costumes, which is exactly why these fields
illuminate one another.

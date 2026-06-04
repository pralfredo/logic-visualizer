# Logica Visualis
### An interactive atlas of formal reasoning

A self-contained, offline web application that turns five domains of formal
epistemology into live, manipulable instruments. There is no build step and no
server: **open `index.html` in any modern browser** (double-click works).

---

## The intellectual spine

Every module answers one part of a single question:

> *How does a rational agent represent, update, and act on structured
> information under uncertainty — and where does that capacity reach its limit?*

| # | Module | Question it answers |
|---|--------|---------------------|
| I | **Kripke models** | What does it mean for something to be *necessary* or *known*? |
| II | **Topology** | What is the hidden *geometry* of that same logic? |
| III | **Agent foundations** | How is something known *together*, among many minds? |
| IV | **Decision theory** | How does knowing turn into *acting*? |
| V | **Game theory** | What is rational when another rational agent reacts to you? |
| VI | **Algorithmic game theory** | What does selfishness cost the group? |
| VII | **Gavagai → grammar** | What *cannot* be inferred from data at all? |

The recurring motif is **correspondence**: modal axioms ↔ frame properties (I),
modal operators ↔ topological operators (II), knowledge ↔ reachability (III),
probability ↔ value (IV), and hypothesis ↔ prior (V). The same structural idea —
*meaning is fixed by the relations among alternatives* — runs through all five.

---

## Modules

### I · Kripke models — modal & epistemic logic
Build a frame on the canvas (add worlds, draw the accessibility relation, set
valuations). Type a modal formula and evaluate it world-by-world. Switch among
**K, T, S4, S5** and an epistemic reading, and watch each axiom (K, T, 4, B, 5)
turn ✓/✗ according to the actual frame properties (reflexive, symmetric,
transitive, euclidean) the engine detects in your drawing.

### II · Topology — S4 as geometry
The **McKinsey–Tarski theorem**: S4 *is* the modal logic of topological spaces,
with `□ = interior` and `◇ = closure`. Paint a proposition over a finite space
and see its interior, closure, and boundary; the S4 laws `□φ→φ` (interior ⊆ set)
and `□φ→□□φ` (interior is idempotent) verify in real time. A bridge note shows
why every reflexive-transitive Kripke frame is an Alexandrov space — i.e. why
modal `□` and topological interior are literally the same operator.

### III · AI agent foundations — knowledge among many minds
Multi-agent epistemic logic with per-agent indistinguishability relations.
Evaluate `Kᵢφ` (agent *i* knows), `Cφ` (common knowledge — the
reflexive-transitive closure of the agents' union), and `Dφ` (distributed
knowledge — their intersection). The **public announcement** button performs the
core dynamic-epistemic update, deleting every world where the announced formula
is false. Comes with the **muddy children** puzzle preset.

### IV · Decision theory — from knowledge to action
A general expected-utility calculator (editable acts × states matrix with a
probability slider), and **Newcomb's problem** rendered as a contest between
**evidential** and **causal** decision theory. A predictor-accuracy slider shows
exactly where the two theories diverge, with a note on the **functional decision
theory** used in modern AI agent-foundations research.

### V · Game theory — Nash equilibrium
A 2x2 bimatrix game. Edit any payoff or load a classic (Prisoner's Dilemma, Stag Hunt,
Battle of the Sexes, Matching Pennies, Chicken). The tool marks best responses, finds every
pure-strategy Nash equilibrium, computes the mixed-strategy equilibrium, and flags dominant
strategies. Where Module IV had one agent choosing, here the best choice depends on another
agent choosing too.

### VI · Algorithmic game theory — the price of anarchy
How far a selfish equilibrium falls short of the social optimum. Pigou's example (price of
anarchy = 4/3) with a draggable flow split, and Braess's paradox, where adding a zero-cost
road raises every driver's latency from 1.5 to 2.0.

### VII · Gavagai → full grammar — the limits of inference
Two faces of one problem. First, **Quine's radical translation**: a single
ostension ("gavagai!") stays compatible with mutually incompatible reference
schemes no matter how many experiments you run — the indeterminacy of
translation. Second, **grammar induction**: from example strings, several
grammars always remain consistent with any finite positive sample. Only negative
evidence — or a built-in **subset/simplicity prior** — forces convergence. This
is **Gold's identification in the limit** made tactile, and the formal echo of
the gavagai problem: data underdetermines both reference and structure, so
learning needs a prior (the formal shadow of Universal Grammar).

---

## How to run

```
open index.html      # macOS
xdg-open index.html  # Linux
# or just double-click the file
```

Everything runs client-side. An internet connection is used only to load the
display fonts; the application is fully functional offline (it falls back to
Georgia / system mono).

---

## Architecture

```
logic-visualizer/
├── index.html            # shell: loads fonts, CSS, then scripts in order
├── css/
│   └── style.css         # "modern editorial" design system (Fraunces / Space Grotesk / IBM Plex Mono) + dark mode
└── js/
    ├── core.js           # LV namespace, module registry, formula parser,
    │                     #   generic evaluator, relation algebra
    ├── m1-kripke.js       # Module I
    ├── m2-topology.js     # Module II
    ├── m3-agents.js       # Module III
    ├── m4-decision.js     # Module IV
    ├── m5-grammar.js      # Module V
    └── app.js            # router + overview page
```

**Design choices**

- **Classic `<script>` tags, not ES modules.** This lets the project run from
  `file://` with no server and no CORS friction.
- **One shared engine.** `core.js` exposes a single global `LV` with:
  - `LV.parse(str)` → AST. Accepts Unicode (`□ ◇ ¬ ∧ ∨ → ↔ ⊤ ⊥`, agents `K₁`,
    group ops `C`/`D`) and ASCII fallbacks (`[]`, `<>`, `!`/`~`, `&`, `->`,
    `<->`). Precedence: `↔ < → < ∨ < ∧ < unary`, with `→` right-associative.
  - `LV.evalAST(ast, point, interp)` — a single evaluator parameterised by a
    *frame interpretation*, so every module reuses it by supplying its own
    reading of `□`, `◇`, `Kᵢ`, `C`, `D`.
  - `LV.rel` — successor / reachability / frame-property checks.
- **Module registry.** Each module file calls `LV.register({...})`; the router
  builds the sidebar and lazy-instantiates modules on first visit.

**Extending it.** Add a new file `js/m6-yourtopic.js`, implement
`return { mount: function(stage){...} }`, call `LV.register(...)`, and add the
`<script>` tag to `index.html` before `app.js`. The new module appears in the
sidebar automatically.

---

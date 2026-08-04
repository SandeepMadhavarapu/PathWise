# FEATURE-OPPORTUNITY-AUDIT

**Against application freeze `58d809d`. No application code was modified to produce this.**

---

## 1 · Current-product assessment

Read from the repository, not from prior descriptions.

**Engines (11).** `cpt-ledger`, `unemployment-clock`, `opt-budget`, `domicile-gate`, `domicile-clock`, `domicile`, `aid-eligibility`, `consequence-engine`, `next-steps`, `jurisdiction` (router), `unmodelled-jurisdiction`.

**Packs (7).** `va-domicile`, `va-aid`, `tn-domicile`, `tx-domicile`, `f1-practical-training`, `consequence-map`, `coverage`.

**The finding I did not expect, and the one this whole audit turns on:**

```
lib/engines/unemployment-clock.ts:54    asOf: ISODate
lib/engines/unemployment-clock.ts:106   daysUsed = totalDays - covered.size
lib/engines/unemployment-clock.ts:112   daysRemaining = cap - daysUsed
lib/engines/jurisdiction.ts:141         jurisdictionFor(student, asOf?)
lib/engines/next-steps.ts:132           asOf: ISODate
lib/engines/aid-eligibility.ts:89       asOf: ISODate

lib/engines/opt-budget.ts               asOf occurrences: 0
lib/engines/cpt-ledger.ts               computeCptLedger(events) — no asOf
```

**`asOf` is already a first-class parameter threaded through four engines and the jurisdiction router — and the product only ever calls them at one frozen instant (`2026-07-24`).** Every screen is a single photograph of a system that was built to be a film.

That is the gap. Not a missing domain — a missing *dimension* of the domains already built.

---

## 2 · Competition opportunity analysis

> *"What could PathWise show me in 20 seconds that I'd remember six hours later?"*

It already has three such moments: the collapsing uncertainty span, `1 / 2 / 43 / 5`, and one fact closing two doors. A fourth moment of the same **kind** has sharply diminishing returns.

> *"What could PathWise do that a team couldn't reproduce with an LLM wrapper and a weekend?"*

This is where the real gap sits. The #1 attack in the Q&A file is *"Where's the AI? Isn't this just if-statements?"* — and the current product answers it **rhetorically**. A judge must take determinism on faith. Nothing on screen forces the realisation.

> *"What would make me say 'I've never seen a system behave like that'?"*

Watching **three independent offices fail on three different dates**, driven by one slider, recomputed live.

---

## 3 · Candidate features

| ID | Candidate | Category |
|---|---|---|
| **F1** | **Temporal scrubber** — drag `asOf` across 12 months; all three offices recompute live | A/C/I/N |
| F2 | Scholarship engine as a 4th domain | A/M |
| F3 | Scholarship as a constrained sub-domain of the existing aid pack | A |
| F4 | "What would settle this?" — minimum missing evidence, generalised | B/E |
| F5 | Determinism proof — verdict fingerprint, re-run to match | A/K |
| F6 | Cross-office consequence graph (visual, replacing `/moment`'s list) | C/H |
| F7 | Counterfactual student — "what if Priya had never taken the second internship?" | I |
| F8 | Provenance chain fact → rule → computation → verdict | D/E |
| F9 | Deterministic replay of a recorded session | A/K |

**Already shipped, therefore excluded:** F4 is partly done (`/student/changed` names the exact missing document). F8 is done (finding pages descend to the pack JSON). F6 exists as a list on `/moment` and a graph would be prettier, not deeper.

---

## 4 · Scored comparison

Scores 1–10. **Priority = (Judge impact × Memorability × LLM-resistance) ÷ (Regression risk × Effort)**, normalised.

| Feature | Judge impact | Memorability | Technical depth | Real utility | Story fit | Demo time | Regression risk | Effort | LLM-resistance | Priority | Recommendation |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **F1 Temporal scrubber** | **9** | **9** | **8** | **8** | **9** | 15 s | **3** | **4** | **10** | **9.4** | **TIER S** |
| F5 Determinism proof | 6 | 5 | 5 | 3 | 7 | 10 s | 2 | 3 | 8 | 5.8 | TIER B |
| F7 Counterfactual student | 7 | 7 | 7 | 5 | 8 | 20 s | 5 | 6 | 8 | 5.2 | TIER A |
| F6 Consequence graph | 5 | 6 | 3 | 4 | 6 | 15 s | 4 | 5 | 4 | 3.1 | TIER B |
| F3 Scholarship sub-domain | 4 | 3 | 4 | 6 | 3 | 20 s | 7 | 6 | 4 | 1.6 | TIER C |
| F9 Deterministic replay | 4 | 4 | 6 | 2 | 4 | 25 s | 4 | 7 | 7 | 1.5 | TIER C |
| F2 Scholarship engine | 3 | 3 | 6 | 6 | **2** | 40 s | **9** | **9** | 5 | 0.5 | **TIER C** |

**Technical complexity deliberately did not win.** F2 scores highest on engineering and lowest on priority.

---

## 5 · Scholarship engine — the twelve questions, answered

| # | Question | Answer |
|---|---|---|
| 1 | Strengthen the core thesis? | **No.** The thesis is *three offices, one fact, nobody sees all three*. Aid is **already** one of the three and is already modelled, cited and blocked |
| 2 | Make the cross-domain problem more compelling? | **No** — it makes it a four-domain problem, which is a longer sentence, not a better one |
| 3 | Stronger emotional consequence? | Marginal. "You lose your scholarship" is emotionally close to "you lose in-state tuition", already shown |
| 4 | More useful? | Somewhat — but scholarship criteria are institution-specific and largely unpublished, so the honest output would be `unable_to_verify` for nearly every input |
| 5 | More impressive architecture? | **No.** A fourth pack of the same shape proves nothing the third didn't |
| 6 | Dilute "three offices"? | **Yes.** This is the decisive objection. "Three offices" is on the landing headline, the hero, the OG image and both demo scripts |
| 7 | Legal/financial accuracy risk? | **High.** Money. The worst failure mode available is a confident wrong answer about whether someone can pay tuition |
| 8 | Engineering required? | New pack schema fields, a new engine, coverage-map changes, new golden entries, `/check` surface, new tests |
| 9 | Constrained rule-pack domain instead? | Technically yes — `va-aid` already has a `provisions[]` array. But see #6 and #7; a cheaper build of a diluting feature is still diluting |
| 10 | Demo without lengthening 5 minutes? | **No.** It needs its own beat or it is invisible |
| 11 | Enable *"one fact changes three decisions"*? | **The product already does this** — `/moment` shows one job offer producing 4 consequences across 2 of 3 offices, one of them a reasoned "this changes nothing" |
| 12 | Improve the competition score? | **No.** It trades the sharpest differentiator (calibrated refusal) for a domain count nobody is scoring |

### Verdict: **DO NOT BUILD — not even as a limited domain.**

The differentiator is *calibrated refusal*, not domain count. Adding scholarship would require touching the aid pack, the coverage map and the golden fixture — three frozen systems — to weaken the one sentence the entire product is organised around.

---

## 6 · Best new feature — F1, the temporal scrubber

### What it is
One new route. A date slider from the scenario date to +12 months. As it moves, the **existing engines are re-run at that `asOf`** and every office's verdict updates live.

### Why it is qualitatively different from every other candidate
Every other idea adds *more of what PathWise already shows*. This adds **the axis PathWise was built for and has never displayed.** `asOf` is already plumbed through `unemployment-clock`, `next-steps`, `aid-eligibility` and `jurisdictionFor`. The capability exists; only the control is missing.

### What actually moves — verified against the real fixture
`priyaOpt`: `optStartDate 2026-05-16`, `cap 90` (STEM +60 locked until a job is reported), `asOf 2026-07-24` → **69 used, 21 remaining, amber**.

| Drag to | Days used | Remaining | Band |
|---|---:|---:|---|
| 24 Jul 2026 (today) | 69 | 21 | amber |
| **30 Jul 2026** | 75 | 15 | **red** |
| **14 Aug 2026** | 90 | 0 | **at cap** |
| **15 Aug 2026** | 91 | −1 | **over cap — OPT lost** |

**Three band flips inside three weeks.** Meanwhile `computeCptLedger` and `computeOptBudget` take no `asOf` and **do not move at all** — 342 of 365 stays fixed.

That contrast *is* the insight, and it is the sentence no competitor can say:

> **"Two of her clocks are already decided. One is still running. They do not fail on the same day — and no single office is watching all three."**

### Why an LLM wrapper cannot fake it
Faking it means producing coherent, mutually consistent outputs from five engines at 365 distinct dates, where two engines are correctly *insensitive* to the input. A language model asked to "show what changes over time" will drift every number. Dragging backwards and landing on the identical previous value is a **live determinism proof** — the answer to the #1 judge attack, demonstrated rather than asserted.

---

## 7 · Competitor attack test (F1)

| Question | Answer |
|---|---|
| If a competitor shipped this tomorrow, would PathWise still lead? | **Yes.** They'd need deterministic multi-domain engines underneath. Without those it's an animation |
| Could an LLM wrapper fake it convincingly? | **No.** Consistency across 365 recomputations, including correct non-movement, is exactly what generation cannot hold |
| Would a judge understand why it's hard? | **Yes** — instantly, because two gauges refuse to move while three others do |
| Demonstrable in under 20 seconds? | **Yes** — 15 s, one gesture |
| Memorable moment? | **Yes** — and it is the only candidate that creates a *new kind* of moment rather than a fourth of the same kind |

---

## 8 · Regression-risk analysis (F1)

| Question | Answer |
|---|---|
| Existing behaviour touched | **None.** New route only |
| Files modified | 1 new `app/<route>/page.tsx`, 1 new component, ~1 CSS block, 1 rail entry in `AppShell.tsx` |
| Rule engine | **Not touched** — called, not changed |
| Rule packs | **Not touched** |
| Golden fixtures | **Not touched** — golden pins its own `asOf`; a different `asOf` is a different call, not a different engine |
| Uncertainty calculations | **Not touched** |
| Jurisdiction routing | **Not touched** — `jurisdictionFor` already accepts `asOf` |
| Privacy architecture | **Not touched** — pure client computation, zero storage, zero network |
| Current verdicts | **Unchanged** at the scenario date, by construction |
| Current demo path | **Unchanged** — this is a Q&A weapon and a self-guided-judge reward, not a 5-minute-script insert |
| Regression risk | **Low-moderate.** The only genuine risk is one rail entry in a frozen shared component |
| Isolation | Total, if the rail entry is the last change made and the full battery re-runs after it |

**Honest caveat:** the RC is verified with 0 A and 0 B findings. Any new route must be re-audited — 12 routes × 5 viewports, the responsive sweep, a11y, and the golden. Budget that, or do not start.

---

## 9 · Recommended build order

1. **F1 temporal scrubber** — Tier S, ~4–6 h including re-audit
2. Stop.

F7 (counterfactual student) is genuinely interesting and I am deliberately not recommending it: it needs a second fixture, which means new golden surface.

---

## 10 · The 10–20 second demo moment

**Context: Q&A, after a judge asks *"Isn't this just if-statements?"***

| | |
|---|---|
| **WHAT THE JUDGE SEES** | Priya's three offices, as on the dashboard, with a date slider above them reading **24 Jul 2026** |
| **WHAT I CLICK** | Nothing. I drag the slider slowly to the right |
| **WHAT CHANGES** | The unemployment clock fills — amber at 30 Jul, **red at 15 days**, hits its cap on **14 Aug**, goes **over** on the 15th. Next-step margins count down and turn red in order. **The CPT ledger does not move. The OPT budget does not move.** |
| **WHAT I SAY** | *"Same engines. I'm only changing what day it is."* — pause — *"Two of these are already decided; nothing that happens later changes them. One is still running. They don't fail on the same day, and no office she can walk into is watching all three."* |
| **THEN** | I drag it **back** to 24 July. Every number returns to exactly what it was |
| **WHAT I SAY** | *"And it lands on the same numbers, because there's no model in it."* |
| **WHAT THE JUDGE REALIZES** | The system isn't describing rules — it's *executing* them. It knows which quantities time can touch and which it cannot. That is a property of computation, and they just watched it hold across a year and back. |

Total: **15 seconds, one gesture, no typing.**

---

## 11 · Final verdict

**CURRENT PRODUCT:**
A deterministic cross-domain reasoning engine that answers immigration, tuition residency and state aid from one student record, cites the regulation and the deciding office behind every answer, and refuses to answer when the record genuinely cannot settle the question.

**STRONGEST EXISTING DIFFERENTIATOR:**
Calibrated refusal — the uncertainty span that straddles the cliff and collapses when a real document is read in the tab.

**BIGGEST REMAINING WEAKNESS:**
Determinism is the entire technical argument and the product never demonstrates it; a judge must take it on faith, which is exactly where the "isn't this just if-statements?" attack lands.

**BEST NEW FEATURE:**
**F1 — the temporal scrubber.**

**WHY:**
It is the only candidate that adds a new *dimension* rather than more of the same, it turns the product's weakest rhetorical point into its most physical demonstration, it is impossible to fake with generation, and `asOf` is already threaded through four engines and the router — so it is a read-layer feature that touches no frozen system.

**SCHOLARSHIP ENGINE:**
**DO NOT BUILD** — not as an engine, not as a limited domain.

**SECOND-BEST FEATURE:**
F7, the counterfactual student. **Not recommended** — it needs a second fixture and therefore new golden surface.

**DO NOT BUILD:**
F2 scholarship engine · F3 scholarship sub-domain · F9 deterministic replay · F6 consequence graph · F5 determinism fingerprint (F1 subsumes it, physically)

**EXPECTED COMPETITION IMPACT:**
**High** — not because it adds a fourth memorable moment, but because it converts the single hardest Q&A question from a defence into a demonstration.

**REGRESSION RISK:**
**Low-moderate** — one new route, one rail entry in a frozen shared component, zero frozen systems touched.

**RECOMMENDED ACTION:**
Approve F1 only. Build it behind a new route, leave all 11 existing routes untouched, add the rail entry last, then re-run the full battery — 12 routes × 5 viewports, responsive sweep, a11y, golden — and revert entirely if anything moves. **If you would rather not reopen a verified release candidate at all, that is a defensible call and the product still wins on what it already has.**

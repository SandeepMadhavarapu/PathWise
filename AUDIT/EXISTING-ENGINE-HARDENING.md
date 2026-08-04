# EXISTING-ENGINE ADVERSARIAL HARDENING AUDIT

**Investigation only. No application file was modified** (`git status --short -- pathwise-app/` empty). The only new file is the probe itself, `AUDIT/adversarial.js`, kept as reproducible evidence.

---

## 1 · Executive verdict

# NO CHANGE.

I built 47 adversarial tests against the compiled engines — boundary, mutation, invariant, determinism, unknown-data, jurisdiction, adversarial-record and cross-engine consistency. **47 passed, 0 failed.** Nothing I threw at the reasoning core produced a wrong answer, a silently defaulted unknown, a borrowed citation, an order-dependent result, or a double-count.

Zero A findings. Zero B findings. Zero C findings.

---

## 2 · Baseline

```
HEAD / deployed          7128dc9        working tree: no application file modified
RC application freeze    58d809d
git diff 58d809d..HEAD --stat -- pathwise-app/
  app/check/page.tsx | 21 ++++----     ← approved A-1 copy fix only
```

Existing suite re-run: **211 PASS, 0 FAIL**, four suites, golden byte-identical (*"342 / 54 / 23 / 552 are unchanged"*, *"not one word of Virginia"*).

---

## 3 · Engine inventory

| Engine | Purpose | `asOf` | Deterministic | Covered by |
|---|---|---|---|---|
| `cpt-ledger` | Per-level full-time CPT days, overlap aggregation, cliff band | no (range-based) | yes | golden, evidence-flow |
| `unemployment-clock` | Cumulative OPT unemployment vs cap | **yes** | yes | golden |
| `opt-budget` | 12-month per-level budget, half-rate part-time | no | yes | golden |
| `domicile-gate` | Status gate before any domicile analysis | no | yes | golden, routing |
| `domicile-clock` | Durational clock from pack `start_rule` | anchor-based | yes | golden |
| `domicile` | Dependency + intent-factor weighing | no | yes | golden (Marcus) |
| `aid-eligibility` | Status block, form selection, earliest-of deadline | **yes** | yes | golden |
| `consequence-engine` | Life event → cross-domain consequences | no | yes | golden |
| `next-steps` | Ordered plan with margins | **yes** | yes | golden |
| `jurisdiction` | Router: packs or refusal | optional | yes | routing suite |
| `unmodelled-jurisdiction` | Honest "no pack" answer | no | yes | routing suite |

---

## 5 · Boundary results — **8/8, semantics consistent**

```
B1  364d  toCliff=1   amber      cliff-1 is not over
B2  365d  toCliff=0   red        exactly at the cliff
B3  366d  toCliff=-1  red        one past
B4  single-day authorization = 1 day     → ranges are INCLUSIVE of both endpoints
B5  used=89  left=1              cap-1
B6  used=90  left=0              cap
B7  used=91  left=-1             cap+1
B8  asOf BEFORE optStart → used=0, never negative
```

Inclusive-endpoint semantics are used **consistently** by both the ledger and the clock. No cross-engine boundary disagreement.

## 13 · Invariants — **7/7**

| | Result |
|---|---|
| Duplicate identical authorization | `base=342 dup=342` — **does not double-count** |
| Reversed event order | `342/54` both ways — order-independent |
| Shuffled event order | `342` |
| Unrelated-level CPT + unrelated event | `342` unchanged |
| Bachelor's days leaking into master's | never — partition holds |
| Single 12 h/wk authorization | `0` full-time days |
| Two overlapping part-times | `full=54 overlap=54` — aggregates **only** on the overlap |

## 12 · Determinism — **4/4**

25 repeated ledger runs → **1 distinct result**. 25 residency findings → 1. 25 aid findings → 1. Interleaving unrelated executions between runs changes nothing.

## 7 · Unknown / missing data — **6/6. This is the trust thesis, and it holds.**

| Attack | Result |
|---|---|
| No events at all | `forLevel("masters") === undefined` — **not a zeroed "clear"** |
| Missing `hours_per_week` | does **not** default to full-time |
| Missing `end_date` | does **not** run forever |
| No jurisdiction history | `code=""`, no pack — **does not default to Virginia** |
| Invalid state `ZZ` | no pack borrowed |
| Unmodelled state `OH` | no pack, no confident verdict |

**PathWise never turned "we don't know" into "yes" or "no" in any test I could construct.**

## 6 · Mutation — **8/8. One fact changes, only dependent reasoning moves.**

```
M1  +1 day on a master's CPT end   → ledger 342 → 343
M2  ...residency finding            INVARIANT (ineligible)
M3  ...aid finding                  INVARIANT (ineligible)
M4  remove bachelor's CPT           → master's unchanged (342)
M5  F-1 → LPR                       → residency ineligible → unable_to_verify
M6  F-1 → LPR                       → aid ineligible → review_recommended
M7  ...CPT ledger                   INVARIANT to status (342)
M8  +1 hr/wk on one part-time       → 342 → 342 (threshold unmoved)
```

**M5/M6 are the strongest result in this audit.** Changing one fact moves *both* offices — the cross-domain thesis, proven by mutation rather than asserted. And the residency verdict becomes `unable_to_verify` rather than a confident "eligible": past the status gate the engine has no intent factors, so it refuses. **The engine declines exactly where it should.**

## 14 · Adversarial records — **6/6, no crashes, no nonsense**

| Attack | Result |
|---|---|
| `end_date` before `start` | `fullTime=0`, no negative days |
| Zero hours/week | `0` |
| Negative hours | `0` |
| 200-year authorization | `73,050d`, computed, no overflow |
| 400 overlapping part-times | `418 ms` |
| Evidence IDs pointing at nothing | arithmetic unchanged (`342`) |

## 4 · Cross-engine consistency — **8/8**

`CLIFF_DAYS=365` read from the pack, not a literal. Band and margin agree in sign. STEM cap correctly locked at 90 while no qualifying employment exists. Residency and aid cite only the routed jurisdiction. **A finding with unresolved unknowns never claims a clear result** (`aid.result=ineligible unknowns=3`). Every reasoning step carries `from_events` / `from_evidence` arrays. `deciding_office` always populated.

---

## 8–17 · Remaining sections

| Section | Result | Class |
|---|---|---|
| 8 Uncertainty calibration | Engine `unable_to_verify` renders as *"Unable to verify"*; `tokens.ts` maps it to the `idle` glyph, never a success colour. No UI wording strengthens an engine conclusion | **D** |
| 9 Evidence integrity | Citations are **causal**, not decorative: `rule_citation` is the clause the gate evaluated, and `from_events`/`from_evidence` are per-step, resolved to human descriptions in `FindingDetail:86-87` | **D** |
| 10 Jurisdiction | U4/U5/U6 prove no pack is ever borrowed. `/check` with Ohio states plainly that no engine ran | **D** |
| 11 Temporal | `asOf` is threaded through 4 engines; `opt-budget` and `cpt-ledger` correctly take none because their inputs are ranges, not "today". No engine pretends to be time-aware | **D** |
| 16 Performance | 400 overlapping authorizations in 418 ms; day-marking is O(total days), fine for real records (<20 authorizations) | **D** |
| 17 Frontend↔engine contract | The historical failure class — *"engine says one thing, UI claims something stronger"* — was the source of every prior release-blocking defect. Now covered by shipped tests that assert **band verdict === panel verdict** rather than a literal | **D** |

---

## 17 · Candidate improvements considered, and rejected

| Candidate | Why rejected |
|---|---|
| Make ledger day-marking O(intervals) instead of O(days) | 418 ms for 400 authorizations; real records have <20. Optimising an invisible cost on a frozen engine is pure risk |
| Emit a machine-readable provenance object per finding | Already exists — that *is* `Finding`. Building it means rebuilding it |
| Add explicit inclusive/exclusive documentation to boundary code | Behaviour is already consistent and tested; a comment is not an improvement worth a freeze break |
| Guard against `end_date < start_date` with an explicit refusal | Currently returns 0 days, which is the safe answer. An explicit refusal would be *marginally* more honest but requires touching a frozen engine to handle input no real I-20 produces |
| Cap the 200-year authorization | Same reasoning. It computes correctly |

**Not one of these is backed by a discovered gap.** Every one would be speculative engineering on a frozen core.

---

## Final summary

### 1. Is there a real correctness problem?
**NO** — 47/47 adversarial tests pass; 211 existing tests pass; golden byte-identical.

### 2. Is there a real trust problem?
**NO** — no path turns unknown into yes or no; unknowns never coexist with a clear result.

### 3. Is there a real cross-engine inconsistency?
**NO** — inclusive-endpoint semantics and the pack-derived cliff are shared consistently.

### 4. Is there a real uncertainty-calibration problem?
**NO** — engine state and UI language match; `unable_to_verify` never renders as success.

### 5. Is there a real evidence-traceability problem?
**NO** — provenance is per reasoning step and already rendered.

### 6. Is there one existing-engine improvement worth making?
**NO.**

> **NO CHANGE. The existing architecture survived the adversarial audit.**

### 7. Would adding a new feature improve the product more than tightening the existing system?
**NO** — and tightening isn't available either, because nothing came loose.

### 8. Would you personally reopen the frozen release candidate?
**NO.**

47 adversarial tests, 211 existing tests, and a byte-identical golden say the reasoning core is correct. The one thing I would have called a genuine improvement — a machine-readable provenance chain — is already the shape of the `Finding` type. **Reopening the freeze would trade a proven-correct engine for a comment or a micro-optimisation nobody can observe.**

The strongest evidence this audit produced is not a defect. It is **M5/M6**: change one fact, F-1 to LPR, and both the residency and aid verdicts move — while the CPT ledger stays exactly where it was. That is the entire PathWise thesis, demonstrated by mutation rather than claimed in copy, and it is reproducible in one command:

```
node AUDIT/adversarial.js
```

# CLAIM #2 — VIRGINIA UNCLASSIFIED STATUS · SURGICAL REMEDIATION

**Baseline** `c8365924aa604d30df6a078399abc7206877b71a` (= `origin/main`), working tree clean at start.
`aae7807` does not exist in this repository and nothing was assumed from it.

Reproducible evidence: `AUDIT/claim2-adversarial.js` (45 attempts, 0 defeats).

---

## 1 · The defect

A rule pack states its status rule as **conditions**, and every one of them is a **blacklist**:

```json
"when": "immigration.status in ['F1','J1','M1']"
```

Both engines read "no condition matched" as "this jurisdiction permits this status". For an
enumerated status somebody actually considered, that inference is sound. For `other` it is not:
`other` is not a status, it is the *absence* of one, and no clause can have been authored about it.

Virginia therefore answered a student whose status PathWise cannot name **byte-identically to a U.S.
citizen**, with zero open questions, under a pack declaring its status gate `modelled`:

| VA + `Other`, residence since 2023-01-01 | Before |
|---|---|
| residency result | `review_recommended` |
| residency headline | *Domicile duration of 365 days appears satisfied (officer confirms)* |
| residency unknowns | **0** |
| aid result | `review_recommended` |
| aid headline | *File the FAFSA — Virginia state aid is not blocked by status* |
| aid form | `FAFSA` |

`Other` is the **only** unsupported status reachable through the `/check` dropdown. Five more
(`LPR_applicant`, `H4`, `DACA`, `TPS`, `undocumented`) exist in `ImmigrationStatus` and showed the
same defect without being reachable; all six are fixed.

---

## 2 · Root cause

**Residency** — `domicile-gate.ts::checkEligibleAlienGate` returned `undefined` when no gate matched,
and `runDomicileGate` read that single `undefined` as "past the gate, run the clock". Two different
situations shared one return value.

**Aid** — `va-aid.json`'s own rule is a *positive predicate*: **"Students eligible for FAFSA should
file FAFSA."** `selectAidForm` substituted `!findStatusBlock(...)` — "no blacklist entry matched" —
for "eligible to file". Those are different questions, and for an unclassified status only the
second has an answer.

---

## 3 · Source boundary

From the repository's own `pathwise-core/docs/02-research-citations.md`:

- §B — *"The institution shall first determine whether the student is a national or an alien. Holders
  of student/temporary visas cannot establish domicile. Cite: Part II §03(A) & §02(4)."*
- §C — *"Students eligible for FAFSA should file FAFSA… VASA exists for students who cannot file
  FAFSA (e.g. undocumented / tuition-equity students)."*

Three propositions, kept strictly apart:

| | Established? | Implemented? |
|---|---|---|
| **A** F1/J1/M1 are explicitly treated by the VA packs | yes — `gates[0].when` | unchanged |
| **B** `other` is not classified by those packs | yes — pack structure | **yes → `unable_to_verify`** |
| **C** `other` is legally ineligible | **no** | **never** |

**No legal rule was invented.** The change encodes only how far the pack was read.

---

## 4 · The remediation

One new pack field, `status_classification`, naming the statuses each pack was actually authored
against, plus its `cite` and the author's own `note`. A status outside that list stops the analysis
with `unable_to_verify` and a non-empty unknown that names the deciding office and what would resolve
it. Every sentence the engines compose is derived from **pack structure** (list size, jurisdiction
name, the pack's own cite and note) — the same discipline `unmodelledStatusGateUnknowns` already used.

The residency check lives inside **`checkEligibleAlienGate`**, which is the single entry point both
`runDomicileGate` and `runDomicileAnalysis` call. `domicile.ts` is byte-unchanged and the two paths
cannot disagree — a divergence between them is the defect this file's own history records.

### Why it is fail-closed and not a new legal rule

- The verdict is `unable_to_verify` — the product's existing word for "PathWise has not read this",
  already used for an unmodelled jurisdiction. This is that situation one layer in.
- `ineligible` is **never** reachable from an unclassified status. A test asserts it for every such
  status on both sides.
- On aid, `AidForm` gains `undetermined`, deliberately **not** `none`. `none` is determinate ("both
  forms were considered and status closed both"); `undetermined` says nobody looked. Collapsing them
  would deny a pathway Virginia keeps open — its own rule names the state alternative for exactly the
  students the FAFSA route does not fit.
- **No citizen/LPR whitelist.** `citizen`/`LPR` are *positively recognised* (permitted, per the brief:
  §03(A)'s national branch and §C's FAFSA-eligible filer), but a non-recognised status is never
  treated as ineligible — only as unanswerable.

A `validate.ts` honesty check makes the shape a build-visible error: a pack declaring `modelled` and
stating a gate/block without a `status_classification` now fails the suite. It binds Virginia only —
Texas and Tennessee state no status rule, declare no classification, and are untouched.

---

## 5 · After

| VA + `Other` | After |
|---|---|
| residency result | `unable_to_verify` |
| residency headline | *PathWise has not read Virginia's domicile rules for this immigration status* |
| residency unknowns | **1**, with office + resolution |
| aid result | `unable_to_verify` |
| aid headline | *PathWise has not read Virginia's aid rules for this immigration status* |
| aid form | `undetermined` |
| `/check` open questions | **1 → 3** |

Unchanged: `F1`/`J1`/`M1` (`ineligible`, gate-cited), `citizen`/`LPR` (durational + affirmative aid),
Texas, Tennessee, Marcus, the golden, and the whole demo path.

---

## 6 · Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Full suite (4 suites) | **283 PASS / 0 FAIL**, golden byte-identical |
| New regression assertions | 68 (routing) + 5 (schema) |
| `next build` | clean, 15/15 routes prerendered |
| Browser `/check` VA+Other | both cards fail closed, office named, 3 open questions |
| Browser `/check` VA+F1, VA+citizen | unchanged |
| Console errors / failed requests / horizontal overflow / empty citations | 0 / 0 / 0px / 0 |
| Adversarial | 45 attempts, **0 defeats** |
| Determinism | 5 identical runs, byte-identical |

Adversarial coverage included every schema status, case and whitespace variants (`f1`, `OTHER`,
`" other"`), prototype keys (`__proto__`, `constructor`), non-string types, injection-shaped strings,
maximal intent factors, all seven dependency exceptions, full aid evidence, and multi-state histories.
None produced a confident Virginia conclusion for an unclassified status; none produced an invented bar.

---

## 7 · Files changed

```
app/check/page.tsx                    45 +   two card branches + the router-derived flags
lib/engines/aid-eligibility.ts       103 +   undetermined form, unclassified finding
lib/engines/domicile-gate.ts         125 +   checkStatusClassification + shared-gate wiring
lib/engines/jurisdiction.ts           28 +   statusUnclassifiedFor (delegates; no rule restated)
lib/rulepacks/schema.ts               75 +   StatusClassification + parser
lib/rulepacks/validate.ts             30 +   the honesty check
lib/rulepacks/va-domicile.json          5 +
lib/rulepacks/va-aid.json               5 +
lib/test/jurisdiction-routing.test.ts 213 +
lib/test/pack-schema.test.ts           50 +
```

7 deleted lines in total, every one of them a line being modified. No formatting churn, no generated
files, no changes to `domicile.ts`, `cpt-ledger`, `opt-budget`, `unemployment-clock`, `next-steps`,
the fixtures, or the Texas/Tennessee packs.

**Claims #1, #3, #4 and #5 were not touched.**

---

## 8 · Post-review correction (source fidelity)

A hostile source-fidelity pass found that the first draft of the two `status_classification.note`
strings asserted source content this repository does not establish — and both notes are rendered to
users, via `rule_citation.text` and reasoning step 1:

| First-draft assertion | What `02-research-citations.md` actually says |
|---|---|
| *"Section 02(4) is where the classifications are defined"* | §B cites §02(4) but never states its content |
| *"the national and **permanent-resident** categories Section 03(A) separates them from"* | §B: §03(A) separates **national from alien**. An LPR *is* an alien — this placed LPRs in a permitted category with no source |
| *"the citizen and permanent-resident categories **the FAFSA guidance treats as eligible filers**"* | §C says only *"students eligible for FAFSA should file FAFSA"*; it never enumerates who is eligible |

Both notes were rewritten to state only what the repo establishes, and to declare `classified`
explicitly as an **implementation boundary, not a legal category** — the distinction the review brief
required be kept separate. The domicile note now says outright that PathWise *"does not claim the
source enumerates these five"* and that the list *"must not be read as the set of statuses Virginia
permits"*; the aid note says PathWise *"makes no claim about which other statuses can or cannot file"*.

Prose only: all 33 state/status verdicts, every `unknowns` count and every form selection are
byte-identical before and after the reword, re-verified by re-running the probe. `citizen`/`LPR`
behaviour is baseline-identical throughout — the remediation never changed it, it only made the
previously *implicit* assumption visible, and this correction stops that visible statement claiming
more than the repository can support.

# MASTER UPGRADE DECISION

**Decision document only. No code was written, no file modified, no branch created.**
Traced against real source and the served production application.

---

## 1 · Current baseline

```
HEAD                54e5101   working tree clean
Deployed            54e5101   (Build stamp read from production /student)
RC application freeze          58d809d

git diff 58d809d..HEAD --stat -- pathwise-app/
  pathwise-app/app/check/page.tsx | 21 ++++++++++++++----
  1 file changed, 17 insertions(+), 4 deletions(-)
```

The **only** application delta since the verified release candidate is the approved A-1 copy fix. Deployed commit equals HEAD.

**Engines (11):** `cpt-ledger`, `unemployment-clock`, `opt-budget`, `domicile`, `domicile-gate`, `domicile-clock`, `aid-eligibility`, `consequence-engine`, `next-steps`, `jurisdiction`, `unmodelled-jurisdiction`.
**Packs (7):** `va-domicile`, `va-aid`, `tn-domicile`, `tx-domicile`, `f1-practical-training`, `consequence-map`, `coverage`.
**Routes:** 11 real + Next default 404, all statically prerendered.
**Frozen paths:** `lib/engines/`, `lib/rulepacks/`, `lib/fixtures/`, `lib/test/`, uncertainty derivation, jurisdiction routing, Tier 0 privacy.

---

## 2 · The actual reasoning pipeline

Traced in code, not inferred. The pipeline is not implicit — **it is a typed value.**

```ts
// lib/types.ts
export interface Finding {
  rule_id: string;
  domain: 'immigration' | 'residency' | 'aid';
  result: FindingResult;
  headline: string;
  reasoning_steps: { claim: string; from_events: string[]; from_evidence: string[] }[];
  rule_citation: RuleCitation;
  unknowns: { what: string; why_it_matters: string; how_to_resolve: string }[];
  deciding_office: DecidingOffice;
  volatility?: { status: 'stable' | 'under_litigation' | 'recently_changed'; note: string };
}
```

Every stage the brief asked me to look for is a field on this record:

| Pipeline stage | Where it lives |
|---|---|
| INPUT | `Student`, `Event[]` (`date`, `end_date`, `program_level`, `attrs`, `evidence_ids`, `confidence`) |
| NORMALIZATION | `Event.attrs` → engine-specific inputs; `jurisdictionFor(student, asOf?)` |
| FACTS | `Evidence` (+ `Evidence.local: LocalFileRead` when a real file was read) |
| ENGINE CALCULATION | the 11 engines |
| RULE EVALUATION | `Finding.rule_id` + the pack condition it came from |
| EVIDENCE | `reasoning_steps[].from_events[]` / `from_evidence[]` — **per step, not per finding** |
| UNCERTAINTY | `Finding.unknowns[]` and, for the CPT case, disagreement between two `computeCptLedger` runs |
| FINDING | `Finding.result` + `headline` |
| NEXT STEP | `computeNextSteps({... asOf})` |
| PRESENTATION | `FindingDetail`, `ResultOutlook`, `UncertaintyBand`, `DomainCard` |

---

## 3–4 · Auditability audit — **the reasoning chain is already auditable**

This is the finding that decides the whole document.

**The provenance fields are not merely stored. They are rendered.**

```
components/FindingDetail.tsx:86    ...step.from_events.map((id) => describeEvent(id, events))
components/FindingDetail.tsx:87    ...step.from_evidence.map((id) => describeEvidence(id))
components/FindingDetail.tsx:174   {finding.unknowns.length > 0 ? (
components/FindingDetail.tsx:183     {u.why_it_matters}
components/FindingDetail.tsx:187     {u.how_to_resolve}
components/ResultOutlook.tsx:131     {q.how_to_resolve}
components/ResultOutlook.tsx:138     <p>{q.why_it_matters}</p>
```

Each of the ten questions Part 3 asked, and where a judge answers it **today, in the shipped UI**:

| Judge question | Answered by | Surface |
|---|---|---|
| What fact caused this? | `from_events[]` resolved to a human description | any finding page |
| Which rule evaluated it? | `rule_id` + `rule_citation` | any finding page |
| What calculation happened? | numbered reasoning steps + the ledger | finding + `/student` |
| What evidence supports the rule? | `rule_citation` quoted, linked, dated | any finding page |
| What was unknown? | `unknowns[].what` | finding + `/check` |
| Why didn't PathWise guess? | `unknowns[].why_it_matters`; the band's two readings | finding, `/student/changed` |
| Why *this* result? | ordered `reasoning_steps` — the order is the argument | any finding page |
| **What would have to change?** | **`unknowns[].how_to_resolve`** | finding + `/check` |
| Which office decides? | `deciding_office` + footer *"PathWise advises; the office decides"* | every screen |
| Can I reproduce it? | pack JSON printed in full on `/coverage`; zero network | `/coverage` |

### Scores

| Finding | Traceability | Evidence linkage | Input→output | Uncertainty | Reproducibility | Office |
|---|---|---|---|---|---|---|
| Residency gate (Priya) | 2 | 2 | 2 | 2 | 2 | 2 |
| Aid eligibility (Priya) | 2 | 2 | 2 | 2 | 2 | 2 |
| Domicile analysis (Marcus) | 2 | 2 | 2 | 2 | 2 | 2 |
| CPT ledger / cliff | 2 | 2 | 2 | 2 | 2 | 2 |
| Level-change refusal | 2 | 2 | 2 | 2 | 2 | 2 |
| Unmodelled jurisdiction (Ohio) | 2 | 2 | 2 | 2 | 2 | 2 |

**Does the system already contain enough information to make the chain visible?** It contains it *and already shows it.*

**Smallest presentation layer required: none. It is built.**

### ⛔ OPTION 2 is therefore REJECTED — as redundant, not as bad

"Make the reasoning chain auditable" describes work that shipped. Recommending it would be recommending a rebuild of `FindingDetail`. The correct competition action is not to build it but to **point at it** — see the Final Question.

---

## 5 · Competition impact of auditable reasoning *(scored as if new)*

Judge impact 9 · technical credibility 10 · memorability 7 · differentiation 9 · trust 10 · storytelling 8 · **implementation risk 0 (exists)** · **regression risk 0 (exists)** · demo value 9.

The scores are high — which is the point. **This is already the product's strongest asset and it required no new work to have.**

---

## 6–8 · DSO Brief audit

Every field traced to real code. Nothing inferred.

| DSO information | Already exists? | Source | Deterministic? | Safe to surface? |
|---|---|---|---|---|
| Current school | **Yes** | `Student.institutions[]` (latest) | Yes | Yes |
| Previous schools | **Yes** | `Student.institutions[]` | Yes | Yes |
| Program history | **Yes** | `Event.type` `program_start` / `program_end` | Yes | Yes |
| CPT history | **Yes** | `Event.type cpt_auth` + `computeCptLedger` | Yes | Yes |
| Documents reviewed | **Yes** | `Evidence`, `Evidence.local: LocalFileRead` (bytes, type, SHA-256) | Yes | Yes |
| Findings | **Yes** | `Finding[]` from the jurisdiction router | Yes | Yes |
| Evidence / citations | **Yes** | `rule_citation` + `reasoning_steps[].from_evidence` | Yes | Yes |
| Unknown information | **Yes** | `Finding.unknowns[].what` | Yes | Yes |
| Missing documents | **Yes** | `unknowns[].how_to_resolve`; `/student/changed` names the exact I-20 | Yes | Yes |
| Questions for the DSO | **Yes** | `unknowns[].what` + `why_it_matters` | Yes | Yes |
| Jurisdiction / office | **Yes** | `deciding_office`, `jurisdictionFor` | Yes | Yes |
| Relevant dates | **Yes** | `Event.date` / `end_date`, `computeNextSteps` deadlines | Yes | Yes |

**All 12 fields exist. Zero new backend, zero engine change, zero pack change.**

Two further assets already shipped:
- **A print stylesheet** — `@media print` at `globals.css:2668`, `@page { margin: 16mm }`, 20 selectors that hide nav/CTAs and preserve findings and citations. Covered by passing tests PR1/PR2.
- **A real export precedent** — `DeadlineExport` hand-writes an `.ics` in the tab.

**Category: C — requires only presentation/orchestration.**

---

## 9 · Does the DSO workflow strengthen the thesis?

| Test | Verdict |
|---|---|
| Makes backend more understandable? | Marginally — the finding pages already do this better |
| Demonstrates institutional usefulness? | **Yes** — its single genuine strength |
| Feels like infrastructure not a chatbot? | **Yes** |
| Reinforces three-office thesis? | Neutral |
| Reinforces calibrated refusal? | **Yes** — unknowns become *questions for the DSO* |
| Shows PathWise knows what it cannot decide? | **Already shown** on every screen footer |
| Strengthens trust? | Marginally |
| Memorable competition moment? | **No.** A generated document is the least memorable artifact in the product |
| More defensible? | Slightly |
| New liability / unsupported claims? | **Risk: yes.** A document that looks official invites being treated as official |

---

## 10 · Persistence / document state

Re-verified last round across 16 measured states: `localStorage = 0`, `sessionStorage = 0`, `cookies = 0` at every step; refresh, new tab, reopened tab and link navigation all reset; bfcache restores the form on Back and the copy now says so.

**Classification: B — intentional privacy/security design.**

The tension the brief anticipated does not materialise: a DSO brief generated and **printed in-session** is fully compatible with Tier 0. Nothing needs to be stored for the workflow to work. That is the one elegant thing about the idea.

---

## 11 · Storytelling audit through the backend lens

**Where the product says "trust us":** nowhere I could find. Every claim on a finding page carries its own artifact.

**Where it says "here is exactly what happened":** the numbered reasoning steps with per-step provenance; the quoted regulation with a verified-on date; the pack JSON on `/coverage`; the two disagreeing ledger runs on `/student/changed`; the routing note on `/check` for Ohio.

**Backend capability currently invisible to a judge:** none that matters. The one thing genuinely hidden is that `asOf` is threaded through four engines — and that was investigated and rejected on measured evidence.

---

## 12 · Comparison of all next moves

| Option | Judge impact | Backend visibility | Memorability | Effort | Regression risk | Thesis |
|---|---|---|---|---|---|---|
| **1 · Do nothing, freeze** | — | — | — | **0** | **0** | Preserved |
| 2 · Auditable reasoning | 9 | 10 | 7 | **n/a — already shipped** | 0 | Preserved |
| 3 · DSO Brief | 5 | 4 | 3 | Moderate (1 route, 1 component) | Moderate | Neutral |
| 4 · Both | = 3, since 2 exists | 4 | 3 | Moderate | Moderate | Neutral |
| 5 · Scholarship engine | 3 | 5 | 3 | High | **High** | **Dilutes** |
| 6 · Temporal scrubber | 2 | 3 | 2 | Moderate | Moderate | **Contradicts** |
| 7 · Other (found: none) | — | — | — | — | — | — |

---

## 8 · Rejected ideas and why

| Idea | Rejected because |
|---|---|
| **Auditable reasoning chain** | **Already fully implemented and already rendered.** `from_events`, `from_evidence`, `unknowns.how_to_resolve` all reach the UI. Building it means rebuilding what ships |
| **DSO Brief** | All 12 fields exist, so it is safe — but it is the *least memorable* artifact available, adds a 12th route to a product at 0 A / 0 B findings, and risks a generated document being mistaken for an official one. It answers a business question judges are not scoring |
| Scholarship engine | Dilutes "three offices"; aid is already one of the three; touches frozen pack + golden |
| Temporal scrubber | Measured: **one** band flip in 420 days, not three; residency and aid never move with `asOf`. Contradicts the thesis it was meant to prove |

---

## 13 · THE SINGLE RECOMMENDATION

# DO NOTHING. THE FREEZE HOLDS.

Not because change is risky — because **the highest-leverage upgrade this audit was asked to find already exists in the product.**

The brief asked whether the reasoning chain could be made auditable. Tracing the real code answers it definitively: `Finding` is a complete audit record, per-step provenance is resolved to human-readable descriptions in `FindingDetail`, and `unknowns.how_to_resolve` — the answer to *"what would have to change?"* — is rendered on both the finding pages and `/check`. All six audit dimensions score 2/2 across all six major findings.

There is no gap to close. **The gap is that nobody is being told to look.**

Against the eleven criteria in Part 13: doing nothing satisfies 5–11 trivially and satisfies 1–4 because the capability that would improve judge understanding, backend visibility, trust and differentiation is already shipped and already demonstrable.

---

## 14 · Implementation boundary

**Not applicable — nothing is approved for implementation.**

If the DSO Brief is ever revisited, the hard stop conditions are:
- **STOP** if it requires any change under `lib/engines/`, `lib/rulepacks/`, `lib/fixtures/` or `lib/test/`
- **STOP** if it requires storing anything (Tier 0 is non-negotiable; print in-session or not at all)
- **STOP** if any golden fixture output changes
- **STOP** if the artifact could be mistaken for an official determination

---

## Risks of the recommendation

The only risk of doing nothing is regret about unused runway. Weighed against re-opening a release candidate that passes 211 tests, 0 A findings and 0 B findings, with the strongest capability already built and already visible, that risk is the smaller one.

## Verification plan

None required. No change is proposed. The existing evidence stands: `visual-audit/FINAL-ADVERSARIAL-REPORT.md`, `STATE-PERSISTENCE-AUDIT.md`, three contact sheets, 211 passing tests, golden byte-identical.

---

## FINAL QUESTION

> **"If I were a hostile judge with 30 seconds to see that PathWise is technically serious, trustworthy, differentiated and useful — what single existing capability should I be allowed to see?"**

**Open any finding page — `/student/finding/residency` is two clicks from the landing — and look at one reasoning step.**

It carries, simultaneously: the **claim**, the **events and evidence that specific step rests on** (resolved from `from_events` / `from_evidence`, not stated in prose), the **regulation quoted with the date it was verified**, a link to **the actual JSON file the engine read**, the **open questions with what would resolve each one**, and the **office that decides — which is never PathWise**.

Thirty seconds. No narration. A judge can check every element independently, and no language model can produce that structure because the structure is the computation, not a description of it.

> **"Does the current product already contain that capability, or do we need to build the smallest possible surface that exposes it?"**

# It already contains it. Build nothing.

The work is done and it is visible. What remains is not engineering — it is making sure that in five minutes, a judge is pointed at it.

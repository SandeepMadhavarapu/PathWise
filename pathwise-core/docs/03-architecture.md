# 03 — Architecture

## §5.1 The shared spine

Everything is one pipeline. Three rule packs plug into it. Nothing is domain-specific except the
packs.

```
Facts + Documents
      |
Extraction  (confidence-scored, user-correctable)
      |
Event Timeline   <-- SINGLE SOURCE OF TRUTH
      |
Rule Engine   <-- reads: va-domicile.json
                          f1-practical-training.json
                          va-aid.json
      |
Finding { result, rule_cite, evidence[], unknowns[], authority }
      |
Event Consequence Engine  -->  Derived Deadlines
                          -->  Office Brief
                          -->  Outbound Reminders
```

**Why this shape wins.** The timeline IS the product. Every engine is a *reader* of it. Adding a
jurisdiction is authoring one JSON file, not writing code. This is our originality and
build-quality proof at the same time: we can show the rule file on screen and say "adding a state is
one file, not a code change."

## §5.2 Core data model

See `src/types.ts` for the canonical, compiling version. Summary:

- **`Student`** — id, immigration block (status, status_since, prior_statuses), dob, institutions[],
  jurisdiction_history[]. *The timeline is the product; everything else is a view over it.*
- **`Event`** — the atom of the timeline. type (enrollment / program_start / program_end /
  level_change / transfer / i20_issued / cpt_auth / opt_auth / ead_issued / employment /
  unemployment_gap / physical_move / lease_signed / tax_filed / license_issued / vehicle_registered
  / voter_registered / job_offer_accepted / admission_applied / admission_accepted / status_change /
  aid_application / verification_request), date, end_date?, jurisdiction?, institution_id?,
  program_level?, attrs (hours_per_week, intensity, ...), evidence_ids[], and
  **confidence: confirmed | extracted | asserted | inferred**.
- **`Evidence`** — doc_type (I-20 / EAD / I-797 / lease / tax_return / license / transcript /
  offer_letter / other), file_ref, extracted map of {value, confidence, page?, bbox?},
  user_corrected flag.
- **`Finding`** — rule_id, domain, result (no_issue / review_recommended / potential_risk /
  unable_to_verify / ineligible), headline, reasoning_steps[] (each cites from_events + from_evidence),
  rule_citation (text, source_url, authority, verified_on), unknowns[] (what / why_it_matters /
  how_to_resolve), deciding_office, and volatility? (stable / under_litigation / recently_changed).

**Design principles baked into the model:**
- Every finding carries its **evidence chain** and its **citation**. No bare claims.
- **"Unable to verify" is a first-class result**, not an error. Missing data → an honest unknown
  with how-to-resolve, never a guess.
- Every finding names the **deciding office** — we advise; the office decides.

## §5.3 The rule-pack format

Declarative, versioned, dated. One file per jurisdiction and domain. This is our originality proof,
so it must be legible on screen. Each pack carries: `pack_id`, `authority`, `source_url`,
`guidelines_effective`, `verified_on`, `volatility`, and its domain-specific rule sections (gates,
clock, dependency, intent_factors, auxiliary_acts_warning for domicile; thresholds, budgets,
counters for practical training; provisions, deadlines for aid). See `rulepacks/*.json` for the real
files.

## §6 The three engines

- **§6.1 Engine A — Practical Training (F-1).** Highest technical difficulty → build-quality score.
  Reconstructs a multi-school, multi-level timeline from uploaded I-20s; cumulative CPT ledger
  partitioned by level with reset on level change; detects the 365-day full-time threshold including
  overlapping part-time authorizations that aggregate to full-time; OPT budget (12 months/level minus
  pre-completion authorized, half-rate for part-time, on authorized periods); live 90/150
  unemployment counter with the STEM boundary; reporting-obligation tracker (10-day, 6-month).
  → `src/engines/cpt-ledger.ts`.
- **§6.2 Engine B — Domicile.** Highest rule complexity → reasoning-depth proof. Eligible-alien gate
  first, in the exact order the guidelines specify; dependency with all seven exceptions;
  intent-factor weighing with auxiliary-acts warning; clock start = date of the last qualifying
  intent factor, not arrival; event-order analysis. → `src/engines/domicile-gate.ts`.
- **§6.3 Engine C — Aid Eligibility.** Highest legibility → real-student-problem score. Which form
  (FAFSA vs state); VA-student determination via the three provisions; evidence checklist per
  provision; earliest-of deadline comparison.

## §6.4 Jurisdiction coverage strategy

All 50 states + DC present from day one via `coverage.json`, each with an honest status
(`implemented` / `schema_ready` / `not_yet`). Target: **verified on 4–6 states**, Virginia first.
Unimplemented states shown honestly in the UI with a link to the official source — the same
"unable to verify" trust philosophy applied to our own coverage. The demo line this earns:
*"Fifty states are in the app. Six are fully modelled. Adding a state is authoring one file."*

## §8 The Event Consequence Engine (read twice)

**This is our most important component.** It is the reason the product is one product and not three.

### §8.1 Why a reminder scheduler is not enough
- **Reminders must be outbound.** Anything that only fires when the student opens the app is a
  dashboard. Nobody opens a compliance dashboard. The nightly job pushes email + `.ics`.
- **Life events are not form edits.** "I got a job" does not merely add data. It *stops clocks,
  starts obligations, and invalidates prior findings.*

### §8.2 What one job actually triggers
A single event — student starts a job — fires **four** consequences, and in two of them the naive
answer ("great, you're employed!") is wrong. This table lives in `rulepacks/consequence-map.json`
and IS the feature.

### §8.3 The types
See `src/types.ts` for `LifeEvent` and `Consequence`. Key fields: a `Consequence` has a `domain`, a
`kind` (clock_paused / clock_started / obligation_created / finding_invalidated / eligibility_changed
/ deadline_moved), a human `effect` string, an optional `new_deadline` (date, derivation,
consequence_of_missing), and `supersedes[]` — the finding ids this event makes stale.

### §8.4 The screen this produces (the demo moment)
When a student adds "I got a job" they get, not a confirmation, but:

> **You reported a job. Four things changed.**
> - ⚠ Your unemployment counter did **not** stop. Your start date is 15 September. Days between now
>   and then still count.
> - ⚠ New obligation, 10-day deadline. Report this employment in SEVIS by 25 September.
> - ✅ Residency clock started today. This is the last intent factor we needed. Earliest in-state
>   eligibility is 15 September (next year).
> - ⚠ One earlier finding is now stale. "No immediate OPT risk" was computed before this. Re-run.

This is the best beat we have: the student did something *good* and the system caught the hidden
downsides no single office would have flagged.

### §8.5 The outbound side
- Nightly job re-derives all deadlines against today (cheap — the timeline is small).
- Escalating cadence tied to **action lead time**, not round numbers: not "30 days left" but "your
  DSO needs 5–10 business days, so your real deadline is [date]."
- Email + calendar (`.ics`) export. **Skip SMS** (Twilio verification eats two days).
- Every reminder carries its derivation and its consequence. Never a bare date.
- Cost ~14 hours; it displaces office-brief polish in days 18–20 — the brief is worth less than this.

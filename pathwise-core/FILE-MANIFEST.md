# FILE MANIFEST

Every file in `standing/`, one line each. If something here is missing on disk, it was lost — this
manifest tells you what to recreate.

## Root
- `README.md` — master recovery file; the 2-minute overview + folder map. Start here.
- `FILE-MANIFEST.md` — this file.
- `tsconfig.json` — TypeScript config (strict). Enables `npm run typecheck` / `build` / `test`.
- `package.json` — scripts: `typecheck`, `build`, `test`. Dev deps: typescript, @types/node.
- `.gitignore` — ignores node_modules/, dist/, package-lock.json.

## docs/  (read in numbered order)
- `00-START-HERE.md` — read order + how to rebuild the code + what "done" looks like.
- `01-thesis.md` — THE idea: status is the hidden variable across 3 domains, with 3 SCHEV citations.
- `02-research-citations.md` — every regulation, quoted + cited; the rules survive here.
- `03-architecture.md` — pipeline, data model, rule-pack format, Event Consequence Engine (§8).
- `04-build-plan-28day.md` — day-by-day schedule for 2 people; the two override rules.
- `05-ui-screens.md` — the six screens + governing design principle + high-value micro-details.
- `06-demo-script.md` — the 2-minute video, beat by beat. Write this before code.
- `07-submission-checklist.md` — the five required artifacts + pre-submission gate.
- `08-decisions-log.md` — what we cut and WHY (D1–D5) + the explicit "do not build" list.
- `09-day1-checklist.md` — concrete first actions in order.

## rulepacks/  (the product's knowledge — declarative, cited, dated)
- `f1-practical-training.json` — Engine A: CPT full-time threshold, 365-day cliff, overlap
  aggregation, level partition, OPT budget, unemployment clock, reporting duties, grace period.
- `va-domicile.json` — Engine B: eligible-alien gate, one-year clock, dependency + 7 exceptions,
  intent factors, auxiliary-acts warning, construction rules.
- `va-aid.json` — Engine C: form selection (FAFSA vs VASA), F-1 aid block, VA-student provisions,
  earliest-of deadline rule, confidentiality.
- `consequence-map.json` — the Event Consequence Engine's core table: one life event -> consequences
  across all three domains (the central originality).
- `coverage.json` — all 50 states + DC, each with an honest status (implemented / schema_ready /
  not_yet). VA implemented; 5 schema_ready; 45 not_yet.

## src/  (real, runnable TypeScript — not pseudocode)
- `types.ts` — the foundation: Student, Event, Evidence, Finding, LifeEvent, Consequence.
- `engines/cpt-ledger.ts` — Engine A: CPT ledger with overlap aggregation + 365-day cliff + level
  partition. The hardest computation; our build-quality proof.
- `engines/domicile-gate.ts` — Engine B: eligible-alien gate (runs first, stops analysis) +
  clock-start rule (last intent factor, not arrival).
- `fixtures/priya.ts` — the demo student: F-1, bachelor's 210 CPT days (partitioned), masters
  288 full-time + 54 overlap = 342 days (amber, 23 from cliff), and the future-dated job offer.
- `test/cpt-ledger.test.ts` — regression test locking the verified numbers (342/54/23, bachelors 210,
  F-1 gate ineligible). `npm test` must print ALL TESTS PASSED.

## Verified state (as of 2026-07-24)
- All 5 rule-pack JSON files parse.
- `coverage.json` has 51 jurisdictions (1 implemented, 5 schema_ready, 45 not_yet).
- `npx tsc --noEmit` is clean (strict mode).
- `npm test` prints: ALL TESTS PASSED — 342 / 54 / 23 (amber), bachelors 210 partitioned.

## Not yet built (the UI and glue — days 4+ of the plan)
- Extraction/OCR layer, timeline visualization, the six screens, the outbound reminder job,
  Engine C runtime, the rule-pack file viewer. All specced in docs/; none blocking the recovery.

# STANDING — Master Recovery File

> A student's standing across every system that governs their college journey.

**If you are reading this after losing progress: start here, then read `docs/00-START-HERE.md`.**
This folder is the complete, self-contained blueprint for the project. Everything needed to
rebuild it from zero is inside `standing/`. Nothing important lives only in a chat window.

---

## What this project is, in three sentences

Three offices decide an international student's fate — the DSO (immigration), the registrar/domicile
officer (in-state tuition), and financial aid (aid eligibility). None of them can see the whole
student. **Standing** is one reasoning engine over one student record, with three rule domains
plugged in, that notices the cross-domain consequences no single office can.

## The competition (hard facts)

- **Event:** Stellic Pathfinders Challenge 2026.
- **Category:** Overcoming Obstacles.
- **Build window:** 20 July – 21 August 2026. **The project must be built inside this window.**
- **Submissions close:** 21 August 2026. Winners early September. Top 3 present at Summit ~23 Sept.
- **Prize pool:** $12,000. Grand prize $5,000 + 90-min career conversation with Stellic leadership.
  Two runners-up $2,500. Four category winners $500. Top ~15% honorable mention. All qualifying
  entries get a digital badge.
- **Eligibility:** enrolled university student, 18+, in US / Canada / Mexico / Australia. Solo or
  teams up to 3; teammates may be from different schools.
- **Judging — five criteria, EQUAL weight:** (1) solves a real student problem, (2) originality,
  (3) scale/impact, (4) design & experience, (5) how well it's built.
- **Deliverables:** title + category, 500-word write-up, 2-minute demo video (YouTube/Vimeo/Loom),
  a working link a judge can open (live URL / Figma / GitHub), and a list of every tool used.
- **Tooling offered:** Stellic partnered with Lovable and Claude — pick one at registration
  (Lovable for build-by-description, or Claude API credits for Claude Code). **Register today and
  claim credits if not done.**
- **Who the judges are:** Stellic. Their products already cover degree audit/planning, transfer
  rules, transcript OCR. Our three domains (immigration, tuition classification, aid eligibility)
  sit entirely OUTSIDE what they sell. We must never look like a worse version of their product.

## Why we can win (and the honest ceiling)

Current honest estimate: **category win 70–75%, grand prize 20–25%.** The realistic ceiling is
~72%; the remaining points belong to an unknown field and judge taste — things we can't control.
Score profile: Real problem 9.5, Originality 8.5, Scale 8, Design 9 (was 7.5 — biggest headroom),
Built 9.5 (with focus). **We win by subtraction, not addition.** The idea is finished. Execution
and the judge-facing artifacts (video + write-up) are the only remaining levers.

## Folder map

```
standing/
  README.md                     <- you are here (master recovery)
  FILE-MANIFEST.md              <- every file, one line each
  docs/
    00-START-HERE.md            <- read order + how to rebuild
    01-thesis.md                <- the ONE idea, with 3 primary-source proofs
    02-research-citations.md    <- every regulation, quoted + cited
    03-architecture.md          <- pipeline, data model, rule-pack format
    04-build-plan-28day.md      <- day-by-day schedule, 2 people
    05-ui-screens.md            <- the six screens + design principle
    06-demo-script.md           <- the 2-minute video, beat by beat
    07-submission-checklist.md  <- the five required artifacts
    08-decisions-log.md         <- what we cut and WHY (anti-scope-creep)
    09-day1-checklist.md        <- do these things first, in order
  rulepacks/
    f1-practical-training.json  <- Engine A knowledge (CPT/OPT federal rules)
    va-domicile.json            <- Engine B knowledge (SCHEV domicile)
    va-aid.json                 <- Engine C knowledge (VASA / FAFSA)
    consequence-map.json        <- the Event Consequence Engine's core table
    coverage.json               <- all 50 states + DC with honest status
  src/
    types.ts                    <- the foundation every engine depends on
    engines/
      cpt-ledger.ts             <- Engine A: CPT ledger + overlap aggregation
      domicile-gate.ts          <- Engine B: eligible-alien gate + clock start
    fixtures/
      priya.ts                  <- the demo student (the overlap trap)
    test/
      cpt-ledger.test.ts        <- regression test locking the verified numbers
```

## The three engines (one-liners)

- **Engine A — Practical Training (F-1).** Highest technical difficulty -> our *build-quality* score.
  Multi-school, multi-level CPT ledger; 365-day full-time cliff; overlapping part-time aggregation;
  OPT budget arithmetic; live 90/150 unemployment counter.
- **Engine B — Domicile (residency).** Highest rule complexity -> our *reasoning-depth* proof.
  Eligible-alien gate FIRST, dependency + 7 exceptions, intent-factor weighing, clock starts at the
  date of the LAST qualifying intent factor (not arrival).
- **Engine C — Aid Eligibility.** Highest legibility -> our *real-student-problem* score.
  Which form to file, VA-student determination, evidence checklist, earliest-of deadline comparison.

Above all three: **the Event Consequence Engine** — maps one life event ("I got a job") to its
consequences across all three domains. This is what makes it one product, not three. Read
`docs/03-architecture.md` §8.

## The single most important build rule

**A live, judge-openable URL exists from day 2 and never breaks. Feature-freeze on Aug 16 no matter
what, and spend the last stretch on the video + write-up.** A 10/10 video of an 8/10 product beats
a 6/10 video of a 9/10 product every time.

## Where the canonical prose spec lives

The full narrative spec (sections 1–13) is in `Standing_Product_Spec.docx` (the persisted Word
file). This README + `docs/` reproduce and extend it in plain text so it survives and is diffable.
If the two ever disagree, the `docs/` here are the working source of truth; update the docx to match.

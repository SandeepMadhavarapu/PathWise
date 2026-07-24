# 00 — START HERE

You are looking at the recovery blueprint for **Standing**, our entry to the Stellic Pathfinders
Challenge 2026. If progress was lost, this folder is how we rebuild without re-deriving a single
decision.

## Read in this order

1. `../README.md` — the 2-minute overview and folder map. (Start there if you haven't.)
2. `01-thesis.md` — the ONE idea. If you only read one file, read this. It's the thing the whole
   product exists to demonstrate, with three primary-source citations that prove it's real.
3. `02-research-citations.md` — every regulation we encode, quoted with its source. The rules
   survive here even if all code is lost.
4. `03-architecture.md` — the shared pipeline, the data model, the rule-pack format, and the Event
   Consequence Engine (§8 — the most important component).
5. `05-ui-screens.md` — what the six screens look like and the governing design principle.
6. `06-demo-script.md` — the 2-minute video, beat by beat. **Write/refine this before writing code.**
7. `04-build-plan-28day.md` — the day-by-day schedule for two people.
8. `07-submission-checklist.md` — the five artifacts we must deliver.
9. `08-decisions-log.md` — what we cut and why. Read before proposing any new feature.
10. `09-day1-checklist.md` — the concrete first actions, in order.

## How to rebuild the code from this folder

The `src/` and `rulepacks/` folders are real, runnable artifacts, not pseudocode.

```bash
# from standing/
npm init -y
npm install -D typescript ts-node @types/node
npx tsc --noEmit src/**/*.ts          # typecheck
npx ts-node src/test/cpt-ledger.test.ts   # run the regression test
```

The test locks in the verified demo numbers (Priya's ledger). If it passes, Engine A's core math is
correct. Build the UI on top of these engines; do NOT reimplement the rules in the UI layer — the
rules live in `rulepacks/*.json` and are read by the engines.

## The two rules that override everything

1. **A live, judge-openable URL exists from day 2 and never breaks.** End every day on a working
   deploy.
2. **Feature-freeze on 16 August.** After that, only bug fixes and the video/write-up. The judges
   see the video and the 500 words before they ever open the link — those artifacts are not an
   afterthought, they are half the score surface.

## The one sentence that must be true on every screen

> Three offices decide your fate. None of them can see the whole you. Standing does.

## What "done" looks like

A judge opens the link, clicks "View example student" (Priya), and within 60 seconds sees:
the cross-domain hero finding (F-1 status blocks Virginia residency AND state aid — one fact, two
doors closed), a CPT ledger bar sitting in the amber zone near the 365-day cliff, and — the money
moment — adds "I got a job" and watches four things change across three domains, including the
unemployment counter that does NOT stop because the start date is in the future.

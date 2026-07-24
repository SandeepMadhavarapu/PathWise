# 09 — Day-1 Checklist (do these in order)

The concrete first actions. Do them top to bottom. Don't write product code until item 7.

## Administrative (do first — these gate everything)
- [ ] **Register for Pathfinders** at stellic.com/pathfinders if not already done.
- [ ] **Claim tooling credits** — pick Lovable OR Claude API credits at registration.
- [ ] **Read the official terms in full.** The Notion terms page needs a browser (JS-rendered);
      open it yourself, don't rely on a scrape. Confirm the build-window rule and eligibility.
- [ ] **Confirm eligibility** — enrolled student, 18+, US/Canada/Mexico/Australia. If teaming,
      confirm teammates (up to 3) and note they may be from different schools.
- [ ] **Start the tools-used list** (a running note; see `07-submission-checklist.md`).

## Lock the plan (before any code)
- [ ] **Write the 2-minute demo script** for real (start from `06-demo-script.md`). This governs
      everything.
- [ ] **Draft the 500-word write-up** as if the product exists. If you can't write it, the scope
      is wrong — fix the scope, not the write-up.
- [ ] **Lock the persona and her document set** — Priya (already specced in `src/fixtures/priya.ts`).
- [ ] **Lock category:** Overcoming Obstacles.
- [ ] **Read `08-decisions-log.md`** so nobody reopens a closed scope decision.

## Verify the recovered code still runs (proves the foundation is intact)
```bash
cd standing
npm install            # installs typescript + ts-node + @types/node
npm test               # compiles and runs the regression test
# expect: ALL TESTS PASSED — 342 / 54 / 23 (amber), bachelors 210 partitioned
```
- [ ] `npm test` passes. If it doesn't, Engine A math is broken — fix before building anything.

## Days 4–6 setup (right after day 1–3)
- [ ] **Deploy a hello-world to a real URL** and keep it live from then on (rule #1).
- [ ] **Agree the split:** Dev A = extraction/timeline/Engine A; Dev B = rule-pack runtime +
      Engines B/C + UI shell. Schema is done together, days 1–2.
- [ ] **Wire the engines to the UI** — the UI reads `rulepacks/*.json` via the engines; it does NOT
      reimplement rules.

## The two rules to tattoo on the wall
1. A live, judge-openable URL exists from **day 2** and never breaks.
2. **Feature-freeze 16 August.** Then: bugs, video, write-up only.

## If you ever feel lost
Re-read `docs/01-thesis.md` (the one idea) and `docs/06-demo-script.md` (the target). Everything
else is in service of those two.

# TEMPORAL SCRUBBER — VERDICT

**Stopped at Phase 3. Nothing was built. Working tree clean; `pathwise-app/` byte-identical to the freeze at `58d809d`.**

---

## What happened

I recommended this feature in `FEATURE-OPPORTUNITY-AUDIT.md` on the strength of four numbers I calculated by hand and never executed. Phase 1 required running the real engines. I did, and the recommendation did not survive it.

### Phase 1 — the numbers I published were wrong

Compiled the engines (`tsc -p tsconfig.test.json`) and called `computeUnemploymentClock` directly against `priyaOpt`.

```
date         used  cap  left  band    projectedTermination
2026-07-24    70   90    20  amber   2026-08-14
2026-07-30    76   90    14  red     2026-08-14
2026-08-14    91   90    -1  red     2026-08-14
2026-08-15    92   90    -2  red     2026-08-14
```

| Date | Claimed | Actual | |
|---|---|---|---|
| 24 Jul | 69 / 21 / amber | **70 / 20 / amber** | off by one |
| 30 Jul | 75 / 15 / red | **76 / 14 / red** | off by one |
| 14 Aug | 90 / 0 / "at cap" | **91 / −1 / red** | off by one, **and no such state exists** |
| 15 Aug | 91 / −1 / "over cap" | **92 / −2 / red** | off by one, **and no such state exists** |

Two distinct errors:

1. **Inclusive counting.** `totalDays = asOfOrd - startOrd + 1` — I computed the exclusive difference.
2. **A band vocabulary I invented.** `bandFor` returns only `green | amber | red`, and returns `red` for *both* `daysRemaining <= 15` and `overCap`. There is no "at cap" and no "over cap" band. The visual would have shown red, then red, then red.

### The central claim — "three band flips in three weeks" — is false

420-day sweep of the real engine from 20 Jul 2026:

```
BAND FLIP on 2026-07-29: amber -> red (used 75, left 15)
(no further flips occur in the following 420 days)
```

**Exactly one flip, ever.** After 29 July the gauge is red permanently.

### The cross-domain claim is also false

The whole pitch was *"three offices fail on three different dates."* They do not. Two of the three never move:

```
date         residency    aid
2026-07-24   ineligible   ineligible
2026-07-30   ineligible   ineligible
2026-08-14   ineligible   ineligible
2026-08-15   ineligible   ineligible
2027-01-01   ineligible   ineligible
2027-07-01   ineligible   ineligible
```

Residency and aid are closed by the **F-1 status gate**, which is time-invariant by design — correctly so. Dragging a date across a full year changes neither verdict.

---

## Phase 2 — what actually moves

| Engine | Accepts `asOf` | Changes over time | Evidence | Safe to visualise |
|---|---|---|---|---|
| `unemployment-clock` | **Yes** | **Yes** — linear; one band flip on 29 Jul | run above | Yes |
| `next-steps` | **Yes** | **Yes** — margin 10 → 4 → −11 → −12; status `attention` → `blocked` | run above | Yes |
| `jurisdiction` | Yes (`asOf?`) | **No** for this fixture — one VA history entry | run above | n/a |
| `aid-eligibility` | Yes (deadline resolution) | **No** verdict change — status block precedes deadlines | run above | n/a |
| `opt-budget` | **No** (0 occurrences) | **No** | `grep -c asOf` = 0 | Preserve as-is |
| `cpt-ledger` | **No** | **No** — 342 / 23 / amber at every date | run above | Preserve as-is |

Neither `opt-budget` nor `cpt-ledger` was modified. Their time-invariance is correct architecture, not a gap.

**One genuinely elegant invariant surfaced:** `projectedTerminationDate` stays `2026-08-14` at every `asOf`, because it is `asOf + daysRemaining + 1` and the two terms cancel. The engine names a fixed real-world date that does not drift as you scrub. That is a lovely property — and it requires a paragraph to explain, which is exactly what a 15-second demo cannot afford.

---

## Phase 3 — competition value test: **FAIL**

| Question | Answer |
|---|---|
| Immediately understandable? | Yes — but what it shows is one bar sliding |
| Creates a memorable moment? | **No.** One colour change is not a moment |
| Reinforces the thesis? | **No — it contradicts it.** The thesis is *three offices*. Two of the three are provably static |
| Makes "it's just if-statements" harder to dismiss? | **Barely.** Watching one linear counter increment is, if anything, *evidence for* the accusation |
| Demonstrates determinism? | Partly — drag-back-and-match is real, and it held exactly across the full sequence |
| Feel more sophisticated? | **No.** A slider driving one gauge reads as less sophisticated than the refusal band |
| Adds cognitive load? | Yes — a fourth interaction model and a new route |
| Distracts from the refusal climax? | **Yes.** It competes for the same "watch this change" attention |
| Under 20 seconds? | Yes |
| Needs legal detail explained first? | Yes — why 90 and not 150 requires explaining the STEM lock |
| Would a judge understand why the date changes the answer? | For the one gauge, yes. And then ask why the other two didn't |

**Phase 3 is a gate, and it failed. I stopped there, per the brief.**

---

## Phase 10 — TEMPORAL SCRUBBER VERDICT

| | |
|---|---|
| **A. Concept validation** | **FAIL** — one band flip in 420 days, not three; two of three offices time-invariant |
| **B. Existing-engine compatibility** | **PASS** — `asOf` threading is real and would have worked |
| **C. Competition value** | **FAIL** — see Phase 3 |
| **D. Safety against frozen architecture** | **PASS** (untested in practice — nothing was built) |
| **E. Regression status** | **PASS** — zero files changed, tree clean |
| **F. Visual quality** | **N/A** — not built |
| **G. Storytelling value** | **FAIL** — contradicts "three offices" rather than supporting it |
| **H. Final recommendation** | **REJECT** |

Nothing to revert: no component, route, test, style or navigation entry was created. The only artifacts were two throwaway probe scripts under `.test-out/` (build output), both deleted.

---

## Why this was rejected rather than revised

A weaker version — scrub only the unemployment clock, drop the cross-domain framing — is technically buildable. It is still rejected:

- It would put a **new route on a verified release candidate** to show a single counter incrementing.
- The demo sentence would become *"watch this one number go up"*, which is worse than saying nothing.
- The strongest thing in it, the drag-back determinism proof, is available **for free in the existing product** — `/check` recomputes from your inputs, and re-entering the same inputs returns the same verdict, on a screen that already exists and is already audited.

---

## What this changes about the release

**Nothing.** The release candidate stands exactly as verified: 0 A findings, 0 B findings, application code frozen at `58d809d`.

The correct answer to *"is there one more feature?"* is the one the previous audit offered as its own fallback and I should have weighted more heavily before recommending: **PathWise is already stronger without another surface; improve the demonstration instead.**

The remaining highest-value work is delivery — the three-second silence after **Add to my record**, rehearsed with a clock.

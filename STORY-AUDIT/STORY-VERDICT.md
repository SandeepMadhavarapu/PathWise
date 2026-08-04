# STORY-VERDICT

## PART 25 · Final questions

| # | Question | Answer |
|---|---|---|
| 1 | Judge understands the student problem in 5 seconds? | **YES** — the headline is a problem statement, above the fold at 1440, 1280 and 390 |
| 2 | Understands what makes PathWise different in 30 seconds? | **YES** — `1 / 2 / 43 / 5`, then the refusal band |
| 3 | Understands the architecture without reading source? | **YES** — `/coverage` prints the actual rule packs; findings descend to the file the engine read |
| 4 | UI visibly demonstrates auditable reasoning? | **YES** — per-step provenance, unknowns with `how_to_resolve`, and a moot / load-bearing distinction |
| 5 | Refusal reads as intentional correctness? | **YES** — framed as *"AND ONE IT WOULD NOT MAKE"* before the state appears |
| 6 | Student is the protagonist, not the technology? | **YES** — Priya is introduced by name with her stakes before any capability claim |
| 7 | Feels original, not a generic eligibility checker? | **YES** — an eligibility checker cannot say *"this unknown is moot, and here is why"* |
| 8 | Enough memorable moments already? | **YES** — three, in narrative order. A fourth would compete |
| 9 | Any feature worth reopening the RC for? | **NO** |
| 10 | Is presentation now the limiting factor? | **YES** |

**A: 0 · B: 0 · C: 0 · D: 14**

---

## PART 21 · Story compression

**5 seconds**
> Three offices decide an international student's future. None of them sees the whole student.

**15 seconds**
> Immigration, tuition residency and financial aid are decided by three offices that never speak to each other. PathWise reasons across all three from one record, shows the regulation behind every answer, and names the office that actually decides.

**30 seconds**
> …and when the record genuinely can't settle a question, it says so instead of guessing. One missing document means the same engine reads Priya's CPT two honest ways, 210 days apart, on either side of the line that ends her work authorization. It refuses to pick — until the document arrives, and then it changes its mind on screen.

**60 seconds**
> …every rule is a cited, dated JSON file the engines read; one state is modelled in full and the page counts that for you, so we can't inflate it. Nothing is stored — no account, no server, no network request after load. And every finding tells you not just what's unknown, but whether that unknown would actually change the answer.

### One sentence

> **PathWise is the reasoning engine that refuses to guess about a student's immigration, residency and financial-aid status — and shows you exactly why it can't.**

---

# FINAL VERDICT

# A. STORY IS READY — CHANGE NOTHING

**The product does not need more features. The highest-value remaining work is presentation and delivery.**

I went looking for a comprehension gap and did not find one. The strongest thing this audit surfaced is not a weakness — it is that the unknowns on `/student/finding/aid` distinguish an unknown that would change the answer from one that is moot, and explain the difference in the engine's own words:

> *"It is moot for this student either way: F-1 status blocks Virginia state financial aid… PathWise reports it because it is genuinely absent from the record, not because producing it would change this finding."*

No competing team will build that, and no judge who reads it will mistake this for if-statements.

The single risk to ranking is not that the product fails to communicate. It is whether a judge reaches that screen inside five minutes. The script already routes through it at 1:15. **That is rehearsal, not engineering.**

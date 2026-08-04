# STORY-FINDINGS

**Investigation only. No application file modified.** Evidence: `STORY-AUDIT/screenshots/` (20 fresh captures from production, 1440×900 / 1280×720 / 390×844), `story-evidence.json`.

---

## Correction to the brief

`/domicile` and `/aid` **do not exist**. Verified against production:

```
/domicile  404          /student/finding/domicile  200
/aid       404          /student/finding/aid       200
```

11 real routes, all 200. This is a naming slip in the brief, not a product defect. **D.**

---

## PART 4 · The 5-second test — **PASS**

Evidence: `01-landing-initial-1440x900.png`, `-1280x720.png`, `-390x844.png`.

Above the fold at every size tested, in reading order:

| Question | Answered by | Verdict |
|---|---|---|
| What is PathWise? | *"PathWise is one reasoning engine over one record, so it catches what falls between them."* | ✅ |
| Who is it for? | *"An international student's immigration status, tuition residency and financial aid…"* | ✅ |
| What problem? | **"Three offices decide your fate. None of them can see the whole you."** | ✅ |
| Why important? | *"Priya… 23 days from a limit that would end her OPT eligibility"* | ✅ |
| Different from a chatbot? | The `1 / 2 / 43 / 5` honesty panel, above the fold, before any capability claim | ✅ |
| What next? | Two peer CTAs: **Check my status →** / **See the worked example →** | ✅ |

### Could a judge misread it?

| Misreading | Prevented by |
|---|---|
| Generic student dashboard | The headline is a *problem statement*, not a product name |
| Immigration FAQ | Three live verdicts with citations and named offices, computed on the page |
| AI wrapper | No AI vocabulary anywhere; the refusal band contradicts generative behaviour |
| Rules database | `1 modelled in full / 43 source captured` — a database would claim 51 |
| Form validator | No form on the landing at all |
| Financial-aid checker | Aid is one of three cards, never the first |

**No misreading path found. D.**

---

## PART 5 · The 30-second test — **PASS**

**What a judge would actually say:**
> *"It's a thing for international students that answers immigration, residency and financial aid together — and it refuses to answer when it can't prove the answer."*

**What they should say:** the same sentence.

**They match.** No gap to close. **D.**

---

## PART 9 · The refusal moment — **PASS, and stronger than expected**

Evidence: `02-landing-refusal-1440x900.png`, `08-changed-refusal-1440x900.png`, `09-changed-collapsed-1440x900.png`.

The landing carries, above the band: **"AND ONE IT WOULD NOT MAKE"** — the framing arrives *before* the state, so `Unable to verify` cannot read as an error. The band is drawn to scale, dashed, straddling a red `365-DAY CLIFF` line, labelled `between 342 and 552`, with the caption *"So PathWise says so, instead of picking one."*

`/student/changed` states the stakes first: *"210 days apart, on either side of the line that decides whether she has any work authorization left at this level after she graduates. So PathWise will not pick one."*

**Reads as intentional correctness, not a crash. D.**

---

## PART 10 · The reasoning chain — **PASS, and it exceeds the brief's own spec**

Evidence: `05-finding-residency`, `06-finding-reasoning-expanded`, `07-finding-aid-unknowns`.

Every element the brief asked for is on screen: numbered claims, the events and evidence each step rests on, the rule quoted, `Verified on 2026-07-24`, **Read the source →**, **Open the Virginia residency rules this finding was decided by →**, and `Decided by: Domicile Officer — PathWise advises, the office decides.`

**And one thing the brief did not ask for.** The unknowns on `/student/finding/aid` distinguish *load-bearing* unknowns from *moot* ones, in the engine's own words:

> *"It is moot for this student either way: F-1 status blocks Virginia state financial aid, so no provision below is an available route… PathWise reports it because it is genuinely absent from the record, not because producing it would change this finding."*
>
> **HOW TO RESOLVE** *"Nothing needs to be produced for this finding. Keep the document if you have it — it becomes relevant again only if the status this rests on changes."*

Plus `WHAT COULD STILL CHANGE · UNDER LITIGATION` rendering volatility.

**A system that tells you an unknown does not matter, and why, is not a system a judge mistakes for if-statements.** This is the single strongest artifact in the product and it is two clicks from the landing. **D.**

---

## PART 11 · The cross-engine story — **PRESENT, not buried. A (clearly demonstrated).**

Evidence: `10-crossengine-moment-1440x900.png`.

The relationship is demonstrated **twice**, statically and dynamically:

- **Static** — `/student` hero: *"One fact — Priya's F-1 status — closes two doors, in two different buildings."*
- **Dynamic** — `/moment`: one job offer → **4 consequences in 2 of her 3 offices**, including a card explicitly marked `counter-intuitive` / `does not apply`: *"A job offer looks like a residency intent factor — but F-1 status blocks Virginia domicile entirely, so this changes nothing for residency."*

**That card is the invariance result rendered as product copy** — the same property my engine audit proved by mutation (M5/M6/M7). It is not only present; it is labelled and explained.

Discoverability: `/moment` is a rail item ("One event, many effects") and is linked from `/student`'s "More of this example". **Recommending exposure would be recommending something already exposed. D.**

---

## PART 12 · "Just if-statements" — **the product answers this itself**

Visible without a presenter: per-step provenance; explicit unknowns *with* a moot/load-bearing distinction; `Verified on` dates; the actual rule-pack JSON printed on `/coverage`; Ohio on `/check` returning *"no rule pack is registered, so PathWise ran no Ohio engine and reached no Ohio verdict"*; a counter-intuitive consequence the system reasons **against** the obvious answer.

An if-statement pile does not know which of its unknowns are irrelevant. **D.**

---

## PART 15 · Generic-dashboard attack

| Route | Mistakable? | Why |
|---|---|---|
| `/student` | **No** | Every card carries a citation chip (`8 CFR 214.2(f)(10)`, `SCHEV Pt II §03(A)`) and a named office. `Blocked by status` sits beside *"Not an error — a reasoned finding."* No SaaS dashboard writes that |
| `/coverage` | **No** | Four honest counts and raw JSON. A dashboard shows what it has; this shows what it doesn't |
| `/check` | **Partly** — it is a form. But the result is second-person and cited, and the routing note names the agency when no pack exists |

**D.**

---

## PART 16 · The three strongest moments

| # | Moment | Route / state | Why memorable |
|---|---|---|---|
| 1 | The span collapsing | `/student/changed` → `09-changed-collapsed` | Two honest readings, opposite sides of a cliff, resolved by a real file read in the tab |
| 2 | `1 / 2 / 43 / 5` | `/` above the fold | A product volunteering what it hasn't done, before any claim |
| 3 | *"this changes nothing for residency"* | `/moment` post-reveal | The system reasoning **against** the intuitive answer |

**Too many competing moments?** No — three, and they arrive in narrative order (honesty → stakes → proof). **D.**

---

## PART 19 · The five strongest hostile attacks

| Attack | True? | Defence already in the product |
|---|---|---|
| "Only one state modelled" | **True** | Conceded in the first eight seconds, in pack-derived numbers |
| "The fixture is tuned" | Partly | `/check` with Ohio proves the engine's behaviour on records it wasn't built for |
| "No users, no validation" | **True** | No defence. Concede it |
| "No attorney reviewed this" | **True** | Nothing is presented as a determination; every screen names the deciding office |
| "It refuses — so it doesn't work" | **False** | The refusal ships with a range, a reason, and the one document that resolves it |

The two true attacks are already conceded by the product itself. **No product change addresses either.**

---

## PART 22 · Judge explains it back

**What the current product actually causes:**
> *"There was one for international students — immigration, residency and financial aid all at once. The thing I remember is it refused to answer one question. It showed two possible counts on either side of a legal cliff and said it couldn't tell which was true until a document arrived. Then someone added the document and it changed its mind on screen. And it kept saying which office actually decides, which wasn't them."*

**What we want:** the same, plus *"and every answer showed the regulation it came from."*

**The gap is one clause, and it is available on any finding page in two clicks.** That is a *demo-path* problem, not a product problem — the 5-minute script already routes through `/student/finding/residency` at 1:15.

---

## Findings tally

**A: 0 · B: 0 · C: 0 · D: 14**

The only C-class item known to this project — `/moment`'s empty pre-click state — was re-inspected. It is a deliberate reveal whose post-click state is the product's third-strongest moment, and it is excluded from both demo scripts. **Re-affirmed C, do not implement.**

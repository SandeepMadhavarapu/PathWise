# 02 — Research & Citations (the rules survive here)

> **ARCHIVED RESEARCH NOTE — NOT A DESCRIPTION OF THE SHIPPING PRODUCT.**
> This file is the original research log, kept as a record of what was read and when. It is not
> imported, built, tested or served by anything, and it has **not** been kept in step with the
> live rule packs. The authoritative statement of what PathWise encodes is
> `pathwise-app/lib/rulepacks/` and the engines that read it.
> At least one rule recorded below was later searched for in the primary sources, **not found**,
> and removed from the product — see the correction marked **[SUPERSEDED]** in section C. Where
> this file and the app disagree, the app is right.

Every rule the product encodes, quoted with its source. If all code is lost, the product's
*knowledge* is preserved in this file plus the `rulepacks/`. **Re-verify every citation against its
primary source in the final week — this policy area moved five times in the last 18 months.**

---

## A. F-1 Practical Training (Engine A) — federal regulation

### A.1 The CPT/OPT interaction is a real, computable trap
**8 CFR 214.2(f)(10):** a student may be authorized 12 months of practical training, and becomes
eligible for OPT after one full academic year. Three consequences we encode:

- **The 365-day cliff.** Accumulating **365 or more days of full-time CPT removes OPT eligibility
  entirely.** Fewer than 365 does not. (This is a hard cliff, not a deduction.)
- **Overlap aggregation.** Multiple overlapping *part-time* CPT authorizations may aggregate to
  *full-time* CPT days. A student with two concurrent 12-hour/week authorizations (24 hrs/week
  total) is accruing full-time CPT days during the overlap, even though neither authorization alone
  is full-time. Part-time CPT = 20 hrs/week or less; more than 20 = full-time.
- **The level reset.** The cap is **per education level.** Bachelor's CPT does NOT carry into a
  master's. The ledger must partition by level.

### A.2 OPT deduction arithmetic
- Pre-completion OPT counts against the 12-month total.
- **Part-time** pre-completion OPT (20 hrs/week or less) is deducted at a **half rate**.
- **Authorized is not worked.** USCIS policy is explicit: overtime and periods of unemployment are
  *not* recomputed — usage runs on **authorized periods**, not hours actually worked. (This is why a
  chatbot gets it wrong and a rules engine gets it right.)

### A.3 The live unemployment clock (automatic termination)
This was NOT in the earlier planning docs and is the single most compelling feature available.

- Post-completion OPT: **90 days** of unemployment allowed. STEM OPT adds **60 more → 150 total**
  across the entire OPT period.
- At **150 days** of unemployment — or **90 days without reporting employment** — SEVP
  **automatically terminates the SEVIS record.**
- **Days are cumulative, not consecutive.** A signed offer with a *later* start date means the days
  between now and the start date still count.
- A single 15-hr/week job does **not** stop the counter (must be >= 20 hrs/week to qualify). Two
  12-hour qualifying positions do.
- Time spent abroad while unemployed generally still counts.
- Crossing the cap puts the student out of status on **day 151 — with NO 60-day grace period** for
  that violation.
- Reporting duties: report within **10 days** of receiving the STEM EAD; **validation reports every
  6 months**; report any change of employer/address within 10 days.

Build this as a **live counter**: "You are at day 67 of 90. At your current gap you cross the limit
on [date]."

### A.4 Grace period & deadline facts (for the reminder/consequence engine)
- Grace period ends **60 days after the I-20 end date** (or EAD end date if on OPT), whichever comes
  first — and only if a qualifying action (post-completion OPT, transfer, level-up, or change of
  status) occurred **before** the 60 days expire.
- OPT: apply as early as **90 days before** program end, no later than **60 days after**. Once the
  OPT I-20 is issued, **Form I-765 must be filed within 30 days of that issue date.** USCIS must
  receive it within 30 days of the recommendation AND before the grace period ends, whichever is
  sooner. File late → denial.
- I-20 extension must be requested **before** it expires; cannot be extended retroactively.
- I-20 expiration date and program completion date are **not always the same**; the 60-day grace
  period starts the day after degree requirements are met.
- Level-up requires the DSO to issue a new I-20 for the new program **before** the grace period ends.
- STEM OPT: apply up to **90 days before** the EAD end date and before that date.

---

## B. Virginia Domicile (Engine B) — SCHEV guidelines

SCHEV issues these under **Code of Virginia §23.1-510(D)** to ensure uniform criteria across all
Virginia institutions. This makes Virginia one of the few states with a genuinely uniform, citable,
statewide rule set — which is why it's our flagship.

- **The eligible-alien gate (runs FIRST).** The institution shall first determine whether the
  student is a national or an alien. Holders of student/temporary visas cannot establish domicile.
  Cite: **Part II §03(A) & §02(4).** `stops_analysis: true`.
- **The one-year clock.** Domicile must be established for **one year prior to the date of alleged
  entitlement** — defined as the first official day of class of the term.
- **The clock does not start on arrival.** The institution must look at the **date on which the last
  of the factors** supporting domicile occurred. Cite: **§05(C)(1).**
- **Dependency + seven exceptions.** Students under **24** are rebuttably presumed dependent unless:
  veteran/active-duty; graduate or professional student; married; ward of court; both parents
  deceased with no guardian; has legal dependents other than a spouse; or financial self-sufficiency.
  Cite: **§09(C)(1).**
- **Auxiliary-acts warning.** Acts auxiliary to educational objectives, or routinely performed by
  temporary residents (driver's license, vehicle registration, post-admission employment, VA tax
  filing), carry little weight. Cite: **§06(B).**
- ~~**The single most important quote:** SCHEV's own guidance says *"In complex cases, construe [the
  facts] in the light most favorable to the student."* — this is our tie-breaker philosophy.~~
  **[SUPERSEDED — the quote could not be found and the rule was removed.]** The phrase was searched
  for in the SCHEV Domicile Guidelines (32pp, effective 11 Jan 2021), Addenda A–C, and Code of
  Virginia Title 23.1 Chapter 5 including §§ 23.1-502 and 23.1-503. *"favorab"*, *"in favor"*,
  *"most favorable"* and *"light most"* return **zero matches** across all of them. The only
  *"construe"* hit is a savings clause pointing the other way, and § 23.1-503 puts the burden on
  the **student** to establish domicile by clear and convincing evidence — the opposite of a
  student-favourable tie-breaker. PathWise never shipped this: the rule
  `favor_student_in_complex_cases` and its reasoner were both removed from
  `pathwise-app/lib/rulepacks/va-domicile.json` and `lib/engines/domicile.ts`, which records the
  search in full. **This is not PathWise's tie-breaker philosophy and must not be quoted as one.**
  A student-favourable invention is still an invention.
- **Determinations do not transfer.** A prior determination by one institution is **not binding** on
  another.
- **Parental status alone cannot deny a student.** No student shall be denied in-state tuition solely
  because of parental status.

**Volatility:** the tuition-equity provision is subject to a DOJ challenge — mark `under_litigation`.

---

## C. Virginia Aid Eligibility (Engine C) — VASA / FAFSA

- **Which form?** Students eligible for FAFSA should file **FAFSA** — it covers both federal and
  state aid. The state alternative application (VASA) exists for students who cannot file FAFSA
  (e.g., undocumented / tuition-equity students).
- **F-1 blocks state aid.** Same status fact as the domicile gate (see B and thesis §2).
- **Virginia-student determination** via three provisions: domicile, military dependent, or tuition
  equity. Each has its own evidence checklist.
- **Deadline comparison.** The **VASA priority date is 1 March**; compare against the federal FAFSA
  date and surface the **earlier** one as the student's real deadline. Generalizes: a student's true
  deadline is the **earliest** of {college priority date, state deadline, federal deadline}.
- **Confidentiality.** SCHEV publicly confirmed campuses are legally prohibited from sharing VASA
  application information for immigration enforcement — this underpins our privacy posture.

---

## D. Coverage / residency-is-not-50-rulesets

Residency determination is made by a tuition classification officer **at each individual college**;
the decision is binding **only at that college**; there is usually **no appeal** beyond the
university; and qualifying at one school does not guarantee qualifying at another in the same state.
Duration requirements vary wildly (Arkansas 6 months, Alaska 24 months, Tennessee no durational
component) and the clock anchor differs by state (initial enrollment vs. census date vs. application
date vs. residency-determination date). **Therefore we do NOT hardcode 50 states.** We ship a
rule-pack architecture, model a few states deeply, and list all 51 jurisdictions honestly in
`coverage.json`. See `08-decisions-log.md`.

---

## Verification log

| Rule area | Primary source | Last verified | Re-verify before submit? |
|-----------|----------------|---------------|--------------------------|
| CPT/OPT federal | 8 CFR 214.2(f)(10), USCIS Policy Manual | 2026-07-24 | YES |
| Unemployment clock | SEVP guidance | 2026-07-24 | YES |
| VA domicile | SCHEV Guidelines §23.1-510(D) | 2026-07-24 | YES |
| VA aid / VASA | SCHEV VASA guidance | 2026-07-24 | YES |

> Discipline: in the final week, re-check every rule against its primary source. A rule correct
> today may be wrong on 21 August.

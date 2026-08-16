# 11 — The 500-Word Write-Up (Deliverable #2)

**Title:** PathWise
**Category:** Overcoming Obstacles

> Paste the text between the lines into the submission form. Word count: **497.**

---

An international student's future is decided by three offices that never talk to each other: the
DSO who governs their visa, the registrar who decides their tuition rate, and financial aid. Each
sees a fragment. None sees the student. So students get blindsided by problems no single office
would ever catch.

PathWise is one reasoning engine over one student record, with three rule domains plugged into it.
It notices the things that fall between the offices.

The core insight is mechanical, not marketing: immigration status is the hidden variable that
controls all three domains at once. Virginia's own domicile guidelines state that a student-visa
holder cannot establish domicile — and the same status independently blocks Virginia state
financial aid. One fact, two doors closed, in two different buildings. A FAFSA tool cannot see it.
A visa chatbot cannot see tuition classification. PathWise sees both, because it is one record.

Underneath is real regulatory arithmetic, not generated text. The CPT ledger reconstructs a
multi-school, multi-level history and detects the 365-day full-time cliff that ends OPT eligibility
— including the trap where two *part-time* internships overlap and silently aggregate to full-time.
Our example student sits at 342 days: 288 solid, plus 54 she would never have seen, 23 days from
losing OPT entirely. A live unemployment counter tracks the 90/150-day limit that triggers automatic
SEVIS termination, and correctly refuses to stop when a signed job offer has a future start date.
The OPT budget deducts part-time pre-completion time at half rate, computed on authorized periods —
never hours worked, which is what students consistently get backwards.

Every rule lives in a cited, dated JSON rule pack, not buried in code. Every finding on screen
carries its regulation inline, names the office that actually decides, and says plainly what it
could not verify. PathWise advises; the office decides.

Two screens show what a static tool cannot. "My Journey" keeps a persistent timeline across
institutions, so the student never re-explains their history. "What Changed?" runs the engine twice
over the same authorizations: with the missing level-change document, 342 days and OPT intact;
without it, 552 days and OPT gone. Because the two honest readings land on opposite sides of the
cliff, the finding sits in "unable to verify" — and adding the document makes it recompute live.

It requires no account and sends nothing to a server. For a population that reasonably fears data
collection, that is not a feature; it is the difference between using the tool and closing the tab.

Virginia is modelled in full, two more partially; the other 48 of fifty-one carry an honest status
— 43 source captured, 5 unable to verify. Adding a jurisdiction means authoring one more rule pack,
not writing code — and a regression test asserts that no state is ever shown another state's
citation.

Students shouldn't need to become paralegals to keep their status. PathWise holds the history,
does the arithmetic, shows its work, and says what to do next.

---

## Notes for submitting
- **Word count is 497** — do not add sentences without cutting others; over-length can disqualify.
- Category to select: **Overcoming Obstacles**.
- Keep the tools list separate (deliverable #5): Claude Code / Claude API, Next.js, React,
  TypeScript, Vercel, GitHub — plus anything else actually used.
- Re-read after final rule re-verification; if any number changes on screen (342/23/54, 90/150,
  12-month budget), change it here too.

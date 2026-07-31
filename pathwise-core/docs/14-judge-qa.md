# 14 — Judge Q&A: the questions that can hurt, and the answers

Ranked by how much damage a bad answer does. Every answer below is backed by something on screen —
the **Proof** line tells you where to click if the judge pushes.

**Three rules for all Q&A:**
1. **Concede the true part first.** Judges trust a team that agrees with a fair criticism. Every
   strong answer below opens by conceding something real.
2. **Never bluff a number.** "I'd have to check" is a fine answer. A wrong number in Q&A undoes a
   perfect demo, because the whole pitch is that this product doesn't guess.
3. **Answer in under 30 seconds, then stop.** Over-explaining reads as defensiveness.

---

## TIER 1 — The four that can lose it

### Q1. "Where's the AI? Isn't this just a rules engine?"
*The most likely question in the room, and the one most teams would fumble.*

> "Correct — there is no model in it, and that's the design decision, not a gap. In this domain a
> confident wrong answer costs someone a year of their life or their legal status. A language model
> can't tell you which of two readings of a record is true; it picks the one that sounds likelier.
> The signature moment in this demo is the one where the product *declines* — and you cannot get
> calibrated refusal out of a system optimised to produce fluent text.
>
> Where a model genuinely would help is reading documents, and we deliberately stopped short of it.
> That's why the level change is recorded as **asserted**, not **extracted**. We named the boundary
> instead of blurring it."

**Proof:** `/student/changed` — the confidence note under the attestation.
**Do not say:** "AI is overhated" or anything that sounds like sour grapes. Concede the tool is
powerful; argue it's wrong *here*.

---

### Q2. "You've only modelled one state. How is that a product?"

> "One modelled in full, two partial, forty-three where the deciding agency and its published rule
> are captured and linked. And the part I'd point at is that those counts are *derived from the rule
> packs* — I can't make that page say a bigger number by editing it. Only by authoring a pack that
> passes the tests.
>
> Adding Maryland is authoring one JSON file and registering it. No engine code changes. So the
> claim isn't 'we did fifty' — it's that fifty is now a data problem, not an engineering one, and
> the map tells the truth about where we actually are."

**Proof:** `/coverage` → the four counts, then the rule-pack viewer showing `lib/rulepacks/*.json`.

---

### Q3. "If a student follows this and gets deported, who's liable?"

> "Every finding names the office that actually decides — SEVP, the domicile officer, SCHEV — and
> every screen ends with 'PathWise advises; the office decides.' We never issue a determination. We
> show what the regulation says, quote it, date when we verified it, and name who to ask.
>
> That's the line between decision support and practising immigration law without a licence, and we
> built the product around it rather than adding a disclaimer at the end."

**Proof:** any finding page — **Decided by: Domicile Officer — PathWise advises, the office decides.**

---

### Q4. "An LLM wrapper could do this in a weekend. Why didn't you?"

> "It could produce something that *looks* like this in a weekend — and it would be wrong in ways
> nobody could see. Take the case in the demo: two part-time CPT authorizations that overlap for 54
> days and aggregate to full-time. Each one looks compliant on its own. There's no prompt that
> reliably catches that, because it isn't a language problem — it's interval arithmetic against a
> per-level cap.
>
> And the harder half isn't the engine at all. It's that the same answer has to come out every time,
> that Virginia's rules never leak into an Ohio answer, and that when the record is genuinely
> ambiguous the product says so. Those are properties you test for, not prompt for."

**Proof:** the ledger on `/student`; `/check` with State = Ohio.

---

## TIER 2 — The sharp ones

### Q5. "'Unable to verify' is a cop-out. Users want answers."

> "Ask what the alternative is here. The two readings are 342 and 552 days, either side of a 365-day
> cliff. Picking one gives you a coin-flip chance of telling her she's fine when she has already
> lost OPT eligibility.
>
> And it isn't the absence of an answer — it's the range, the reason, and the one document that
> resolves it. That's more actionable than a guess, and the demo shows it resolving the moment the
> document arrives."

### Q6. "How do you keep 51 states' rules current? That's the actual problem."

> "Agreed — the engine is the easy half. Every pack carries a source URL, the date we verified it,
> and a volatility flag, and the coverage page shows all of it. When something is stale the product
> says so rather than quietly serving old law.
>
> What we haven't built is the monitoring that watches those sources. That's the honest gap, and
> it's the first thing I'd build next."

*Concede this one cleanly. Trying to claim it's solved is where teams lose credibility.*

### Q7. "Has an immigration attorney or a DSO reviewed this?"

> "No — and that's why nothing in it is presented as a determination. Every claim is traceable to
> the primary source we read: the regulation is quoted, the URL is on the pack, and the date we
> verified it is on the page. A reviewer can check any single finding in about a minute, which was
> the design goal precisely *because* we're not the authority."

*Never overstate this. Claiming review you don't have is the one answer that could disqualify you.*

### Q8. "Nothing is saved — so students re-enter everything every visit?"

> "Yes, and I'd defend it as the right default for this population specifically. Our user may well
> be on a library or shared family computer. A durable record of someone's visa status on a shared
> machine is the actual risk — not the network.
>
> A real deployment would offer opt-in, encrypted, client-side persistence. The default would still
> be this."

**Proof:** `/check` — the promise block above the form.

### Q9. "Is the overlapping-CPT case contrived?"

> "It's one of the commonest ways students cross the cliff without knowing, because each
> authorization is individually compliant and nobody is aggregating them. The counting only goes
> wrong when you look at one form at a time — which is exactly how it's done today."

### Q10. "Why would a student trust you over their DSO?"

> "They shouldn't, and the product doesn't ask them to — it points at the DSO. What it does is let
> them walk into that office already knowing which question to ask and which regulation it turns on.
> DSOs are carrying hundreds of students each; the bottleneck isn't their judgement, it's their
> time."

---

## TIER 3 — Business and scope

### Q11. "What's the business model?"
> "Institutional. This is work international student services offices already do by hand and can't
> scale. Per-seat to the institution — the student is the one person in this system who can't pay."

### Q12. "How does this fit a platform like Stellic?"
> "Stellic already holds the academic record — programme, level, dates, enrolment. That's most of
> the input this engine needs. The immigration and residency layer is the part no degree-audit
> system models, and it's decided by the same dates Stellic already has."

### Q13. "What's next if you win?"
> "Source monitoring for pack staleness, then the next five states by international enrolment, then
> a DSO-facing view — because the person who most needs the cross-domain answer is the adviser, not
> the student."

---

## The three sentences to have ready cold

**What is it?**
> "A reasoning engine over one student record that answers immigration, tuition residency and state
> aid together — and refuses to answer when the record genuinely can't settle it."

**Why is it hard?**
> "Three offices, three rulebooks, one set of facts, and nobody responsible for the overlap."

**Why should I believe it?**
> "Every answer on screen carries the regulation it came from, the date we verified it, and the
> office that actually decides. Open any one of them."

---

## Answers to never give

| Never say | Say instead |
|---|---|
| "It's basically AI-powered" | "There's no model in it, and that's deliberate." |
| "We support 50 states" | "One in full, two partial, forty-three sourced — and the page counts it for me." |
| "It's 100% accurate" | "Every finding is traceable to the source we read. Check any of them." |
| "A lawyer signed off" (if none has) | "No — which is why nothing here is a determination." |
| "That's a great question!" | Just answer it. |
| Anything you're not sure of | "I'd have to check that." |

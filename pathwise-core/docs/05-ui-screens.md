# 05 — Interface Design

## §7.1 The governing principle
**Complexity lives behind the interface. The student experiences clarity.** Three domains is an
enormous surface area; the design job is to hide all of it except the one thing that matters right
now. If the product ever looks like a cluttered dashboard, the Design score collapses (this is our
biggest score risk and biggest headroom — target 9/10).

## §7.2 Home screen — four decisions doing all the work
1. **One answer above three statuses.** The cross-domain finding is the hero of the screen. The
   three domain cards are secondary, below it.
2. **Every claim carries its citation inline.** "SCHEV Part II §03(A)" sits *inside* the sentence,
   not in a footnote or a disclaimer.
3. **"Blocked by status" is a status, not an error.** Residency isn't broken or empty — it has a
   reasoned finding that happens to be "ineligible," with the reason and citation.
4. **Next actions carry consequence and margin.** Not "deadline 18 August" but "before 18 August —
   24 days of margin." The difference between a date and a decision.

## §7.3 The six screens
1. **Landing / privacy** — one line ("Three offices decide your fate. None can see the whole you."),
   a "View example student" button (Priya — so a judge sees everything in 5 seconds with no upload),
   and explicit "we do not store this" language.
2. **Upload / facts** — drag I-20s, EADs, etc.; extraction with confidence scores; user-correctable
   fields that propagate.
3. **Home / the four decisions** — the hero cross-domain finding + three domain cards.
4. **Timeline** — the single source of truth, visualized; the CPT ledger bar lives here (stacked
   part-time bars merging into full-time during overlap).
5. **A finding detail** — the full reasoning chain: claim → from these events → from this evidence →
   this rule (cited) → this deciding office; unknowns with how-to-resolve.
6. **"I got a job" / life-event consequence screen** — the demo money moment (§8.4 in architecture).

## §7.4 Privacy posture (not a nice-to-have for this population)
SCHEV had to publicly address confidentiality fears about VASA, confirming campuses are legally
prohibited from sharing application info for enforcement. So:
- **No account required** to check eligibility.
- **Nothing sent to a server** that doesn't need to be there.
- **Explicit "we do not store this"** on the landing screen.
For international students this is the difference between using the tool and closing the tab.

## Micro-details worth building (ranked by demo-value-per-hour)
1. **Consequence preview on every deadline**, not just the date. "If you miss this: you fall out of
   status and cannot be reinstated without a formal process." Deadlines with consequences are
   decision support; without them they're a calendar.
2. **The "quiet risk" surfacer.** Priya uploads I-20s to ask about an internship; the system also
   says: "Separately — your I-20 expires in 47 days and you haven't taken any qualifying action."
   This one moment communicates the whole thesis.
3. **Shareable read-only case link** for the DSO/aid officer. Turns the Office Brief from a PDF into
   a workflow; it's the scale/impact story.
4. **Rule-pack file viewer in the UI.** ~10 min of work; lets us *show* the architecture claim.
5. **Confidence banding on extraction** with correction that re-fires the engines. Turns our biggest
   technical weakness (OCR errors) into a trust feature.
6. **Seeded demo student ("View example student").** Many judges never upload a file. If the product
   only works after upload, they see nothing.

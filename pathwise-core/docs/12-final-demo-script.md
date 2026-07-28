# 12 — The Final 2-Minute Demo Script (Deliverable #3)

Written **after** the UI, from the labels actually on screen. Hard cap **2:00**. Record after
feature freeze. This supersedes the earlier draft in `06-demo-script.md`.

**Every label in bold below is copied from the shipped build. If a label here does not match the
screen, the script is wrong, not the app** — re-read it before recording.

**Click path (rehearse until it's muscle memory):**
`/` → **See the whole record** → `/student` → **View Priya's full journey** → back → the ledger →
**See full reasoning** (on the Residency card) → **One missing document decides this count** →
`/student/changed` → **Use a sample document →** → tick the attestation → **Add to my record** → end.

---

## The script

**[0:00–0:15] The problem, and the mechanism, on the landing page.**

> "An international student's future is decided by three offices that never talk to each other —
> immigration, tuition residency, and financial aid. Each sees a fragment. None sees the student."

*On screen: the landing page. Do not scroll — the three system rows are already visible.*

---

**[0:15–0:30] One fact, three systems. (The thesis, and it is on screen already.)**

> "This is PathWise. One fact — Priya holds F-1 status — read by all three. Immigration says 23 days
> of margin. Virginia residency says blocked. Virginia state aid says blocked. Every one of those
> is computed on this page by the real engines, and every one carries the regulation and the office
> that actually decides it."

*On screen: the `One fact → three systems` block. Point at the two **Blocked** capsules and the
**SCHEV Pt II §03(A)** and **SCHEV VASA** citations. Then click **See the whole record →**.*

---

**[0:30–0:45] Her record, and what makes the two doors one finding.**

> "One student, one record. Two institutions, six events — nothing she ever has to re-explain."

*On `/student`: the hero reads **One fact — Priya's F-1 status — closes two doors, in two different
buildings.** Click **View Priya's full journey →**, scroll the timeline once, open one CPT row so
the evidence beneath it shows, then come back.*

> "And where the record is genuinely incomplete, it says so instead of guessing."

---

**[0:45–1:05] The arithmetic a chatbot can't do. (CPT ledger.)**

*Back on `/student`, ledger bar on screen.*

> "342 full-time CPT days across two schools and two degree levels. The cliff is 365 — cross it and
> she loses OPT entirely. 54 of those days came from two *part-time* internships that overlapped and
> aggregated to full-time. She would never have seen them. Her bachelor's days are partitioned out,
> because the cap resets by level. That is a rules engine, not a guess."

---

**[1:05–1:20] It shows its work.**

*Click **See full reasoning →** on the Residency card.*

> "Every answer opens up: the claim, the exact regulation quoted, the date we verified it, and the
> office that actually decides. PathWise advises — the office decides."

---

**[1:20–1:45] The hero moment: it refuses to guess.**

*Click the dark card, **One missing document decides this count**.*

> "Here is the part I'd watch. One document is missing — the level change between her two schools.
> With it, the engine reads 342 days and her OPT survives. Without it, the same engine over the same
> authorizations reads 552 — past the cliff, OPT gone. Two honest readings, opposite sides of the
> line. So PathWise says **unable to verify** instead of picking one."

*Click **Use a sample document →**. The read facts appear — bytes, type, SHA-256. Tick the
attestation checkbox. Click **Add to my record**.*

> "Add the document and it recomputes live. Note what it does *not* claim: it read the file's bytes,
> never its words, so the level change is recorded as **asserted** — her word, with a document
> attached. A system that reasons, and admits exactly what it doesn't know."

---

**[1:45–2:00] What remains possible, and the close.**

> "State aid is closed on status — so PathWise says what *is* still open: institutional and private
> aid, from the same office. Every rule is a cited, dated JSON file the engines read; Virginia is
> fully modelled, and all fifty states and DC are listed with an honest status, including the ones
> where the answer is still 'not yet'. No account, nothing stored on a server. Three offices decide
> your fate. None of them can see the whole you. PathWise does."

---

## Claims this script is allowed to make, and the ones it is not

Checked against the shipped build on 28 July 2026.

| Say | Never say |
|---|---|
| "Virginia is fully modelled; fifty states and DC are listed with an honest status" | ~~"Fifty states are in the app"~~ — one rule pack exists, not fifty |
| "one fact, read by three systems" / "closes two doors" | ~~"one event ripples across all three offices"~~ — signing an offer reaches two of the three |
| "**Use a sample document →**, then **Add to my record**" | ~~"Add the missing document"~~ — no such button has ever existed |
| "unable to verify" | ~~"it doesn't know"~~ — the phrase on screen is the one to say |
| "PathWise advises; the office decides" | any phrasing where PathWise decides |

## Recording discipline
- **Feature freeze first**, then record. Bugs only after freeze.
- Do **5+ takes**. No dead air, no "let me just click here," no mouse hunting.
- Pre-open the tabs / warm the pages so nothing loads slowly on camera.
- **Use the sample-document button, not the file picker** — the picker opens a native OS dialog that
  puts your own filesystem on camera and that some capture setups do not record at all.
- Give **1:20–1:45** room to breathe — it is the beat that wins.
- Clean screen capture at 1280px+, no browser clutter, no personal bookmarks visible.
- Upload early to YouTube/Vimeo/Loom — processing takes hours. Public or unlisted, and **test the
  link in an incognito window.**

## Fallback if a take runs long
Cut in this order: (1) shorten the scale sentence at 1:45, (2) trim the journey beat to 8s,
(3) trim the finding-detail beat to one sentence. **Never cut 1:20–1:45** — that is the win.

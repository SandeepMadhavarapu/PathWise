# 12 — The Final 5-Minute Demo Script (Deliverable #3)

Written **after** the UI, from the labels actually on screen. Hard cap **5:00**. Supersedes the
earlier draft in `06-demo-script.md` and the 2-minute version this file used to hold.

**Every label in bold below is copied from the shipped build. If a label here does not match the
screen, the script is wrong, not the app** — re-read it before recording.

Re-derived after the presentation pass. The previous revision of this file had gone stale: it still
said **See the whole record**, **View Priya's full journey** and **See full reasoning →** on the
residency card, and the first two of those no longer exist anywhere in the product.

**Click path (rehearse until it's muscle memory):**
`/` → **See the worked example →** → `/student` → rail **Why residency is blocked** → **Open the
Virginia residency rules this finding was decided by →** → back → `/student` → **One missing
document decides this count** → `/student/changed` → **Use a sample document →** → tick the
attestation → **Add to my record** → rail **State coverage** → rail **Check my status** → end.

**Two rules for the whole run.** Never say "AI", "LLM" or "model" — PathWise contains none. Never
say "we think" — every number on screen was computed, so say "it computed".

---

## The script

### [0:00–0:40] Landing — the trap, and the honesty

> "An international student's future is decided by three offices that never speak to each other.
> Immigration. Tuition residency. Financial aid. Each sees a fragment. None sees the student."

*Point at the right-hand panel, **THE RULES ARE DATA**. Then say nothing for two seconds.*

> "Before I show you what it does — that is what it has not done. One state modelled in full, two
> partially, forty-three where we captured the source and stopped, five we could not verify at all.
> Every one of those numbers is read from the rule files. You cannot make that map say 'modelled'
> by editing the map."

*Scroll past the two buttons to **WORKED EXAMPLE · Priya**.*

> "This is Priya. Master's student, two institutions, twenty-three days from a limit that would end
> her OPT eligibility — and no single office is in a position to tell her, because each of the three
> below decides one answer and none of them sees the other two."

*Scroll to the three cards.*

> "One fact — Priya holds F-1 status. Immigration: 23 days of margin. Virginia residency: blocked.
> Virginia state aid: blocked. All three computed on this page, right now, by the same engines the
> app runs on — each carrying the regulation and the office that actually decides it."

*Scroll to the refusal band. Point at it. **Do not explain it yet.***

> "And one it would not make. Hold that thought."

---

### [0:40–1:15] `/student` — one record, three readers

*Click **See the worked example →**.*

> "One student, one record. The same fact closing two doors in two different buildings — and nobody
> but Priya is positioned to notice, because no office sees the other two."

*Scroll to **The computation a chatbot can't do**.*

> "342 full-time CPT days across two schools and two degree levels. The cliff is 365 — cross it and
> OPT at this level is gone. Fifty-four of those days came from two *part-time* internships that
> overlapped and aggregated to full-time. Her bachelor's days are partitioned out, because the cap
> is counted per level. Nobody counting by hand finds that."

---

### [1:15–1:45] The finding — it shows its work

*Rail: **Why residency is blocked**.*

> "Every answer opens up. The claim, numbered in order. The regulation, quoted. The date we verified
> it. And the office that decides — which is never us."

*Click **Open the Virginia residency rules this finding was decided by →**.*

> "And this is the actual file the engine read. The rules are data, not code."

---

### [1:45–3:15] `/student/changed` — the payoff ⭐ *(the 90 seconds that win it)*

*Back to `/student`, click **One missing document decides this count**.*

> "Here is the part I would watch."

*Let the stakes line and the band sit for two seconds before speaking.*

> "One document is missing from Priya's file — the form recording her level change between two
> schools. With it, the engine reads 342 days. Without it, the same engine over the same
> authorizations reads 552. The cliff sits between them."

*Trace the span across the red **365-DAY CLIFF** line with your finger.*

> "Two honest readings. Opposite sides of the line. One keeps her work authorization after she
> graduates; the other ends it. So PathWise says **unable to verify** — and stops."

*Click **Use a sample document →**.*

> "It reads the file in this tab. 542 bytes. SHA-256. Never uploaded."

*Tick the attestation checkbox. Click **Add to my record**.*

> **[STOP TALKING. THREE FULL SECONDS. Let the span collapse.]**

> "One reading is ruled out. The count is determinate. And notice what it does *not* claim: it read
> the file's bytes, never its words — so the level change is recorded as **asserted**. Her word,
> with a document attached. PathWise advises. The DSO decides."

---

### [3:15–3:50] `/coverage` — does it generalise

*Rail: **State coverage**.*

> "Fifty states and DC, each rated per domain — because 'residency modelled, aid not' is a real
> state, and one badge per state would round it into a lie."

*Point at the heading above the legend.*

> "And this distinction, which I would argue is the whole product. **Unable to verify** is
> deliberately not **not modelled**. One is work not done. The other is work done that failed."

---

### [3:50–4:30] `/check` — it works on you

*Rail: **Check my status**. Change **State** to Ohio. Click **Check my status →**.*

> "Same engines, your facts. Ohio — no rule pack is registered, so PathWise ran no Ohio engine and
> reached no Ohio verdict. It names the agency that does decide. It will not run Virginia's rules
> under an Ohio heading."

*Point at the top right: **No account · nothing leaves this device**.*

> "No account. Nothing stored on a server. Nothing saved at all — this workspace lives in this tab,
> because our user might be on a library computer."

---

### [4:30–5:00] Close

> "Three offices decide an international student's future. None of them can see the whole student.
>
> PathWise sees all three, shows the regulation behind every answer, names the office that actually
> decides — and when the record genuinely cannot settle a question, it says so instead of guessing.
>
> That last part is the hard one. It is also the only one that matters."

---

## Screens that must NOT appear in the five minutes

- `/student/journey` — proves state, kills momentum.
- `/student/next` — 3,200px, no drama.
- `/student/finding/domicile` (Marcus) — magnificent depth, wrong audience for five minutes.
- `/moment` — the best surprise in the product (the unemployment counter does **not** stop when a
  future-dated offer is signed), and it costs 40 seconds the refusal needs more. Back pocket for Q&A.

## Claims this script is allowed to make, and the ones it is not

| Say | Never say |
|---|---|
| "one state modelled in full; fifty states and DC carry a status derived from the packs" | ~~"Fifty states are in the app"~~ — four rule packs exist, not fifty |
| "one fact, read by three systems" / "closes two doors" | ~~"one event ripples across all three offices"~~ — signing an offer reaches two of the three |
| "**Use a sample document →**, then **Add to my record**" | ~~"Add the missing document"~~ — no such button has ever existed |
| "unable to verify" | ~~"it doesn't know"~~ — the phrase on screen is the one to say |
| "OPT at this level is gone" | ~~"she loses OPT entirely"~~ — the cap is counted per education level |
| "PathWise advises; the office decides" | any phrasing where PathWise decides |

## Recording discipline
- **Feature freeze first**, then record. Bugs only after freeze.
- Do **5+ takes**. No dead air, no "let me just click here," no mouse hunting.
- Pre-open the tabs / warm the pages so nothing loads slowly on camera.
- **Use the sample-document button, not the file picker** — the picker opens a native OS dialog that
  puts your own filesystem on camera and that some capture setups do not record at all.
- Give **1:45–3:15** room to breathe — it is the beat that wins. The three-second silence after
  **Add to my record** is scripted, not a mistake; do not fill it.
- Clean screen capture at 1280px+, no browser clutter, no personal bookmarks visible.
- Upload early to YouTube/Vimeo/Loom — processing takes hours. Public or unlisted, and **test the
  link in an incognito window.**

## Fallback if a take runs long
Cut in this order: (1) the finding beat at 1:15–1:45, (2) `/check` at 3:50–4:30, (3) trim the
coverage beat to the one legend sentence. **Never cut 1:45–3:15** — that is the win.

## If you have three minutes instead of five
Landing → the ledger → the whole of `/student/changed` → the close. The refusal is the demo;
everything else is setup for it.

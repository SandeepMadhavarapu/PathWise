# 15 — Stress test and rehearsal plan

## PART A — The hostile judge

Read these as if someone in the room is actively trying to eliminate you. Each entry is an attack,
an honest assessment of whether it lands, and the counter.

| # | Attack | Lands? | Counter |
|---|---|---|---|
| A1 | "The demo student is fictional. You've tuned the fixture to make the product look clever." | **Partly — this is the sharpest attack you'll face.** | "The fixture is fictional; the engines aren't. Change the state to Ohio on `/check` and it refuses. Change the dates and the arithmetic moves. The record is invented — the reasoning over it isn't tuned to it." **Have `/check` ready to open.** |
| A2 | "You said no network requests. Prove it." | No — you win this one | Open DevTools → Network → reload → navigate three pages. Zero external requests. **Rehearse this; it's a 20-second flex.** |
| A3 | "You claim the coverage map can't be faked. Prove it." | No | `/coverage` → rule-pack viewer → the counts derive from `capabilities[]` in each pack. Editing the map changes nothing. |
| A4 | "342 and 552 — where does 552 come from?" | No | 342 (master's) + 210 (bachelor's, un-partitioned because the level change can't be shown). Say the arithmetic out loud; it's on the page. |
| A5 | "This only works because you picked Virginia, the one state you built." | **Partly** | Concede it: "Virginia is the one modelled in full — that's what the front page says before I say anything." Then pivot to Ohio on `/check`: the product's behaviour on an *unmodelled* state is the point. |
| A6 | "Accessibility is an afterthought in hackathon projects." | No | Tab from the top: skip link first. Every status is glyph + word + colour, never colour alone. Reduced-motion honoured. |
| A7 | "Show me a citation and prove it's real." | No | Any finding → **Open the Virginia residency rules this finding was decided by →** → source URL and `verified_on` in the pack. |
| A8 | "What if I resize the window / open it on my phone?" | No | 11 routes × 13 viewports, zero horizontal overflow. Hand them your phone. |
| A9 | "Your product refuses to answer. Isn't that a product that doesn't work?" | No | See Q5 in `14-judge-qa.md`. The refusal comes with a range, a reason and a resolution. |
| A10 | "Nobody asked for this." | **Partly** | Don't argue market size you can't evidence. "Every international student I know has been given confident wrong advice by someone. This is the version that shows its work." |

**The one attack with no good answer:** *"You have no users and no validation."* Concede it
immediately and completely — "Correct, it's not been in front of students yet; that's the next
thing" — and move on. Attempting to spin it costs more than the admission.

---

## PART B — Demo failure modes

Rehearse the recovery, not just the happy path.

| Risk | Prevention | Recovery line |
|---|---|---|
| Wi-Fi dies | **Everything is static and runs offline.** Load all pages once before you start; the app makes no network requests afterwards. | "Conveniently, this is the demo where that doesn't matter." *(Best possible save — use it.)* |
| Laptop sleeps / screensaver | Disable sleep, disable notifications, close Slack and mail | — |
| The file picker opens a native dialog on camera | **Always use "Use a sample document →", never "Choose a file from this device"** | — |
| Clicking the wrong rail item | The rail is the recovery: every screen is one click from every other | Say nothing. Click back. Do not apologise. |
| Band doesn't animate (reduced motion on the demo machine) | Check OS motion settings before you present | "The animation is off on this machine — the numbers are what matter." |
| Running long | Cut in the order given in the script's fallback table | — |
| A judge interrupts mid-demo | **Answer it, then say the bridge line below** | "Let me show you the part that answers that." |
| You blank on a number | Never invent one | "It's on the screen — let me pull it up." |

---

## PART C — Rehearsal plan

### Session 1 — Mechanics (do this first, ~40 min)
Run the click path with **no speech at all**, five times. Just clicks. You are building muscle
memory so your mouth is free later.

Target: reach **Add to my record** in under 90 seconds of clicking, with no hunting.

### Session 2 — Script, out loud (~60 min)
Read `12-final-demo-script.md` aloud three times without the app. Then three times with it.
**Record take 3.** Watch it with the sound off and ask: does the screen alone tell the story?

### Session 3 — Timing (~30 min)
Run it five times with a visible timer.
- If you're over 5:00, you are explaining. Cut adjectives, not beats.
- If you're under 4:30, you're rushing the refusal. Give it back the time.
- **Time the silence.** Three seconds feels like fifteen when you're presenting. Practise it with a
  clock until three seconds feels like three seconds.

### Session 4 — Q&A cold (~45 min)
Have someone read questions from `14-judge-qa.md` **out of order**, including the Tier 1 four.
Answer in under 30 seconds each. Then have them ask three questions that aren't in the file — the
point is to practise "I'd have to check that" without flinching.

### Session 5 — Full dress (~30 min)
Full 5-minute run + 10 minutes of hostile Q&A, on the actual demo machine, on the actual network,
with the actual browser profile you'll use. **Then run the 2-minute version cold**, because a
lightning round is where an unrehearsed team falls apart.

### The day before
- One full run in the morning. One in the evening. **Do not rehearse more than that** — over-drilled
  delivery goes flat.
- Charge everything. Pack the charger.
- Open every page once in the demo browser profile so nothing is cold.

---

## PART D — The first sixty seconds, memorised verbatim

If you memorise nothing else, memorise this. It is the minute that decides whether the rest is heard.

> "An international student's future is decided by three offices that never speak to each other.
> Immigration. Tuition residency. Financial aid. Each sees a fragment. None sees the student."
>
> *[point at the four counts]*
>
> "Before I show you what it does — that is what it has not done. One state modelled in full, two
> partially, forty-three where we captured the source and stopped, five we could not verify at all.
> Every one of those numbers is read from the rule files."
>
> *[scroll to Priya]*
>
> "This is Priya. Master's student, two institutions, twenty-three days from a limit that would end
> her OPT eligibility — and no single office is in a position to tell her."
>
> *[scroll to the cards]*
>
> "One fact: she holds F-1 status. Immigration says 23 days of margin. Virginia residency: blocked.
> Virginia state aid: blocked. All three computed on this page, right now, each carrying the
> regulation and the office that actually decides it."
>
> *[point at the refusal band]*
>
> "And one it would not make. Hold that thought."

**Why this order works:** the honesty claim lands before any capability claim, so everything after
it is heard as credible rather than as marketing. That is the whole strategy of the opening — you
are buying trust in the first fifteen seconds and spending it for the next four and a half minutes.

---

## PART E — Delivery notes

- **Slow down 20% more than feels right.** Every presenter speeds up under pressure. Judges cannot
  re-listen.
- **Point at the screen with your hand, not the cursor.** Cursor movement reads as hunting.
- **Never narrate your own clicks** ("now I'm going to click here"). Click, then speak to what
  appeared.
- **Do not say "as you can see."** Either they can, or your screen has failed you.
- **Land the last line and stop.** Do not add "…so, yeah, that's PathWise." The close is written to
  be final; let it be.

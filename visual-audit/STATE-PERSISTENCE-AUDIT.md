# STATE-PERSISTENCE-AUDIT

**Investigation only. No application file was modified.** Target: `https://path-wise-amber.vercel.app` (served production). Evidence: `visual-audit/temporal-state/`, `contact-sheet-state.png`, `state-evidence.json`.

---

## 1 · The complete state model

**There is no backend.** Verified by exhaustive search over `app/`, `components/`, `lib/`:

```
fetch( | axios | XMLHttpRequest | WebSocket | EventSource | "use server" | revalidate
  -> NONE

localStorage | sessionStorage | indexedDB | document.cookie | caches. |
navigator.storage | history.pushState | history.replaceState | useSearchParams | useRouter()
  -> NONE
```

The single grep hit is a *comment* in `app/coverage/page.tsx:258` explaining why `useSearchParams` was deliberately avoided. Every route is statically prerendered; every computation runs in the tab.

| State | Origin | Stored in | Survives | Reset by | Sent to backend | Persisted | Intentionally ephemeral |
|---|---|---|---|---|---|---|---|
| `status` (immigration) | `/check` select | `useState` | tab session | reload, new tab, `clearWorkspace()` | No | No | **Yes** |
| `state` (jurisdiction) | `/check` select | `useState` | tab session | as above | No | No | **Yes** |
| `rows[]` (CPT authorizations) | `/check` inputs | `useState` | tab session | as above | No | No | **Yes** |
| `presenceSince` | `/check` date input | `useState` | tab session | as above | No | No | **Yes** |
| `submitted` / `submitCount` | `/check` submit | `useState` | tab session | as above | No | No | **Yes** |
| `showReasoning` | `/check` disclosure | `useState` | tab session | as above | No | No | **Yes** |
| `read` (LocalFileRead) | `/student/changed` file read | `useState` | tab session | reload, nav away | No | No | **Yes** |
| `attestChecked` | `/student/changed` checkbox | `useState` | tab session | as above | No | No | **Yes** |
| `committed` | `/student/changed` commit | `useState` | tab session | as above | No | No | **Yes** |
| `busy` / `error` | `/student/changed` | `useState` | transient | any transition | No | No | **Yes** |
| Reasoning open/closed | `ReasoningTree`, `Callout`, `JourneyTimeline`, `NextStepCard`, `JobMoment`, `DeadlineExport` | `useState` | tab session | navigation | No | No | **Yes** |
| Rail collapsed | `AppShell` | `useState` | tab session | navigation | No | No | **Yes** |
| Student profile / findings / uncertainty | **Not state at all** — recomputed from fixtures + packs on every render | — | n/a | n/a | No | No | n/a |
| Current route | Next.js router | URL | n/a | n/a | No | No | n/a |
| Server-side state | **None exists** | — | — | — | — | — | — |

---

## 2 · Real-browser lifecycle results

| # | Test | Result | Evidence |
|---|---|---|---|
| A | Fresh visit | `F1 / VA`, empty, `ls=0 ss=0 cookie=0` | `check-01-fresh.png` |
| B | Enter information | held in memory, storage still `0/0/0` | `check-02-entered.png` |
| C+D | Navigate away, return by link | **fully reset** to `F1 / VA` | `check-04-after-nav-return.png` |
| **D2** | **Browser Back button** | **ALL FIELDS RESTORED** | **`check-09-back-button-detail.png`** |
| E | Refresh | **fully reset** | `check-06-refresh.png` |
| F | Same URL, new tab | **fully reset** | `check-07-new-tab.png` |
| G | Close and reopen tab | **fully reset** | `check-08-reopened-tab.png` |
| I | Sample document read | `evidenceRead: true`, storage `0/0/0` | `changed-02-document-read.png` |
| J | Document committed | band `settled: true`, verdict `Attention` | `changed-03-committed.png` |
| K | Refresh after commit | **fully reset** to `Unable to verify`, sample button back | `changed-04-after-refresh.png` |
| K2 | Navigate away and back | **fully reset** | `changed-05-after-nav.png` |

**Storage was `localStorage=0, sessionStorage=0, cookie=0` at every single step.** Tier 0 holds absolutely.

---

## 9 · Findings

### 🔴 A-1 — The `/check` privacy promise is provably false for the Back button

**Route:** `/check` · **Screenshot:** `check-09-back-button-detail.png` (the contradiction is visible in one frame)

**Reproduction**
1. Open `/check`
2. Set status `J-1`, state `Tennessee`, residence `2021-09-01`, CPT start `2024-06-03`, hours `40`
3. Navigate to `/student`
4. Press the browser **Back** button

**Measured**
```
entered   : status J1, state TN, presence 2021-09-01, cptStart 2024-06-03, hours 40
after Back: status J1, state TN, presence 2021-09-01, cptStart 2024-06-03, hours 40
SURVIVED  : status, state, presence, cptStart, hours   ← every field
storage   : ls=0 ss=0 cookie=0                          ← nothing persisted
```

**The page states, in the same viewport as the restored data:**

> "Nothing is saved, either. This workspace lives in this tab alone. **Leaving the page, going back, refreshing or closing the tab clears everything you have entered** — there is no history to come back to, on this device or any other. That is deliberate: **on a shared or public computer, nothing of yours is left behind.**"

**Underlying cause:** Chrome's back/forward cache restores the DOM including form control values. React state is rebuilt from the restored DOM. Nothing is written to storage — but the promise names *"going back"* explicitly, and the stated threat model is *"a shared or public computer"*, where pressing Back is precisely what the next person does.

**Why this is A and not B.** PathWise's entire thesis is that every claim on screen is checkable. This is a claim on screen that is checkable and **false**, and a hostile judge testing the privacy story finds it in two clicks. The damage is not the data exposure (it dies with the tab); it is that the product overclaims — the one thing it is built never to do.

**Smallest safe fix — copy only, zero behaviour change:**
Amend the sentence in `app/check/page.tsx` so it stops promising something the browser controls. It already makes the true, strong claims (no account, no server, no request, nothing written to disk); it only needs to stop naming the Back button.

- Files: `app/check/page.tsx` (one paragraph)
- Rule engine / packs / golden / uncertainty / routing / privacy architecture: **none touched**
- Verdicts, demo path: **unchanged**
- Regression risk: **very low** (text node in one client component)

**Alternative — behaviour fix (NOT recommended now):** an `onpageshow` handler clearing state when `event.persisted` is true. It makes the promise true rather than weaker, but it *changes runtime behaviour* on a verified RC and needs the full battery re-run. Copy first.

**Privacy implication of leaving it:** low in absolute terms (nothing persists past the tab), high in narrative terms.

---

### ⚪ D — Intentional, working as designed

| ID | Behaviour | Why it is correct |
|---|---|---|
| D-1 | Refresh, new tab, reopened tab, link navigation all reset everything | This is Tier 0. `ls/ss/cookie = 0` at all 16 measured states |
| D-2 | `/student/changed` resets after commit on refresh | It is a **worked example**, not the user's record. Re-running it from the top is the demo |
| D-3 | `/student/changed` has no "not saved" banner | It carries the claims that actually matter: *"nothing is uploaded"*, *"The document is never uploaded anywhere — it is read in this tab and released, and the re-computation runs on this device"*, plus the topbar *"No account · nothing leaves this device"*. My first regex missed these; they are present and correct |
| D-4 | `/check` with `J-1 / Tennessee` renders 3 cards but no `.hero` | Correct. The hero is the *cross-domain* "one fact closes two doors" finding; TN aid is `unable to verify` and residency `needs review`, so no such finding exists. Live region says so explicitly |
| D-5 | No `beforeunload` warning | Correct. Warning about losing data would contradict the design and add friction to an ephemeral tool |

**No B findings. No C findings.**

---

## 3 · Empty-document experience

`/student/changed` pre-document state (`changed-01-pre-document.png`) states, above the fold:

- **what is missing** — *"One document is missing from Priya's file — the form recording her level change"*
- **why no stronger determination** — *"the same engine reads her own CPT record two honest ways, 210 days apart, on either side of the line"*
- **what to do next** — **Use a sample document →** / **Choose a file from this device**
- **that the state is provisional** — the band reads `Unable to verify`, dashed, straddling the cliff
- **that evidence changes the reasoning** — *"So PathWise will not pick one."*

All five questions are answered on screen before any interaction. **No finding.**

---

## 4 · Document-added causal chain

Measured transition:

```
pre-document   bandVerdict "?"          settled false  evidenceRead false  committed false
document read  bandVerdict "?"          settled false  evidenceRead TRUE   committed false
committed      bandVerdict "Attention"  settled TRUE   evidenceRead true   committed TRUE
```

The chain is visually explicit and correctly ordered: the band is the climax, the evidence panel names bytes/type/SHA-256, the attestation gates the commit, and the span collapses only after it. **This is already excellent. Nothing is buried.**

---

## 8 · Backend → frontend trace

There is no backend, so the trace is short — and that is the strongest version of this story.

| Path | User action | Frontend state | Network | Engine | Pack/source | Rendered |
|---|---|---|---|---|---|---|
| A initial finding | load `/student` | none (props) | **none** | `residencyFindingFor` | `va-domicile.json` | HeroFinding + cards |
| B ambiguous | load `/student/changed` | `read=null` | **none** | `cptLevelChangeReadings` (2× `computeCptLedger`) | `f1-practical-training.json` | UncertaintyBand, dashed |
| C document added | click Add to my record | `committed=true` | **none** | same engine, evidence added | same pack | band collapses, `Attention` |
| D refusal | derived, not declared | `disagree` from 2 runs | **none** | ledger disagreement | cliff = 365 from pack | `Unable to verify` |
| E jurisdiction routing | pick Ohio on `/check` | `state="OH"` | **none** | `jurisdictionFor` | registry miss | *"no rule pack is registered, so PathWise ran no Ohio engine"* |

**The frontend is not displaying a fake demo.** Every verdict is the real engine output, computed in the tab, at render time.

---

## 5 · Privacy tradeoff

**Would persistent storage make PathWise stronger?** **No — it would undermine the trust story.**

| Risk | Assessment |
|---|---|
| Privacy risk | **High.** A durable record of someone's visa status on a library or family computer is the actual threat, not the network |
| Unexpected retention | Immigration status has no natural expiry the product could justify |
| Stale information | A rule pack updates; a cached verdict does not. PathWise would be serving old law from the user's own disk |
| Cross-user contamination | Shared machines are explicitly the stated user context |
| Confusing old documents | A previously attested I-20 reappearing weeks later is worse than re-entering |
| Security obligations | Storing it creates duties the product currently has none of |
| Misleading "saved" expectations | The moment anything persists, users assume everything does |

The current behaviour is not an absence of a feature. It is the feature — and it is the only privacy posture consistent with the population PathWise serves.

---

## 6 · Hostile-judge test, 60 seconds

| Question | Answer |
|---|---|
| Do I understand what happened? | Yes — the band, the panels and the change list narrate it |
| Do I understand why the result changed? | Yes — *"Why did this change? The rule didn't change."* |
| Do I know what PathWise retained? | Yes on `/check` (explicit block); inferable elsewhere from the topbar |
| Do I know what it did NOT retain? | Yes |
| Surprised by a refresh? | **On `/check`, no** — it says so. **On `/student/changed`, mildly** — but it is a worked example and replaying it is the point |
| Would I think the app is broken? | No |
| Does the absence of persistence look intentional or unfinished? | **Emphatically intentional** — it is stated as a design decision with its reason |

---

## 12 · FINAL DECISION

**CURRENT BEHAVIOR**
Every piece of user state lives in React `useState` and nowhere else. No storage API, no cookie, no URL state, no history manipulation, no network call, no backend. Refresh, new tab, tab close and link navigation all reset everything; storage measured `0/0/0` at all 16 states.

**WHAT IS INTENTIONAL**
All of it. Tier 0 ephemerality is designed, documented on `/check`, and consistent with the stated threat model of a shared or public computer.

**WHAT IS ACTUALLY A PROBLEM**
One thing: the `/check` promise says *"going back … clears everything you have entered"*, and Chrome's bfcache restores every field. The false claim and the restored data appear in the same screenshot.

**WHAT I WOULD FIX**
A-1, by **copy only** — stop naming the Back button in a promise the browser controls. One paragraph in `app/check/page.tsx`. No engine, pack, golden, verdict or demo-path change.

**WHAT I WOULD NOT FIX**
Persistence of any kind. The `/student/changed` reset. The absence of a `beforeunload` warning. The missing "not saved" banner on the worked-example routes. The `J-1 / Tennessee` no-hero result. None is a defect.

**PRIVACY TRADEOFF**
Persistence would make PathWise weaker, not stronger. The ephemerality *is* the trust story.

**COMPETITION IMPACT**
A-1 is low-probability but high-consequence: a judge who tests the privacy claim finds the product overclaiming, which is the single accusation PathWise cannot afford. The fix is a sentence.

**FINAL RECOMMENDATION**
Fix A-1 as a copy-only change. Change nothing else.

---

> ### Does PathWise currently tell a coherent story from user input → evidence → backend reasoning → uncertainty → verdict, without making the user wonder where their work went?
>
> # YES
>
> The story is coherent and the ephemerality is explained rather than merely imposed. **The one break is not in the story — it is in a single sentence that promises more than the browser delivers.**

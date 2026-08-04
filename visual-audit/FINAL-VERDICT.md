# FINAL VERDICT — PathWise visual evidence audit

Commit `719a93b` · Chrome/150.0.7871.188 headless · Windows 11 · local production build
(`next build` + `next start`, port 3210) and production (`https://path-wise-amber.vercel.app`).

---

## 1. Evidence totals

| # | Metric | Value |
|---|---|---|
| 1 | Routes inspected | **11 / 11** (all registered application routes) |
| 2 | Screenshots captured | **218** (115 viewport + 103 full-page) + 4 contact sheets |
| 3 | Interactive states captured | **48** non-initial captures across **25** distinct state names |
| 4 | Viewport combinations exercised | 5 required + 3 zoom viewports + 10 responsive widths |
| 5 | Desktop captures | 58 |
| 6 | Tablet captures | 11 |
| 7 | Mobile captures | 34 |
| 8 | **Console errors** | **0** across all 103 telemetry captures |
| 9 | **Console warnings** | **0** |
| 10 | **Failed network requests** | **0** |
| 11 | **Horizontal overflow failures** | **0** (10 widths × 6 routes, plus 5 viewports × 11 routes) |
| 12 | Clipping failures | **0** real (97 flagged, all `.sr-only` or collapsed disclosures — see D1) |
| 13 | Fixed-element overlaps | **0** (`.sidebar-cta` floating bar measured `overlapPx: 0`; `.content` carries 76px bottom padding) |
| 14 | Broken images | **0** |
| 15 | Broken links | **0** of 11 internal targets; 0 dev/localhost external URLs |
| 16 | Accessibility failures | **1** (FINDING 1, screen-reader only) |
| 17 | Metadata failures | **0** required fields missing; 1 optional field absent (FINDING 3) |
| 18 | **Cross-screen contradictions** | **0** |
| 19 | A findings (MUST FIX) | **0** |
| 20 | B findings (SHOULD FIX) | **1** |
| 21 | C findings (OPTIONAL) | **3** |
| 22 | D findings (false alarm) | **8** |
| 23 | Frozen paths modified | **0** |
| 24 | Frozen paths confirmed untouched | `lib/engines`, `lib/rulepacks`, `lib/test`, `lib/`, `components/`, `globals.css` — `git status` clean, `git diff --stat` empty |

---

## 2. Cross-screen consistency (Phase 14)

Every screen carrying a shared fact was scraped and compared. **No contradiction found.**

| Fact | Appears on | Consistent? |
|---|---|---|
| `342` master's full-time CPT days | `/`, `/student`, `/student/changed` | yes |
| `552` pooled reading | `/`, `/student/changed` | yes |
| `365` cliff | 6 routes | yes |
| `23` days of margin | `/`, `/student` | yes |
| `54` overlap days | `/student` | yes |
| `210` days in dispute | `/student/changed` | yes |
| `SCHEV Pt II §03(A)` | `/`, `/student`, `/coverage` | yes |
| `SCHEV VASA` | `/`, `/student`, `/student/finding/aid` | yes |
| `8 CFR 214.2(f)(10)` | `/`, `/student`, `/student/changed` | yes |
| Deciding offices (SEVP / Domicile Officer / Financial Aid Office) | 5 routes | yes |
| `verified 2026-07-24` | 3 finding routes + `/coverage` | yes |
| Coverage `1 / 2 / 43 / 5` | `/`, `/coverage` | yes |

**Arithmetic ties across screens:** 342 + 210 = 552 ✓ · 365 − 342 = 23 ✓ · 288 + 54 = 342 ✓

---

## 3. Findings

### FINDING 1 — Collapsed reasoning-tree evidence is exposed to the accessibility tree

**Classification: B — SHOULD FIX** · **Confidence: 95%**

- **Route:** `/student/finding/domicile`, `/student/finding/aid`, `/student/finding/residency`
- **Viewport:** all · **State:** `initial` (sources collapsed)
- **Screenshot:** `finding-domicile-1440x900-initial.png`, `finding-residency-1440x900-citation-and-source.png`

**Exact reproduction:** load `/student/finding/domicile`, do not click anything, take
`page.accessibility.snapshot({interestingOnly:false})`.

**Visible evidence:** the toggle reports `aria-expanded="false"` and its wrapper computes to
`height: 0px`, inner `opacity: 0` — visually nothing. But Chrome's own accessibility tree still
contains:

```
StaticText "Physical move · 1 Aug 2024"
StaticText "Lease signed · 18 Jul 2024"
StaticText "Job offer accepted · 8 Jun 2026"
StaticText "Program start · 24 Aug 2026"
```

The wrapper has no `aria-hidden`, no `hidden`, no `inert`.

**Why it matters:** a screen-reader user hears "Show the 4 sources this step rests on, collapsed"
and then hears the four sources anyway. The announced state is false, and the control appears to do
nothing. WCAG 2.1 **4.1.2 (Name, Role, Value)** — state must be accurate.

**Behavioral impact:** NO — engine output, arithmetic and routing unaffected.
**Frozen-path impact:** touches `components/ReasoningTree.tsx`, which Rule 5 of this audit
explicitly permits for presentation-only fixes.

**Smallest safe fix:** set `aria-hidden={!expanded}` (and optionally `inert`) on the
`.rtree-children` wrapper. One attribute, bound to state that already exists.

**Regression risk:** low. Measured: **0 focusable elements** inside the collapsed region, so there
is no keyboard trap to disturb and no tab-order change.

**Verification required after fix:** re-run `page.accessibility.snapshot` and confirm the four
strings are absent when collapsed and present when expanded; a11y suite 35/35; journeys 35/35.

---

### FINDING 2 — Reasoning-tree toggle is a 20×20 px target

**Classification: C — OPTIONAL** · **Confidence: 90% on the measurement, ~35% that it costs points**

- **Route:** the three finding pages · **Viewport:** every width 320–1920 (constant)
- **Screenshot:** `finding-domicile-1440x900-initial.png`

**Visible evidence:** `.rtree-toggle` measures exactly `20 × 20` CSS px at all ten tested widths.
WCAG **2.2 AA 2.5.8 Target Size (Minimum)** requires 24×24. Under WCAG **2.1 AA** — the level most
competitions cite — there is no such criterion (2.5.5 is AAA at 44px), so this passes 2.1 and fails
2.2. An adjacent `1 source` / `4 sources` text button toggles the same disclosure, but at 58×14 it
is also below 24.

**Behavioral impact:** NO. **Frozen-path impact:** `globals.css` padding only.
**Smallest safe fix:** increase `.rtree-toggle` padding to reach a 24×24 box.
**Regression risk:** low, but it changes vertical rhythm on three pages — which is why this is C and
not B under a presentation freeze.

---

### FINDING 3 — No canonical URL emitted on any route

**Classification: C — OPTIONAL** · **Confidence: 99% on the fact, ~5% that it affects judging**

Production HTML contains no `<link rel="canonical">` on any of the 11 routes
(`METADATA-EVIDENCE.md`). This affects search-engine duplicate-content resolution, not judges.
Deliberately not added during A1+A2: a root-level canonical would be inherited by every route and
would assert that all 11 pages are `/`, which is worse than emitting none.

---

### FINDING 4 — Horizontal rail hides two destinations between 700 px and 900 px

**Classification: C — OPTIONAL** · **Confidence: 100% on the measurement**

**Measured:** at 834×1112 the `.sidebar` has `scrollWidth 1260` vs `clientWidth 834`; the rail
scrolls 426 px and two items sit beyond its right edge — **"One event, many effects"** and
**"State coverage"**. Reproduced at 700, 768, 800, 834, 880, 899 and 900 px; resolves to the full
vertical rail at ≥1000 px.

**Screenshot:** `student-834x1112-initial.png`, `coverage-834x1112-initial.png`

**Why it is C and not B:** document overflow is 0 (the rail scrolls, it does not break the page);
a truncated item at the edge is a real if quiet scroll affordance; and both hidden destinations are
directly linked from the landing page, so nothing is unreachable. Fixing it means reopening
navigation under a presentation freeze for a path most judges will not take.

---

## 4. False alarms (D) — investigated, evidence says no change

| # | Apparent problem | Evidence it is harmless |
|---|---|---|
| D1 | 97 captures reported "clipped, non-scrollable" content | All are `.sr-only` (a 1px clipped box **is** the screen-reader-only technique) or collapsed disclosures at `height:0`. No visible content is cut. |
| D2 | `sidebar-label` clips 4 px | `text-overflow: ellipsis` on "The full determination · Marcus" — intentional truncation, `scrollWidth 191` vs `clientWidth 187`. |
| D3 | 43 captures with "element wider than viewport" | Every one is `.sidebar-nav` (932 px) inside the `overflow:auto` rail. Document overflow measured **0**. Same root cause as FINDING 4. |
| D4 | "Tiny targets" on 6 routes | `Back to…`, `See full reasoning →`, `Priya's timeline`, `Watch it change its mind →`, the SCHEV URL — all **inline text links in a sentence**, explicitly exempt from WCAG 2.5.8. |
| D5 | 1×1 px control on `/student/changed` | The visually-hidden `<input type=file>`; the visible labelled button is the real target. Standard pattern. |
| D6 | 48 captures returned HTTP 304 | Conditional-cache revalidation from repeated navigation in the harness (cache disabled only on the initial pass). Not a server error; content rendered correctly in every case. |
| D7 | App ignores `prefers-color-scheme: dark` | `bodyBg` stays `rgb(246,247,248)` under dark emulation — consistently light-only across all routes. A *partial* dark theme would be a defect; none is a legitimate product choice. |
| D8 | `/moment` renders ~50% empty before interaction | Measured: content ends at **463 px** in a 900 px viewport; clicking **"I got a job →"** (prominent, top-right) grows the page to **1210 px** and reveals the four consequences. **Intentional staging supported by the interaction**, per Phase 4's instruction not to auto-fix empty space. Mitigation is a run-of-show note, not a code change. |

---

## 5. Browser behaviour (Phases 6 and 8)

| Test | Result |
|---|---|
| Zoom 125 % (1152×720) | 0 overflow, 0 errors — 4 routes |
| Zoom 150 % (960×600) | 0 overflow, 0 errors — 4 routes |
| Zoom 200 % (720×450) | 0 overflow, 0 errors — 4 routes |
| Direct load of a nested route | HTTP 200, 0 errors |
| Hard reload | 0 errors, content rendered |
| Back / forward navigation | returns to the correct URL, content re-rendered |
| Keyboard: first Tab stop | skip link, reaches `top: 0` after its 140 ms transition; instant under reduced motion |
| Reduced motion | captured on `/` and `/student/changed`; content fully visible, not stuck at the animation's `from` frame |
| Tier 0 after commit + reload | committed evidence did not survive; 0 storage across all 11 routes |
| **Second browser engine** | **NOT TESTED** — only Chrome/150 is installed in this environment. Firefox and WebKit were not exercised. Stated rather than assumed. |

---

## 6. Evidence completeness

**Inspected:** all 11 routes at all 5 required viewports (55 initial captures); 48 interactive-state
captures at 1440×900 and 390×844; 12 zoom captures; reduced-motion on 2 routes; 10-width responsive
sweep on 6 routes; full metadata on all 11 routes in **both** local and production.

**Not inspected, and why:**

1. **Non-Chromium browsers** — not installed in this environment. This is the single largest gap in
   confidence: a Safari- or Firefox-specific rendering bug would not have been caught.
2. **Interactive states at 1280×720, 1512×764 and 834×1112** — only `initial` was captured at those
   three viewports; interactive sequences ran at 1440×900 and 390×844. The responsive sweep covers
   layout at those widths, so the risk is a state-specific layout bug at a tablet width only.
3. **The 43 "Official source →" links inside collapsed coverage tiles** — only 2 external links are
   in the DOM until a tile is expanded, so link-resolution was verified for 2 of 45. The remaining
   43 are behind anti-bot gates and were previously recorded as a verification limitation, not a
   failure.

None of these affects the A/B/C classifications above.

---

## 7. Adversarial verdict

> **"Would you trust this application to be handed to a hostile competition judge without personally
> apologizing for any visible defect?"**

# YES

The evidence supporting that answer, not an impression:

- **0 console errors, 0 warnings, 0 failed network requests** across 103 captured states.
- **0 horizontal overflow** across 5 viewports × 11 routes and a separate 10-width × 6-route sweep,
  including 200 % zoom.
- **0 broken images, 0 broken links, 0 dead routes**; all 11 registered routes reachable, all 11
  internal link targets resolve, 0 dev/localhost URLs anywhere.
- **0 cross-screen contradictions** — the hardest failure mode for a product like this, checked
  fact-by-fact across 12 shared values, with the arithmetic tying in all three directions.
- **0 fixed-element overlaps** — the floating CTA measured `overlapPx: 0` on 9 route × width
  combinations because the content column carries matching bottom padding.
- **Metadata identical in local and production on all 11 routes**, 11/11 distinct titles, OG image
  resolving at a verified 1200×630.
- The one accessibility defect found (FINDING 1) is **invisible to a sighted judge** and gives a
  screen-reader user *more* information than intended, not less. Nothing is unreachable.

> **"Is there any remaining issue you believe should be fixed before competition?"**

**One: FINDING 1.** It is a genuine WCAG 4.1.2 state-accuracy failure, the fix is a single
attribute bound to state that already exists, and measurement shows zero focusable elements in the
affected region — so regression risk is close to nil.

FINDINGS 2, 3 and 4 do not justify modification. Each requires touching frozen surfaces
(`globals.css` rhythm on three pages, per-route metadata, navigation layout) to buy something a
judge will not encounter: a WCAG 2.2-only criterion, a search-engine hint, and a tablet-portrait
path that has direct links from the landing page as an alternative. Under a presentation freeze,
the risk of each change exceeds its benefit.

---

AUDIT COMPLETE
EVIDENCE CAPTURE COMPLETE
FINDINGS CLASSIFIED
WAITING FOR APPROVAL

# 10 — The PathWise UI/UX Bible

The single reference for how PathWise looks, feels, and behaves. Design & experience is one of the
five equally-weighted judging criteria, and it is the score with the most headroom — so this
document is not decoration, it is a scoring strategy. Every rule here is chosen to make a judge feel
"this is calm, trustworthy, and clearly not a chatbot" within ten seconds.

Grounded in current UX research (see Sources at the end): student dashboards score when they deliver
*prescriptive* insight (what to do), not just *descriptive* data; and decision-support UIs earn
trust when every result shows its reasoning, its data source, and a way to act or override.

---

## 1. The design philosophy (one sentence)

**PathWise is a calm, intelligent navigation system — not an AI chatbot.** The entire experience is
one sentence, in order:

> Here's where you are → here's what we know → here's what changed → here's what's blocking you →
> here's what you can do next.

If a screen doesn't advance that sentence, it doesn't ship.

## 2. The five laws (never broken)

1. **Answer first, data second.** Every screen opens with a plain-language conclusion, then the
   evidence beneath it. Never a wall of fields the user must interpret themselves.
2. **Every claim carries its citation, inline.** The regulation sits *inside* the sentence
   ("SCHEV Pt II §03(A)"), never in a footnote. This is the two-second "is this real or is this
   vibes?" test, and PathWise passes it on sight.
3. **The AI is invisible; the outcome is the product.** No "Ask PathWise AI," no robot mascot, no
   chat box as the hero. We sell "understand where you are and what to do," not "advanced AI."
4. **Uncertainty is a first-class state, shown beautifully.** "Unable to verify" is designed to look
   *intentional and honest*, never like an error. The system communicates what it knows AND what it
   doesn't.
5. **Color is reinforced by icon and word — never color alone.** Every status is a shape + a label,
   so the meaning survives colorblindness, glare, and a compressed demo video.

## 3. Status system (the vocabulary of the whole app)

One vocabulary, everywhere. Same four states on every screen.

| State | Icon | Word | Color | Meaning |
|---|---|---|---|---|
| Verified / on track | ✓ | On track | Green | Confirmed, nothing to do |
| Attention | ◐ | Attention | Amber | Approaching a limit; act with margin |
| Blocked / issue | ● | Blocked | Red | A hard finding (not an error) with a reason + citation |
| Unknown | ? | Unable to verify | Gray | Honestly missing evidence + how to resolve |

Red is a *reasoned finding*, never a crash. Gray is *honesty*, never a bug. That distinction is the
trust posture, and it is a design decision.

## 4. The information architecture (5 screens, not 11)

Discipline: with 28 days and equal-weighted scoring, breadth does not score and half-built screens
read as fake. We build **five real screens** and *show* the wider map on one slide as the scale
story. Everything a student needs answers three questions: **Where am I? What changed? What do I do?**

```
PathWise
├── Home            "Where am I, and what's my next best step?"  (the hero)
├── My Journey      the persistent timeline — the product's memory
├── The finding     structured answer: know / can't verify / why / do next  (+ evidence chain)
├── What Changed?   before → after when a life event or document lands
└── Next Steps      ordered, actionable, explainable
```

The three domains (F-1, Residency, Aid) are **not three apps** — they are three readers of one
student record, surfaced as three status cards under one answer. One PathWise, always.

## 5. Screen-by-screen — the wow moments

Each screen has one job and one moment that makes a judge lean in.

### 5.1 Home — "the four decisions"
- **Hero = the cross-domain finding**, full width, top of page: one fact closing two doors, cited.
  This is the visual argument that it is one product, and it is the first thing the eye lands on.
- Below it, **three domain status cards** (secondary, smaller): Immigration, Residency, Aid — each a
  status + one line + citation + "See full reasoning →."
- **One "Next best step"** card with consequence and *margin* ("before 18 Aug — 24 days of margin"),
  never a bare date.
- **Wow moment:** a judge reads the whole situation in one glance, and every negative has a reason
  attached, not a shrug.

### 5.2 My Journey — the persistent timeline (the memory)
- A horizontal, multi-institution timeline. The student never re-explains their history; PathWise
  *remembers the journey.* This directly implements SCHEV's own advice to "construct a timeline and
  weigh the order of events."
- Click any event → a card: institution, period, status (✓/◐/?), the evidence it rests on, and
  "Why this matters" (which findings it feeds).
- **Wow moment:** this is the screen that feels fundamentally un-chatbot. The system has state. It
  holds the student's life, not just the last message.

### 5.3 The finding — structured answer + evidence chain
- Never a paragraph. Four blocks: **What we know** (✓ list), **What we couldn't verify** (? list),
  **Why it matters**, **What to do next** (ordered).
- A **"Why did PathWise say this?"** expander reveals the reasoning chain: result → rule used
  (quoted + cited + verified-on) → evidence → deciding office. ("PathWise advises; the office
  decides.")
- **Wow moment:** the judge clicks "Why?" and sees the machine's actual reasoning, cited to primary
  law. A chatbot cannot show this; a rules engine can.

### 5.4 What Changed? — the signature demo beat
- **Before / After**, side by side. The student adds a document or a life event; the panel shows:
  Timeline updated ✓, Ledger updated ✓, Evidence linked ✓, Analysis recalculated ✓ — and *why*.
- **Wow moment:** the system visibly re-reasons in front of the judge. This one screen hits all five
  criteria at once (original = it tracks change; real = situations evolve; impact = less repeated
  confusion; design = legible; build = real state transitions).

### 5.5 Next Steps — the payoff
- An ordered checklist: Confirm X → Upload Y → Ask your DSO about Z → Generate a one-page summary.
  Each step **clear, actionable, ordered, explainable.**
- **Wow moment:** the app answers the competition's literal prompt — "navigate what comes next" — not
  with analysis, but with a plan.

## 6. The uncertainty screen ("Unable to verify") — designed, not errored

A calm card, never a red toast:

```
◐  We couldn't verify this yet
   We don't have enough evidence to determine this part of your situation confidently.
   What's missing:  CPT authorization document
   Why it matters:  This affects how your situation is evaluated.
   What you can do:  Upload it, or confirm with your DSO.
   [ Add evidence ]   [ I'll verify this later ]
```

The message is never "the AI knows everything." It is **"the AI knows what it knows."** That single
choice is worth real design points.

## 7. On the chat box (an explicit ruling)

**We do not ship a free-text "Ask PathWise AI" box.** It reintroduces the exact "looks like every
other AI project" problem, it would require a server LLM call that breaks the no-account /
nothing-stored privacy pillar, and free-text legal answers invite hallucination. Instead we keep the
*intent* via **structured intent cards** — "Can I do this? / What do I need? / What changed? / Why is
this uncertain? / What should I do next?" — each routing to deterministic engine output. Same feel,
zero risk, fully on-brand.

## 8. Visual system

- **Personality:** Linear + modern fintech + higher-ed. Very clean, generous whitespace, sharp
  typography, subtle borders, rounded-but-not-playful, small purposeful motion. Serious decisions,
  calm surface.
- **Palette (already in `globals.css`):** warm off-white background `#f7f8fb`; deep navy ink
  `#12203a`; confident indigo accent `#2f5fe0`; semantic green/amber/red/gray each with a soft
  background pair. Color used *sparingly* — mostly ink on off-white, accent for action, semantic
  colors only for status.
- **Typography:** one clean sans; large confident headlines; comfortable body line-height (~1.5);
  citations in a small mono chip so they read as "source," not "text."
- **Spacing & shape:** 14px card radius, soft two-layer shadow, 1px hairline borders. Cards float on
  the off-white; nothing is boxed-in or heavy.
- **Motion:** micro only — hover states, a bar that fills, an expander that opens, a before→after
  cross-fade. No page-flip theatrics. Motion confirms causality (the ledger bar growing toward the
  cliff), it never decorates.

### Avoid (the anti-list)
Cartoon illustrations · giant gradients · glassmorphism · neon · generic AI-robot graphics · a huge
"Ask AI" button dominating the page · 15 dashboard cards · bare dates with no consequence · color as
the only signal.

## 9. Accessibility (also a design score)

- Status = icon + word + color, always (WCAG: never color alone).
- Contrast: ink-on-off-white and semantic text on soft backgrounds all clear AA.
- Every interactive element keyboard-reachable, visible focus ring.
- Citations and "Why?" expanders are real text, not images — screen-reader legible.
- The seeded "View example student" means the whole product is usable with zero input — including by
  a judge who never types anything.

## 10. Microcopy rules

- Second person for the user's own data ("your F-1 status"), third person only for the example
  student. F-1 always hyphenated in display.
- Consequence + margin, never bare deadlines. "Before 18 Aug — 24 days of margin," not "18 Aug."
- Findings are advice with an owner: "…here's who decides," never a bare verdict.
- No hype words ("advanced AI," "powered by"). Describe the outcome, not the engine.

## 11. The two-minute demo path (the UI in motion)

The build serves this exact click-path; anything off it is secondary.

| Time | Screen | Beat |
|---|---|---|
| 0:00–0:15 | Home | Meet the student; one situation, three status cards, one issue. |
| 0:15–0:30 | My Journey | The timeline reconstructs across institutions — the memory. |
| 0:30–0:45 | CPT ledger | The bar climbs to 342/365, amber; overlap days made visible. |
| 0:45–1:05 | The finding | One fact blocks residency AND aid — cited. Click "Why?" → reasoning chain. |
| 1:05–1:35 | What Changed? | Add a document / job → before→after, the system re-reasons live. |
| 1:35–1:50 | Unable to verify | The honest gap, shown as intention, with how to resolve. |
| 1:50–2:00 | Next Steps | The ordered plan. Close: "One record. Three offices. PathWise sees all three." |

## 12. How this maps to the score

- **Design & experience** — calm, cited, legible, accessible; the whole reason for this document.
- **Original** — the persistent timeline + "What Changed?" show a system with *state*, not a Q&A box.
- **Real problem** — prescriptive next steps answer "what do I do now?", which is the actual ask.
- **Built** — reasoning chains and live re-computation prove real logic behind the surface.
- **Scale** — one record, three readers; the IA itself demonstrates the architecture generalizing.

---

### Sources
- Learning analytics dashboards deliver most value via prescriptive/actionable insight, not raw data — International Journal of Educational Technology in Higher Education (Springer): https://link.springer.com/article/10.1186/s41239-021-00313-7
- Dashboard UX: color-coded badges tied to actions, tooltips/drill-downs on demand, purposeful microinteractions — UXPin Dashboard Design Principles (2026): https://www.uxpin.com/studio/blog/dashboard-design-principles/
- Decision-support trust: every result shows reasoning + data source; "Why this?" expandable rationale chips; confidence + override before action — UXmatters, Designing AI UIs That Foster Trust and Transparency: https://www.uxmatters.com/mt/archives/2025/04/designing-ai-user-interfaces-that-foster-trust-and-transparency.php
- Explainable-AI UI patterns for trust calibration (friction, attention guidance, understandable-without-technical-knowledge) — Eleken, Explainable AI UI Design: https://www.eleken.co/blog-posts/explainable-ai-ui-design-xai

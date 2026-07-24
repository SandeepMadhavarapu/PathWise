# 08 — Decisions Log (what we cut and WHY)

Read this before proposing any new feature. The idea is finished. The failure mode now is scope
creep, not a missing feature. Every entry here is a decision that is *closed* — reopening it costs
days we don't have.

## The governing decision: WE WIN BY SUBTRACTION
Our score profile: Real problem 9.5, Originality 8.5, Scale 8, Design 7.5→9 (biggest headroom),
Built 8.7→9.5. The only two scores with real headroom (Design, Built) go UP when we do *fewer*
things *better*. Raising Design 7.5→9 alone moves the weighted total ~8.5→8.8. Adding features
lowers both. Therefore: no new features without cutting one.

## Closed decisions

### D1 — Residency is a GATE, not a full engine. (CLOSED)
Cut the 400-line domicile logic to: the eligible-alien gate + the clock-start rule (last intent
factor, not arrival). Both are cheap, both are surprising, and the gate IS the originality (it's the
cross-domain moment). The rest is mapped, not verified, with source links. Saves ~25 hours.
*Why:* domicile output is the least actionable (decided by a tuition officer per-college, no appeal),
so deep domicile logic appears on screen for 4 seconds and buys nothing.

### D2 — Do NOT hardcode 50 states. (CLOSED)
Residency is not 50 rule sets; it's ~50 statutes × thousands of institutional interpretations,
non-transferable and often un-appealable, with wildly varying duration and clock anchors. Hardcoding
50 in 4 weeks = 50 shallow, several wrong, and a judge who knows their own state catches it. Instead:
rule-pack architecture, 4–6 states deep (VA first), and `coverage.json` listing all 51 honestly.
Turns a scope limit into a credibility signal.

### D3 — Deep F-1, not broad. (CLOSED)
Put the saved hours into making Engine A indisputably real: 6–8 I-20 layout variations, confidence
scores, the overlap case rendered visibly, edge cases (transfer mid-term, level change mid-CPT,
retroactive corrections). One engine that is unambiguously real beats three that are plausibly real.

### D4 — 10 hours reserved for the VIDEO. (CLOSED)
A 10/10 video of an 8/10 product outscores a 6/10 video of a 9/10 product. The video and write-up
are consumed first and, for many judges, are the only thing experienced carefully.

### D5 — Reminders are outbound + derivation-based, named "Consequence Engine". (CLOSED)
Not a calendar widget. Every reminder shows source date → source doc → rule → computed date, and its
consequence. Re-derived nightly, not stored as fixed dates. In-app + email + `.ics`. No SMS.

## Explicitly NOT building (the "no" list)
- The What-If Simulator.
- The Student State Machine.
- SMS / Twilio notifications.
- Real SEVIS integration — impossible, and a red flag if claimed.
- Accounts/auth beyond the bare minimum.
- A mobile app.
- Transfer-credit evaluation (Stellic already sells this — do NOT look like a worse version).
- More than ~6 states.
- A fourth domain. (Coverage/breadth does not score; equal weighting means a fourth domain adds
  surface area and risk without adding points.)

## How to use this file
Before adding anything, ask: which of the five criteria does it raise, and what does it cost the
Design/Built scores by adding surface area? If it doesn't clearly raise a score, it's on the no list.

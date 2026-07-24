# 04 — Build Plan (28 days, 2 people)

Working backwards from **21 August 2026**. Today is 24 July. The build window (20 Jul–21 Aug) is
already running.

## How we split
By **engine, not by layer.** Two people on the same file is friction; two people on separate rule
packs is parallelism.
- **Dev A** — extraction, timeline, Engine A (practical training). The hard computation.
- **Dev B** — rule-pack runtime, Engines B and C, UI shell. The breadth.
- **Shared** — schema (days 1–2, together, non-negotiable), the consequence engine, the demo.

## Two rules that override everything else
1. **A live, judge-openable URL exists from day 2 and never breaks.** Every day ends on a working
   deploy.
2. **Feature-freeze on 16 August.** After that: bugs, video, write-up only.

## The schedule

**Days 1–3 (Jul 24–26) — Lock scope, register, write the demo script FIRST.**
Register today, claim tooling credits, read the official terms in full (Notion page needs a
browser). Before any code: write the 2-minute demo script and the 500-word write-up as if the
product already exists. Everything built for three weeks exists to make those true; anything not in
the script is cut. Pick the one persona (Priya) and her exact document set. Lock category:
Overcoming Obstacles.

**Days 4–6 (Jul 27–29) — Data model + rule-pack schema + deploy skeleton.**
Timeline event model, evidence model, rule-pack JSON schema (must serve all three domains — if it
only fits F-1, it's wrong). Deploy a hello-world to a real URL on day 4 and keep it live.

**Days 7–13 (Jul 30–Aug 5) — F-1 flagship, end to end.**
Upload → extraction → timeline → CPT ledger → rule engine → evidence-linked results → Unable to
Verify. This is 50–60% of effort. By Aug 5 the F-1 path works start to finish on Priya. Do not start
residency until it does.

**Days 14–16 (Aug 6–8) — Event Consequence Engine + Office Brief + What Changed?**
Build the consequence/deadline engine here, right after the timeline exists — cheap now, expensive
later. This is the un-chatbot-like, stateful core.

**Days 17–19 (Aug 9–11) — Domicile, gate-first.**
Ship the eligible-alien gate + clock-start rule (the surprising, cheap ones). Mark the rest of
domicile "mapped, not verified" with source links. Plus the honest coverage map. (Per the focus
decision, residency is a GATE, not a full 400-line engine — see decisions log.)

**Days 20–21 (Aug 12–13) — Aid module.**
Which-form logic, three-provision VA-student determination, evidence checklist, earliest-of deadline.

**Days 22–23 (Aug 14–15) — Unified dashboard + prioritized next steps + ruthless polish.**
This is where the Design score (our biggest headroom) is won.

**Days 24–25 (Aug 16–17) — Record the video. FEATURE FREEZE Aug 16.**
Record the 2-minute demo multiple times. Bugs only from here.

**Days 26–27 (Aug 18–19) — Finalize write-up, test the judge link cold.**
Open the link incognito on a phone. Have someone who's never seen it use it for 5 minutes. Whatever
confuses them in the first 30 seconds is what you fix.

**Day 28 (Aug 20) — Submit, a full day early.**
Never submit on deadline day. Servers fall over; YouTube processing takes hours.

## Verification discipline (final week)
Re-check every rule in every pack against its primary source — SCHEV for VA domicile/aid, USCIS/SEVP
for F-1. A rule encoded today may be wrong on 21 August.

## The one failure mode to fear
Not building the wrong features — building the right features to 70% and having no time for the
video and write-up. **Freeze on Aug 16 regardless of what's unfinished.** Let the demo script govern
every scope decision from day 1.

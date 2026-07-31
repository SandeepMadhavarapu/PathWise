# 16 — Final submission checklist

Product frozen at `58d809d`. Correctness freeze and presentation freeze both in effect.
Nothing on this list is a code change.

---

## A. Frozen build — verified, nothing left to do

| # | Item | Evidence | Status |
|---|---|---|---|
| A1 | Product frozen | `58d809d` deployed; `lib/`, `rulepacks/`, engines, golden fixtures, `globals.css` untouched | **DONE** |
| A2 | All suites green | 4/4 suites + golden (38 intended changes unchanged) | **DONE** |
| A3 | Browser regression | 35/35 journeys · 35/35 a11y+reduced-motion+no-JS+print · 13/13 final · 11/11 isolation · 16/16 clear/arithmetic | **DONE** |
| A4 | Production healthy | 11/11 routes HTTP 200, 0 console errors, 0 overflow, 0 storage | **DONE** |
| A5 | Metadata live | 9 `og:` + 4 `twitter:` tags, `og.png` 200 `image/png` 1200×630, 11/11 distinct titles | **DONE** |
| A6 | Cold link works | incognito, empty profile, cache disabled → HTTP 200, 0 errors, 0 storage, 0 broken images | **DONE** |

## B. Performance — informs the run of show

| Load | Time |
|---|---|
| Cold, cache disabled, first serverless boot | 8.3 s |
| Cold, cache disabled, warmed edge | 3.9 s |
| **Warm (what a judge gets after one visit)** | **110–130 ms** |
| `/student` · `/student/changed` · `/coverage` · `/check`, warm | 185 · 277 · 199 · 134 ms |

**Consequence: open every page once before you present.** Cold is 30× slower than warm. This is the
single highest-value 60 seconds of preparation on this page.

## C. Before the demo — your actions

- [ ] Open all 6 demo pages once in the demo browser profile (warms them to ~120 ms)
- [ ] Disable OS sleep, notifications, Slack, mail
- [ ] Check OS reduced-motion is **off** (the band collapse is the payoff)
- [ ] Browser at 1280 px or wider, no bookmarks bar, no extensions visible
- [ ] Never park the laptop on `/moment` in its pre-click state — it reads as unfinished until
      **I got a job →** is pressed
- [ ] Rehearse the three-second silence after **Add to my record** against a clock

## D. Recording

- [ ] 5-minute demo recorded — script: `12-final-demo-script.md`
- [ ] 2-minute lightning recorded — script: `13-lightning-demo-2min.md`
- [ ] 5+ takes, no dead air, no mouse hunting
- [ ] Used **Use a sample document →**, never **Choose a file from this device** (the picker puts
      your filesystem on camera)
- [ ] Uploaded early — processing takes hours
- [ ] **Video link opened in a fresh incognito window and confirmed playable**
- [ ] Audio checked on laptop speakers, not headphones

## E. Submission fields

- [ ] Live link: **https://path-wise-amber.vercel.app**
- [ ] Repo: **https://github.com/SandeepMadhavarapu/PathWise**
- [ ] Video link (public or unlisted, incognito-tested)
- [ ] One-line description:
      *"A reasoning engine over one student record that answers immigration, tuition residency and
      state aid together — and refuses to answer when the record genuinely can't settle it."*
- [ ] Deadline: **21 Aug 2026**

## F. Q&A readiness

- [ ] Tier 1 answers cold: *Where's the AI? · Only one state? · Who's liable? · Why not an LLM?*
      (`14-judge-qa.md`)
- [ ] Three concessions rehearsed without flinching: **no users**, **no attorney review**,
      **no source-staleness monitoring**
- [ ] "I'd have to check that" said out loud at least once in practice

## G. Do not

- Do not change the product. Both freezes are in effect.
- Do not run another audit. Six are complete; the last three produced zero A-findings.
- Do not record before the pages are warmed.
- Do not fill the three-second silence.

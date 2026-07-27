# 07 — Submission Checklist

Five artifacts. **All five are required for the entry to qualify.** Missing or broken = disqualified
or zeroed.

## The five deliverables
- [x] **Title + category.** Title: **PathWise**. Category: **Overcoming Obstacles**.
      (This file said "Standing" until the project was renamed; the app, the repo, `package.json`
      and `11-submission-writeup.md` all say PathWise. Submit the name the judge sees on screen.)
- [ ] **500-word write-up.** Drafted at 496 words in `11-submission-writeup.md`. Re-read it after
      the final rule re-verification — if a number on screen moves, it moves there too.
- [ ] **Two-minute demo video** on YouTube / Vimeo / Loom. Hard cap 2:00. Script is final in
      `12-final-demo-script.md`. Upload early — processing takes hours.
- [x] **A working link a judge can open** — **https://path-wise-amber.vercel.app**
      Live, all 11 routes 200. Still to do on days 26–27: open it cold, incognito, on a phone.
- [x] **A list of every tool used, AI included.** Below.

## Tools used (deliverable #5)

Complete and honest, derived from `pathwise-app/package.json` and the source rather than memory.

**AI**
- **Claude (Claude Code, Claude Opus)** — the whole build: rule-engine design and implementation,
  the rule-pack schema, the regression and golden test suites, UI implementation, and the writing
  in `pathwise-core/docs/`. Claimed via the Stellic × Anthropic partnership at registration.

**Framework and language** — the only three runtime dependencies in the project.
- **Next.js 14.2.5** (App Router) — routing and static prerendering; all 11 routes ship as static
  HTML, which is why the judge link has no server to fall over.
- **React 18.3.1 / react-dom 18.3.1** — UI.
- **TypeScript 5.4.5** — every engine and rule-pack shape is typed; `npm run typecheck` gates a deploy.
- **Node.js 20** — build and test runtime.

**Hosting and source control**
- **Vercel** — hosting and production deploys (root directory `pathwise-app`).
- **GitHub** (`SandeepMadhavarapu/PathWise`) — source control.

**Assets and browser APIs (no dependency added)**
- **Inter** via `next/font/google` — self-hosted at build time, so the running app makes no
  request to Google.
- **Web Crypto `SubtleCrypto.digest`** — the SHA-256 fingerprint in the evidence flow. A browser
  built-in, not a library.

**Deliberately NOT used — worth stating, because the honest absence is the design**
- **No OCR or extraction library.** PathWise reads a document's *bytes*, never its words, and says
  so on screen. There is nothing to extract with because nothing is extracted.
- **No email or `.ics` library.** `lib/ics.ts` is written by hand against RFC 5545 so the calendar
  export runs entirely in the browser.
- **No public API, no backend, no database, no analytics, no third-party script.** The app makes
  zero network requests at runtime. That is what "nothing leaves this device" has to mean to be true.
- **No UI or component library.** The design system is `app/globals.css` and `lib/tokens.ts`.
- **No test framework.** The three suites compile with `tsc` and run under plain `node`.

## Pre-submission gate (day 28, morning)
- [ ] Judge link opens in a fresh incognito window with no errors.
- [ ] "View example student" (Priya) works with zero uploads.
- [ ] The money moment ("I got a job" → four consequences) works on the live link.
- [ ] Video is public/unlisted and plays start to finish; length <= 2:00.
- [ ] Write-up is <= 500 words and names the category.
- [ ] Tools list is complete and honest (AI included).
- [ ] Every on-screen citation matches its primary source (final re-verification done).
- [ ] Submit — a full day before the 21 August deadline.

## Qualification reminders (don't get disqualified on a technicality)
- The project must be **built inside the 20 Jul–21 Aug window.** Don't reuse pre-existing code as
  the core; open-source libs / public APIs / normal dev tools are fine.
- Entrants must be enrolled university students, 18+, in US / Canada / Mexico / Australia.
- Teams up to 3; teammates may be from different schools.

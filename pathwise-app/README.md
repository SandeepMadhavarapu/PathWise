# PathWise — app

The live application. Next.js (App Router) + TypeScript. The tested rule engines live in `lib/` and
are imported directly by the screens — the UI never reimplements a rule.

> Canonical spec & recovery docs are in `../pathwise-core/` (read `../pathwise-core/docs/00-START-HERE.md`).
> This app is now the canonical home for the **code**; `pathwise-core` remains the canonical home
> for the **docs** and is the recovery snapshot.

## Run it locally
```bash
cd pathwise-app
npm install
npm run dev      # http://localhost:3000  — the Home screen renders the example student (Priya)
```

## Verify / build
```bash
npm run typecheck   # tsc --noEmit (clean)
npm run build       # next build (compiles + prerenders all routes)
npm test            # both regression suites (evidence flow + jurisdiction routing)
```

`npm test` is the one that matters before a deploy: it locks the verified demo numbers
(342 / 54 / 23 / 552) and asserts that no jurisdiction is ever shown another jurisdiction's
citation.

## Deploy (gets us the judge-openable URL — deliverable #4)
The Next app is **`pathwise-app/`, a subfolder** of the `PathWise` repo — that one fact is the
whole trick, and getting it wrong is the usual reason the first import fails to build.

1. The repo is already on GitHub: `SandeepMadhavarapu/PathWise`.
2. vercel.com → **Add New… → Project** → import `PathWise`.
3. **Set Root Directory to `pathwise-app`.** Do this in the import screen, before deploying.
   Framework then auto-detects as Next.js; leave the build and output settings alone.
4. Deploy → a live `https://pathwise-*.vercel.app`. Keep it live from here on.

Or from this folder, with the CLI:
```bash
npx vercel login       # interactive, one time
npx vercel --prod      # run from pathwise-app/, so the root directory is implicit
```

## What's here so far
- `app/page.tsx` — the **Home screen**. Runs the real engines on Priya and renders:
  the cross-domain **hero finding** (F-1 status blocks VA residency AND VA aid, with citations)
  and the **CPT ledger bar** (342 full-time days, 23 from the 365 cliff — amber).
- `components/` — `HeroFinding`, `DomainCard`, `LedgerBar`.
- `lib/engines/` — `cpt-ledger.ts` (Engine A, overlap aggregation) + `domicile-gate.ts` (Engine B).
- `lib/rulepacks/` — the cited JSON rule packs (F-1, VA domicile, VA aid, consequence map, coverage).
- `lib/fixtures/priya.ts` — the demo student.

## Next build slices (per ../pathwise-core/docs/04-build-plan-28day.md)
1. Landing screen with the privacy line + "View example student" entry.
2. Timeline screen (the single source of truth) with the ledger bar living inside it.
3. The finding-detail screen (full reasoning chain + citation + deciding office).
4. **The money moment:** the "I got a job" life-event screen → four consequences across three domains
   (uses `lib/rulepacks/consequence-map.json`).
5. Document upload + confidence-scored extraction (correctable).
6. Coverage map (all 51 jurisdictions, honest status) + rule-pack viewer.
7. Outbound reminders (Vercel Cron + email + `.ics`).

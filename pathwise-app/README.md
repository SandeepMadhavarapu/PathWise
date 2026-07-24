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
npm run build       # next build (compiles + prerenders the Home screen)
```

## Deploy (gets us the judge-openable URL — deliverable #4)
1. Push this folder to a GitHub repo.
2. Import the repo at vercel.com (New Project). Framework auto-detected as Next.js.
3. Deploy → you get a live `https://pathwise-*.vercel.app` URL. Keep it live from now on.

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

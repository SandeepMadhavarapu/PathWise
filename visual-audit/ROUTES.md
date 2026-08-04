# ROUTES.md — route inventory

Derived from `find app -name page.tsx`, every internal `href` in `app/` + `components/`, and the AppShell nav maps. **Not** from memory.

- No `sitemap.*`, `robots.*`, `not-found.tsx`, `error.tsx` or `global-error.tsx` exists in the app.
- No dynamic segments: every route is a literal path, all statically prerendered.
- Target: `https://path-wise-amber.vercel.app`  ·  captured `2026-08-04T04:03:13.081Z`

| Route | Purpose | Static/Server | Interactive | Visited | HTTP | Notes |
|---|---|---|---|---|---|---|
| `/` | Landing — thesis, live findings, refusal band | Static prerendered | No (links only) | Yes (7) | 200/304 | Static (SSG). 7 state(s) captured. |
| `/check` | The tool: run the engines on your own facts | Static prerendered | Yes — form, submit, clear | Yes (7) | 200/304 | Static (SSG). 7 state(s) captured. |
| `/coverage` | Coverage map + rule-pack viewer | Static prerendered | Yes — tiles, pack tabs | Yes (7) | 200/304 | Static (SSG). 7 state(s) captured. |
| `/moment` | Life-event consequence demo | Static prerendered | Yes — reveal button | Yes (6) | 200/304 | Static (SSG). 6 state(s) captured. |
| `/student` | Worked example dashboard (Priya) | Static prerendered | No (links only) | Yes (6) | 200/304 | Static (SSG). 6 state(s) captured. |
| `/student/changed` | Evidence arrives; refusal collapses | Static prerendered | Yes — file read, attest, commit | Yes (9) | 200/304 | Static (SSG). 9 state(s) captured. |
| `/student/finding/aid` | Finding detail — state aid | Static prerendered | Yes — disclosures | Yes (6) | 200/304 | Static (SSG). 6 state(s) captured. |
| `/student/finding/domicile` | Finding detail — full domicile analysis (Marcus) | Static prerendered | Yes — disclosures | Yes (6) | 200/304 | Static (SSG). 6 state(s) captured. |
| `/student/finding/residency` | Finding detail — residency gate | Static prerendered | Yes — disclosures | Yes (6) | 200/304 | Static (SSG). 6 state(s) captured. |
| `/student/journey` | Event timeline | Static prerendered | Yes — expandable rows | Yes (6) | 200/304 | Static (SSG). 6 state(s) captured. |
| `/student/next` | Computed action plan | Static prerendered | Yes — step disclosures | Yes (5) | 200/304 | Static (SSG). 5 state(s) captured. |
| `/this-route-does-not-exist` | 404 probe (no page.tsx; Next default) | Static prerendered | No | Yes (5) | 404 | Next.js default 404 inside the app shell. Rail still navigable. See finding C-1. |

**304** = Vercel cache revalidation on repeat load, not an error. First load of each route returned 200.

## Routes reachable only through interaction
None. Every route is reachable by a rail link or an in-page link; `/student/finding/aid` is reached from the aid DomainCard `detailHref` rather than a literal `href=` attribute, which is why it does not appear in the raw href grep.

## Routes that could not be visited
None.

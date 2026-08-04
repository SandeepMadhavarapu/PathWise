# METADATA-EVIDENCE.md

Read from the **served production HTML**, not source.

Target `https://path-wise-amber.vercel.app`

## Titles — 11/11 unique

| Route | `<title>` |
|---|---|
| `/` | PathWise — your standing across every system |
| `/check` | Check your status · PathWise |
| `/coverage` | State coverage & rule packs · PathWise |
| `/moment` | One event, many effects · PathWise |
| `/student` | Priya's standing · PathWise |
| `/student/changed` | When a document arrives · PathWise |
| `/student/finding/aid` | Why state aid is blocked · PathWise |
| `/student/finding/domicile` | The domicile analysis in full · PathWise |
| `/student/finding/residency` | Why residency is blocked · PathWise |
| `/student/journey` | Her timeline · PathWise |
| `/student/next` | Her next steps · PathWise |

## Open Graph / X card — identical on all 11 routes

| Tag | Value |
|---|---|
| `og:title` | PathWise — your standing across every system |
| `og:description` | Three offices decide an international student's fate — immigration, tuition residency, and financial aid. None can see the whole student. PathWise doe |
| `og:image` | https://path-wise-amber.vercel.app/og.png |
| `og:url` | https://path-wise-amber.vercel.app |
| `twitter:card` | summary_large_image |
| `twitter:title` | PathWise — your standing across every system |
| `twitter:description` | Three offices decide an international student's fate — immigration, tuition residency, and financial aid. None can see the whole student. PathWise doe |
| `twitter:image` | https://path-wise-amber.vercel.app/og.png |
| `meta description` | Three offices decide an international student's fate — immigration, tuition residency, and financial aid. None can see the whole student. PathWise doe |

## og:image resolves

```
GET https://path-wise-amber.vercel.app/og.png
-> HTTP 200 · image/png · 1200x630
```

## canonical

**Absent — deliberately.** A single root-level `alternates.canonical` would be inherited by all 11 routes and would declare every page to be `/`, which is worse than emitting none. Per-route canonicals were out of the A1/A2 scope. No unfurler requires it. Classified **D**.

## Verification note
Every value above was read via `document.querySelector(...).getAttribute(...)` on the live page after `networkidle0` — no value is reported from a source file.

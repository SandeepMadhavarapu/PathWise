/**
 * The production origin, stated once.
 *
 * `layout.tsx` needs it for `metadataBase`, `robots.ts` for the sitemap link and `sitemap.ts` for
 * every entry. It was a literal inside layout.tsx; three copies of one origin is three chances to
 * point a canonical tag at the wrong host.
 */
export const SITE_URL = "https://path-wise-amber.vercel.app";

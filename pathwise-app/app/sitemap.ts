import type { MetadataRoute } from "next";

import { SITE_URL } from "./site";

/**
 * Every content route, listed once.
 *
 * Hand-listed rather than derived from the filesystem: `app/` also holds layouts, an icon and the
 * 404, and a crawler asked to index those learns nothing. The order is the order a reader would
 * meet them, which is also the order the demo script walks.
 */
const ROUTES = [
  "/",
  "/check",
  "/student",
  "/student/journey",
  "/student/next",
  "/student/changed",
  "/student/finding/residency",
  "/student/finding/aid",
  "/student/finding/domicile",
  "/moment",
  "/coverage",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    // The landing and the tool are the two entry points; everything else is the worked example.
    priority: path === "/" ? 1 : path === "/check" ? 0.9 : 0.6,
  }));
}

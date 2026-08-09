import type { MetadataRoute } from "next";

import { SITE_URL } from "./site";

/**
 * PathWise is a public explanation of public rules, so it is indexable in full. There is nothing
 * private to withhold: every screen is either a worked example built from fictional students
 * (Priya, Marcus) or the reader's own facts, and the reader's facts never leave their device — so
 * no crawler could reach them even if one tried.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

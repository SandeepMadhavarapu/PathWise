import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SITE_URL } from "./site";
import "./globals.css";

// The one description, written once and reused by the page meta, the Open Graph card and the
// X card, so the three cannot drift into saying different things about the same product.
const DESCRIPTION =
  "Three offices decide an international student's fate — immigration, tuition residency, and financial aid. None can see the whole student. PathWise does.";

const SITE = "PathWise — your standing across every system";

export const metadata: Metadata = {
  // Absolute base for every relative URL below. Without it Next emits `og:image` as a relative
  // path and most unfurlers drop the image entirely — which was the whole defect: the product
  // rendered as a bare link everywhere it was shared.
  metadataBase: new URL(SITE_URL),
  // Every route resolves its own canonical against metadataBase, so a page reached through a
  // preview deployment or a query string still names one address as the real one.
  alternates: { canonical: "/" },
  title: {
    default: SITE,
    // Every route below supplies only its own name; this is what wraps it. Each route's title is
    // the SAME string its topbar already shows, so the tab and the page agree.
    template: "%s · PathWise",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "PathWise",
    url: "/",
    title: SITE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "PathWise — three offices decide your fate. None of them can see the whole you. 1 state modelled in full, 2 partially modelled, 43 source captured, 5 unable to verify.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

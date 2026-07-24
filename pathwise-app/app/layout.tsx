import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PathWise — your standing across every system",
  description:
    "Three offices decide an international student's fate — immigration, tuition residency, and financial aid. None can see the whole student. PathWise does.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
